"""Tests for buyer city/county search once it consults directory_service_area.

The contract has two halves. Search must find *more* buyers than the old
coverage-text match did — that is the point of resolving coverage to counties —
and it must never find fewer, because roughly one coverage string in ten still
does not resolve and the buyers behind those are only reachable by text.
"""

import pytest
from app.models.cash_buyer import CashBuyer
from app.services.buyers_service import (
    BuyerListFilters,
    _apply_filters,
    count_strict_buyers,
)
from app.services.geo_matching import county_fips_for_search, invalidate_place_name_cache
from scripts.backfill_service_area import backfill_buyer_coverage
from sqlalchemy import func, select

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def searchable(db_session, seeded_geo, seeded_buyers):
    """Real buyers, real gazetteer, coverage resolved — the production shape."""
    invalidate_place_name_cache()
    await backfill_buyer_coverage(db_session, dry_run=False)
    await db_session.flush()
    yield seeded_buyers
    invalidate_place_name_cache()


async def _text_only(db_session, filters: BuyerListFilters) -> int:
    """Count using the pre-service-area behaviour: coverage text matching alone."""
    stmt = _apply_filters(select(func.count()).select_from(CashBuyer), filters)
    return int((await db_session.execute(stmt)).scalar_one())


PLACES = [
    ("Hillsborough", None),
    ("Palm Beach", None),
    ("Jefferson", None),
    ("Maricopa", None),
    ("Cook", None),
    ("Harris", None),
    ("Baltimore", None),
]


@pytest.mark.parametrize(("name", "state"), PLACES)
async def test_county_search_never_returns_fewer_than_text_matching(
    db_session, searchable, name, state
):
    filters = BuyerListFilters(county=name, state=state)
    assert await count_strict_buyers(db_session, filters) >= await _text_only(
        db_session, filters
    )


async def test_county_search_finds_buyers_who_named_a_city_instead(db_session, searchable):
    """The reason the table exists. A buyer whose coverage says "Tampa" works in
    Hillsborough County and must surface in a Hillsborough search, which plain
    text matching could never do."""
    filters = BuyerListFilters(county="Hillsborough")
    assert await count_strict_buyers(db_session, filters) > await _text_only(
        db_session, filters
    )


async def test_searching_a_city_name_reaches_its_county(db_session, searchable):
    """The inverse: "Tampa" should reach buyers whose coverage says
    "Hillsborough"."""
    filters = BuyerListFilters(county="Tampa")
    assert await count_strict_buyers(db_session, filters) > await _text_only(
        db_session, filters
    )


async def test_city_search_is_scoped_by_state(db_session, searchable):
    """Springfield exists in most states; a city search that ignored the state
    would return the whole country."""
    florida = await count_strict_buyers(db_session, BuyerListFilters(city="Tampa", state="FL"))
    georgia = await count_strict_buyers(db_session, BuyerListFilters(city="Tampa", state="GA"))
    assert florida > 0
    assert georgia < florida


async def test_an_unknown_place_falls_back_to_text_matching(db_session, searchable):
    """A name with no geography behind it must not match everything — the empty
    FIPS list has to read as "no service-area match", not "no filter"."""
    total = await count_strict_buyers(db_session, BuyerListFilters())
    nonsense = await count_strict_buyers(db_session, BuyerListFilters(county="Zzzyzx Parish"))
    assert nonsense < total


async def test_filters_still_compose_with_strategy(db_session, searchable):
    broad = await count_strict_buyers(db_session, BuyerListFilters(county="Hillsborough"))
    narrowed = await count_strict_buyers(
        db_session, BuyerListFilters(county="Hillsborough", strategy="Wholesale")
    )
    assert 0 < narrowed <= broad


# ---------------------------------------------------------------------------
# Name -> FIPS lookup
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("name", "state", "expected"),
    [
        ("Hillsborough", "FL", "12057"),
        ("Tampa", "FL", "12057"),
        ("Palm Beach County", "FL", "12099"),
        ("Miami-Dade", "FL", "12086"),
        ("Brooklyn", "NY", "36047"),
    ],
)
async def test_county_fips_for_search_accepts_counties_and_cities(
    db_session, seeded_geo, name, state, expected
):
    invalidate_place_name_cache()
    assert expected in await county_fips_for_search(db_session, name, state)


async def test_an_unstated_name_spans_every_state_that_has_one(db_session, seeded_geo):
    """The directory UI sends a bare county name, so the lookup has to answer
    without a state — by returning all of them, not by picking one."""
    invalidate_place_name_cache()
    fips = await county_fips_for_search(db_session, "Jefferson")
    assert len({code[:2] for code in fips}) > 10


async def test_an_unknown_name_resolves_to_nothing(db_session, seeded_geo):
    invalidate_place_name_cache()
    assert await county_fips_for_search(db_session, "Zzzyzx Parish", "FL") == ()
