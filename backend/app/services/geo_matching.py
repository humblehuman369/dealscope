"""Resolve free-text coverage strings to canonical geography.

Directory coverage is scraped prose — "Palm Beach", "DeSoto Co.", "San Antonio",
"All of CA" — and has to become rows in ``directory_service_area``. This module
is the single place that decides what a string means, so the backfill and the gap
report can never disagree about it.

The rule throughout is **never guess across geographies**. A string matching two
unrelated places is reported ambiguous rather than resolved to the larger one, and
a string matching nothing is reported unmatched. The one deliberate exception is
documented on ``_disambiguate``: a bare name shared by a county and the
independent city inside it resolves to both, because either reading puts the
entity in that metro and the union cannot exclude the area they meant.
"""

from __future__ import annotations

import re
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.geo_city import GeoCity
from app.models.geo_county import GeoCounty

Kind = Literal["nationwide", "state", "county", "ambiguous", "unmatched"]

# Ordered longest-first so " census area" is stripped before " area" and " co."
# before " co".
_SUFFIXES = (
    " city and borough",
    " census area",
    " municipality",
    " planning region",
    " counties",
    " county",
    " parish",
    " borough",
    " region",
    " metro",
    " area",
    " co.",
    " cty",
    " co",
)

# Suffixes that say which of a same-named county/independent-city pair is meant.
_COUNTY_SUFFIXES = (
    " county",
    " counties",
    " parish",
    " borough",
    " co.",
    " cty",
    " co",
    " planning region",
)

# "All of CA" / "All of US" / "58 CA Counties"
_STATE_SCOPE = re.compile(
    r"^(?:all of|entire|state of|statewide in)\s+(?P<code>[A-Za-z]{2})$"
    r"|^(?P<count_code>\d+\s+[A-Za-z]{2})\s+counties$",
    re.IGNORECASE,
)
_BARE_STATEWIDE = re.compile(r"^(statewide|entire state|all)$", re.IGNORECASE)

# New York City boroughs are counties under different names, and no Census place
# record connects the two. Coverage text universally uses the borough name.
_BOROUGHS = {
    ("NY", "brooklyn"): "36047",  # Kings County
    ("NY", "staten island"): "36085",  # Richmond County
    ("NY", "manhattan"): "36061",  # New York County
}


def _fold(text: str) -> str:
    """Canonicalise characters so trivial punctuation differences still match.

    "Prince George's" and "Prince George’s" fold together, as do "Winston-Salem"
    and "Winston Salem", and "St. Louis" and "St Louis". Applied to both the
    reference names and the query, so it can only ever merge spellings of the
    same name.
    """
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[\u2018\u2019\u02bc`]", "'", text)
    text = re.sub(r"[-\u2013\u2014/]", " ", text)  # hyphen, en dash, em dash, slash
    text = text.replace("'", "").replace(".", "")
    return re.sub(r"\s+", " ", text).strip()


def normalize_place_name(raw: str) -> str:
    """Strip a coverage string down to its bare place name.

    "DeSoto Co." -> "desoto", "Ascension Parish" -> "ascension". The result is
    folded, so callers compare it against other folded names.
    """
    text = _fold(raw)
    changed = True
    while changed:
        changed = False
        for suffix in _SUFFIXES:
            if text.endswith(suffix) and len(text) > len(suffix) + 1:
                text = text[: -len(suffix)].strip()
                changed = True
    return re.sub(r"^(?:st|saint)\s+", "st ", text).strip(" ,")


def _says_county(raw: str) -> bool:
    """Whether the string explicitly calls itself a county-equivalent."""
    text = _fold(raw)
    return any(text.endswith(suffix) for suffix in _COUNTY_SUFFIXES)


@dataclass(frozen=True, slots=True)
class Resolution:
    kind: Kind
    state: str | None = None
    county_fips: tuple[str, ...] = ()
    detail: str = ""


class CoverageResolver:
    """Indexes county and city reference data for repeated lookups."""

    def __init__(
        self,
        counties: list[tuple[str, str, str, str]],
        cities: list[tuple[str, list[str], str, list[str]]],
    ) -> None:
        # fips -> is an independent city (Census spells those with a lowercase
        # "city" suffix: "Baltimore city" against "Baltimore County").
        self._independent: dict[str, bool] = {}
        self._counties: dict[tuple[str, str], list[str]] = defaultdict(list)
        for fips, name, short_name, state in counties:
            self._independent[fips] = name.endswith(" city")
            self._counties[(state, _fold(short_name))].append(fips)

        # Keyed by the county set, not the place, so two same-named places that
        # sit in the same county read as one unambiguous answer.
        self._cities: dict[tuple[str, str], set[tuple[str, ...]]] = defaultdict(set)
        for short_name, aliases, state, county_fips in cities:
            counties_key = tuple(sorted(county_fips))
            for place_name in (short_name, *aliases):
                self._cities[(state, _fold(place_name))].add(counties_key)

    @classmethod
    async def from_db(cls, session: AsyncSession) -> CoverageResolver:
        """Load reference data, retired counties included.

        Connecticut swapped counties for planning regions in 2022 but directory
        text still says "Hartford" and "New Haven". Excluding retired geographies
        drops CT to zero matches.
        """
        county_rows = (
            await session.execute(
                select(GeoCounty.fips, GeoCounty.name, GeoCounty.short_name, GeoCounty.state)
            )
        ).all()
        city_rows = (
            await session.execute(
                select(GeoCity.short_name, GeoCity.aliases, GeoCity.state, GeoCity.county_fips)
            )
        ).all()
        return cls(
            [(row[0], row[1], row[2], row[3]) for row in county_rows],
            [(row[0], list(row[1]), row[2], list(row[3])) for row in city_rows],
        )

    def _disambiguate(self, raw: str, state: str, hits: list[str]) -> Resolution:
        """Settle a name shared by several county-equivalents in one state.

        Almost every such collision is a county and the independent city inside
        it — Baltimore, St. Louis, Fairfax, Richmond. "Baltimore County" says
        which one outright and wins. A bare "Baltimore" returns the union of both:
        whichever the writer meant, the entity works in that metro, and covering
        both cannot exclude the area they intended. Collisions that are not a
        county/city pair stay ambiguous.
        """
        if _says_county(raw):
            filtered = [fips for fips in hits if not self._independent[fips]]
            if len(filtered) == 1:
                return Resolution(
                    "county",
                    state=state,
                    county_fips=(filtered[0],),
                    detail="named the county explicitly",
                )

        cities = [fips for fips in hits if self._independent[fips]]
        if cities and len(cities) < len(hits):
            return Resolution(
                "county",
                state=state,
                county_fips=tuple(sorted(hits)),
                detail="county and the independent city of the same name",
            )

        return Resolution(
            "ambiguous",
            state=state,
            detail=f"matches {len(hits)} counties: {','.join(sorted(hits))}",
        )

    def _state_scope(self, raw: str) -> Resolution | None:
        match = _STATE_SCOPE.match(raw.strip())
        if match is None:
            return None
        code = (match.group("code") or match.group("count_code") or "").split()[-1].upper()
        if code == "US":
            return Resolution("nationwide", detail="covers the whole country")
        return Resolution("state", state=code, detail="state-wide marker")

    def resolve(self, raw: str, entity_state: str | None) -> Resolution:
        """Interpret one coverage string for an entity based in ``entity_state``."""
        scoped = self._state_scope(raw)
        if scoped is not None:
            return scoped

        if _BARE_STATEWIDE.match(raw.strip()):
            if not entity_state:
                return Resolution("unmatched", detail="statewide, but the entity has no state")
            return Resolution("state", state=entity_state, detail="state-wide marker")

        if not entity_state:
            return Resolution(
                "unmatched", detail="entity has no state, so the lookup cannot be scoped"
            )

        name = normalize_place_name(raw)
        if not name:
            return Resolution("unmatched", detail="empty after normalisation")

        borough = _BOROUGHS.get((entity_state, name))
        if borough is not None:
            return Resolution(
                "county", state=entity_state, county_fips=(borough,), detail="NYC borough"
            )

        # County first: in coverage text "Orange" far more often means the county
        # than a same-named town.
        county_hits = self._counties.get((entity_state, name), [])
        if len(county_hits) == 1:
            return Resolution(
                "county", state=entity_state, county_fips=(county_hits[0],), detail="county name"
            )
        if len(county_hits) > 1:
            return self._disambiguate(raw, entity_state, county_hits)

        # Places are looked up by the suffix-stripped name and the raw one,
        # because place names legitimately end in words the stripper removes
        # ("Kansas City", "Carson City").
        city_hits = self._cities.get((entity_state, name), set()) | self._cities.get(
            (entity_state, _fold(raw)), set()
        )
        if len(city_hits) == 1:
            fips = next(iter(city_hits))
            return Resolution(
                "county",
                state=entity_state,
                county_fips=fips,
                detail=f"city in {len(fips)} county/counties",
            )
        if len(city_hits) > 1:
            return Resolution(
                "ambiguous",
                state=entity_state,
                detail=f"{len(city_hits)} same-named places in different counties",
            )

        # Last resort for "Baltimore City" / "St. Louis City": an independent city
        # whose county row drops the suffix. Only reached once the literal name
        # has failed as both a county and a place, so "Jefferson City" and
        # "Kansas City" have already matched their Census places and never arrive
        # here to be mistaken for Jefferson or Kansas County.
        folded = _fold(raw)
        if folded.endswith(" city"):
            bare = folded[: -len(" city")].strip()
            independent = [
                fips
                for fips in self._counties.get((entity_state, bare), [])
                if self._independent[fips]
            ]
            if len(independent) == 1:
                return Resolution(
                    "county",
                    state=entity_state,
                    county_fips=(independent[0],),
                    detail="independent city",
                )

        return Resolution(
            "unmatched", state=entity_state, detail="no county or place of this name in the state"
        )


# Search-time name lookup. Cached because it is consulted on every filtered
# directory request and the underlying tables are static reference data that only
# change on deploy, when the process restarts anyway. Held in Python rather than
# resolved in SQL so name folding is byte-identical to the backfill's — a lookup
# that folds differently from the write path silently returns nothing.
_CACHE_TTL_SECONDS = 900.0
_name_cache: tuple[float, dict[tuple[str | None, str], tuple[str, ...]]] | None = None


def invalidate_place_name_cache() -> None:
    """Drop the cached name index (tests, and after a reference-data reseed)."""
    global _name_cache
    _name_cache = None


async def _place_name_index(
    session: AsyncSession,
) -> dict[tuple[str | None, str], tuple[str, ...]]:
    """Map (state|None, folded name) -> county FIPS, for counties and places.

    The ``None`` state entries let a name be looked up without one, which is what
    the directory UI sends today; they collapse every same-named county in the
    country into one set, so searching "Jefferson" reaches buyers in all of them.
    """
    global _name_cache
    if _name_cache is not None and time.monotonic() - _name_cache[0] <= _CACHE_TTL_SECONDS:
        return _name_cache[1]

    index: dict[tuple[str | None, str], set[str]] = defaultdict(set)

    county_rows = (
        await session.execute(select(GeoCounty.fips, GeoCounty.short_name, GeoCounty.state))
    ).all()
    for fips, short_name, state in county_rows:
        folded = _fold(short_name)
        index[(state, folded)].add(fips)
        index[(None, folded)].add(fips)

    city_rows = (
        await session.execute(
            select(GeoCity.short_name, GeoCity.aliases, GeoCity.state, GeoCity.county_fips)
        )
    ).all()
    for short_name, aliases, state, county_fips in city_rows:
        for place_name in (short_name, *(aliases or [])):
            folded = _fold(place_name)
            index[(state, folded)].update(county_fips)
            index[(None, folded)].update(county_fips)

    for (state, folded), fips in list(_BOROUGHS.items()):
        index[(state, folded)].add(fips)
        index[(None, folded)].add(fips)

    built = {key: tuple(sorted(values)) for key, values in index.items()}
    _name_cache = (time.monotonic(), built)
    return built


async def county_fips_for_search(
    session: AsyncSession, name: str, state: str | None = None
) -> tuple[str, ...]:
    """County FIPS a user's free-text place name should search.

    Accepts a county name or a city name — "Hillsborough" and "Tampa" both return
    ``12057`` — because a buyer's coverage may have been written either way and
    the backfill stored both as counties. Returns empty when the name is unknown,
    which callers must treat as "no service-area match", not "match everything".
    """
    folded = _fold(name)
    if not folded:
        return ()
    index = await _place_name_index(session)
    scope = state.strip().upper()[:2] if state else None
    return (
        index.get((scope, folded))
        or index.get((scope, normalize_place_name(name)))
        or ()
    )
