"""Build the canonical city seed file from the US Census place code list.

    cd backend && python -m scripts.build_cities_data [--places <file.txt>]

Downloads the national place file unless --places points at a local copy. Writes
backend/app/data/geo/cities.json, the seed source for the ``geo_cities`` table
(see backend/scripts/seed_geo_cities.py).

Why this file and not the Gazetteer: the Gazetteer's place file gives names and
centroids but no county, and a centroid alone cannot tell you that Atlanta spans
both DeKalb and Fulton. The place code list carries an explicit ``COUNTIES``
column, tilde-separated for the 1,302 places that straddle a county line, which
is exactly the relation the directory needs.

Counties arrive as names, not FIPS, so they are resolved against counties.json.
That file must be built first. Resolution covers the 50 states, DC and PR; the
only names that do not resolve are Pacific territory equivalents (Guam, Saipan,
American Samoa), which have no counties and are dropped.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
COUNTIES_PATH = REPO_ROOT / "backend" / "app" / "data" / "geo" / "counties.json"
OUT_PATH = REPO_ROOT / "backend" / "app" / "data" / "geo" / "cities.json"

PLACES_URL = "https://www2.census.gov/geo/docs/reference/codes2020/national_place2020.txt"
SOURCE_LABEL = "US Census 2020 place codes — national_place2020"

# Census appends the governmental type to every place name ("Tampa city",
# "Abanda CDP"). Ordered longest-first so "city and borough" is stripped before
# "borough", and "city" never truncates "Carson City" — the suffix is lowercase
# in the source while the name's own "City" is capitalised.
_SUFFIX = re.compile(
    r"\s+("
    r"city and borough|consolidated government|metropolitan government|"
    r"unified government|urban county government|metro government|"
    r"charter township|municipality|comunidad|zona urbana|plantation|"
    r"reservation|township|village|borough|purchase|location|district|"
    r"town|city|CDP|gore|grant"
    r")$"
)

# "El Paso de Robles (Paso Robles) city" — the parenthetical is a real alternate
# name. "(balance)" is not; it marks the part of a consolidated city outside its
# component units.
_ALTERNATE = re.compile(r"\s*\(([^)]+)\)")

# City-county consolidations are named "City-County ... government", so the
# segment before the first separator is the city people actually search for:
# "Nashville-Davidson metropolitan government (balance)" -> "Nashville".
_CONSOLIDATION = re.compile(r"government|\(balance\)", re.IGNORECASE)
_SEPARATOR = re.compile(r"\s*[-/,]\s*")


def short_name(name: str) -> str:
    """Strip the governmental type: "Tampa city" -> "Tampa"."""
    return _SUFFIX.sub("", name).strip()


def derive_names(raw: str) -> tuple[str, list[str]]:
    """Return the display short name and any additional names people search by.

    Handles the two naming conventions that would otherwise hide major markets:
    an alternate name in parentheses, and city-county consolidations whose
    Census name leads with the city but is filed under a compound.
    """
    aliases: list[str] = []

    alternate = _ALTERNATE.search(raw)
    base = raw
    if alternate:
        candidate = alternate.group(1).strip()
        base = _ALTERNATE.sub("", raw).strip()
        if candidate.lower() != "balance":
            aliases.append(short_name(candidate))

    primary = short_name(base)

    if _CONSOLIDATION.search(raw):
        head = _SEPARATOR.split(primary)[0].strip()
        head = re.sub(r"\s+County$", "", head).strip()
        if head:
            aliases.append(head)

    deduped = [
        alias
        for i, alias in enumerate(aliases)
        if alias and alias != primary and alias not in aliases[:i]
    ]
    return primary, deduped


def fetch_places(path: Path | None) -> str:
    if path is not None:
        return path.read_text(encoding="utf-8")
    # S310 is suppressed because PLACES_URL is a fixed https census.gov constant,
    # not caller input, and this is a build script run by hand.
    with urllib.request.urlopen(PLACES_URL, timeout=180) as response:  # noqa: S310
        return response.read().decode("utf-8")


def load_county_index() -> dict[tuple[str, str], str]:
    if not COUNTIES_PATH.exists():
        raise SystemExit(
            f"{COUNTIES_PATH} is missing — run scripts/build_counties_data.py first"
        )
    payload = json.loads(COUNTIES_PATH.read_text(encoding="utf-8"))
    return {
        (county["state"], county["name"].lower()): county["fips"]
        for county in payload["counties"]
    }


def parse(text: str, county_index: dict[tuple[str, str], str]) -> tuple[list[dict], Counter]:
    cities: list[dict[str, object]] = []
    unresolved: Counter = Counter()

    lines = text.splitlines()
    header = lines[0].split("|")
    expected = ["STATE", "STATEFP", "PLACEFP", "PLACENS", "PLACENAME", "TYPE", "CLASSFP", "FUNCSTAT", "COUNTIES"]
    if header != expected:
        raise SystemExit(f"Unexpected place file columns: {header}")

    for line in lines[1:]:
        parts = line.split("|")
        if len(parts) != len(expected):
            continue
        state, statefp, placefp, _, name, _, _, _, counties = parts

        fips: list[str] = []
        for county_name in counties.split("~~~"):
            county_name = county_name.strip()
            if not county_name:
                continue
            resolved = county_index.get((state, county_name.lower()))
            if resolved is None:
                unresolved[f"{state}:{county_name}"] += 1
            elif resolved not in fips:
                fips.append(resolved)

        # A place with no resolvable county cannot answer "who covers this
        # location?", which is the table's only purpose.
        if not fips:
            continue

        primary, aliases = derive_names(name)
        cities.append(
            {
                "geoid": statefp + placefp,
                "name": name,
                "short_name": primary,
                "aliases": aliases,
                "state": state,
                "county_fips": sorted(fips),
            }
        )

    return sorted(cities, key=lambda city: city["geoid"]), unresolved


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--places", type=Path, help="Local copy of the national place file")
    args = parser.parse_args()

    cities, unresolved = parse(fetch_places(args.places), load_county_index())

    geoids = {city["geoid"] for city in cities}
    if len(geoids) != len(cities):
        raise SystemExit("Duplicate place GEOID in source data")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(UTC).isoformat(),
                "source": SOURCE_LABEL,
                "cities": cities,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    states = len({city["state"] for city in cities})
    multi = sum(1 for city in cities if len(city["county_fips"]) > 1)
    print(
        f"{len(cities):,} places across {states} states "
        f"({multi:,} spanning more than one county) "
        f"-> {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.0f} KB)"
    )
    if unresolved:
        print(
            f"dropped {sum(unresolved.values()):,} place-county references with no "
            f"county row ({len(unresolved)} distinct): "
            f"{', '.join(name for name, _ in unresolved.most_common(5))}"
        )


if __name__ == "__main__":
    main()
