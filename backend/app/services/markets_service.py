"""State-level market pages (/markets/[state]) built only from data we already own.

Sources, all first-party:
  - ``MARKET_ADJUSTMENTS`` (property tax, rent-to-price, appreciation, vacancy)
  - active lender counts by state served (``lenders`` table)
  - strict-filter cash buyer counts and top cities by state (``cash_buyers`` table)

Nothing here calls a third-party API. A state page is indexable only when the
state has its *own* ``MARKET_ADJUSTMENTS`` row **and** at least one directory
section holds state-scoped records (lenders licensed in the state, or buyers
based there). Otherwise the frontend renders what exists under
``noindex, follow``. Two things deliberately never count as evidence about a
state: the national baseline row (every state would qualify on it alone) and
nationwide lenders (they are the same ~90 records for all 51 states, so they
would pad every state's lender count and collapse the rule to
``buyer_count > 0``). Both are still reported — as ``is_state_specific=False``
and ``nationwide_lender_count`` — so the page can say honestly what it shows.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cash_buyer import CashBuyer
from app.models.lender import Lender
from app.schemas.markets import (
    CityCount,
    StateAssumptions,
    StateMarketDetail,
    StateMarketListResponse,
    StateMarketSummary,
)
from app.services.assumptions_service import MARKET_ADJUSTMENTS
from app.services.buyers_service import STRICT_FILTER
from app.services.lenders_service import ACTIVE_FILTER

TOP_CITY_LIMIT = 8

US_STATES: dict[str, str] = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District of Columbia",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",
}

_SLUG_TO_CODE = {name.lower().replace(" ", "-"): code for code, name in US_STATES.items()}


def state_slug(code: str) -> str:
    return US_STATES[code].lower().replace(" ", "-")


def resolve_state_code(value: str) -> str | None:
    """Accept a USPS code (``fl``) or a slug (``florida``); return the code or None."""
    key = value.strip()
    upper = key.upper()
    if upper in US_STATES:
        return upper
    return _SLUG_TO_CODE.get(key.lower())


def state_assumptions(code: str) -> StateAssumptions:
    baseline = MARKET_ADJUSTMENTS["DEFAULT"]
    row = MARKET_ADJUSTMENTS.get(code)
    is_specific = row is not None and row != baseline
    source = row or baseline
    return StateAssumptions(
        property_tax_rate=source["property_tax_rate"],
        rent_to_price_ratio=source["rent_to_price_ratio"],
        appreciation_rate=source["appreciation_rate"],
        vacancy_rate=source["vacancy_rate"],
        is_state_specific=is_specific,
    )


def is_indexable(*, has_state_specific_assumptions: bool, state_lender_count: int, buyer_count: int) -> bool:
    """The noindex rule for /markets/[state], shared by the list and detail payloads.

    Both halves are required: a state-specific assumptions row (so the
    assumptions table is about *this* state, not the baseline) and at least one
    directory section with in-state records. ``nationwide_lender_count`` is
    intentionally not a parameter.
    """
    return has_state_specific_assumptions and (state_lender_count > 0 or buyer_count > 0)


def assemble_state_market(
    code: str,
    *,
    state_lender_count: int,
    nationwide_lender_count: int,
    buyer_count: int,
    buyer_cities: list[CityCount],
    generated_at: datetime | None = None,
) -> StateMarketDetail:
    """Pure assembly step so the indexability rule can be tested without a DB."""
    assumptions = state_assumptions(code)
    sections: list[str] = []
    if assumptions.is_state_specific:
        sections.append("assumptions")
    if state_lender_count > 0:
        sections.append("lenders")
    if buyer_count > 0:
        sections.append("buyers")
    stamp = (generated_at or datetime.now(UTC)).isoformat()
    return StateMarketDetail(
        code=code,
        name=US_STATES[code],
        slug=state_slug(code),
        lender_count=state_lender_count + nationwide_lender_count,
        state_lender_count=state_lender_count,
        nationwide_lender_count=nationwide_lender_count,
        buyer_count=buyer_count,
        has_state_specific_assumptions=assumptions.is_state_specific,
        indexable=is_indexable(
            has_state_specific_assumptions=assumptions.is_state_specific,
            state_lender_count=state_lender_count,
            buyer_count=buyer_count,
        ),
        assumptions=assumptions,
        buyer_cities=buyer_cities,
        data_sections=sections,
        generated_at=stamp,
    )


async def lender_counts_by_state(db: AsyncSession) -> dict[str, int]:
    """Active non-nationwide lenders licensed in each state.

    Nationwide lenders also enumerate all 51 states in ``states_served``, so they
    are excluded here and counted once by :func:`nationwide_lender_count`.
    """
    served_stmt = (
        select(func.unnest(Lender.states_served).label("st"), func.count())
        .where(ACTIVE_FILTER, Lender.nationwide.is_not(True))
        .group_by("st")
    )
    counts = {str(state).upper(): int(count) for state, count in (await db.execute(served_stmt)).all() if state}
    return {code: counts.get(code, 0) for code in US_STATES}


async def nationwide_lender_count(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(Lender).where(ACTIVE_FILTER, Lender.nationwide.is_(True))
    return int((await db.execute(stmt)).scalar_one())


async def buyer_counts_by_state(db: AsyncSession) -> dict[str, int]:
    stmt = (
        select(CashBuyer.state, func.count())
        .where(STRICT_FILTER, CashBuyer.state.is_not(None))
        .group_by(CashBuyer.state)
    )
    counts = {str(state).upper(): int(count) for state, count in (await db.execute(stmt)).all() if state}
    return {code: counts.get(code, 0) for code in US_STATES}


async def buyer_cities_for_state(db: AsyncSession, code: str) -> list[CityCount]:
    stmt = (
        select(CashBuyer.city, func.count())
        .where(STRICT_FILTER, CashBuyer.state == code, CashBuyer.city.is_not(None))
        .group_by(CashBuyer.city)
        .order_by(func.count().desc(), CashBuyer.city.asc())
        .limit(TOP_CITY_LIMIT)
    )
    return [CityCount(city=str(city), count=int(count)) for city, count in (await db.execute(stmt)).all() if city]


async def lender_count_for_state(db: AsyncSession, code: str) -> int:
    """Active non-nationwide lenders licensed in ``code``; see :func:`lender_counts_by_state`."""
    stmt = (
        select(func.count())
        .select_from(Lender)
        .where(ACTIVE_FILTER, Lender.nationwide.is_not(True), Lender.states_served.any(code))
    )
    return int((await db.execute(stmt)).scalar_one())


async def buyer_count_for_state(db: AsyncSession, code: str) -> int:
    stmt = select(func.count()).select_from(CashBuyer).where(STRICT_FILTER, CashBuyer.state == code)
    return int((await db.execute(stmt)).scalar_one())


async def list_state_markets(db: AsyncSession) -> StateMarketListResponse:
    lenders = await lender_counts_by_state(db)
    nationwide = await nationwide_lender_count(db)
    buyers = await buyer_counts_by_state(db)
    now = datetime.now(UTC)
    states = [
        assemble_state_market(
            code,
            state_lender_count=lenders[code],
            nationwide_lender_count=nationwide,
            buyer_count=buyers[code],
            buyer_cities=[],
            generated_at=now,
        )
        for code in US_STATES
    ]
    summaries = [StateMarketSummary.model_validate(s.model_dump()) for s in states]
    return StateMarketListResponse(states=summaries, generated_at=now.isoformat())


async def get_state_market(db: AsyncSession, code: str) -> StateMarketDetail:
    state_lenders = await lender_count_for_state(db, code)
    nationwide = await nationwide_lender_count(db)
    buyer_count = await buyer_count_for_state(db, code)
    cities = await buyer_cities_for_state(db, code)
    return assemble_state_market(
        code,
        state_lender_count=state_lenders,
        nationwide_lender_count=nationwide,
        buyer_count=buyer_count,
        buyer_cities=cities,
    )
