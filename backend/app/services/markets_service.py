"""State-level market pages (/markets/[state]) built only from data we already own.

Sources, all first-party:
  - ``MARKET_ADJUSTMENTS`` (property tax, rent-to-price, appreciation, vacancy)
  - active lender counts by state served (``lenders`` table)
  - strict-filter cash buyer counts and top cities by state (``cash_buyers`` table)

Nothing here calls a third-party API. A state page is indexable only when at
least ``MIN_INDEXABLE_SECTIONS`` of those sections carry real data; otherwise
the frontend renders what exists under ``noindex, follow``. The national
baseline row is deliberately *not* counted as a section, or every state would
qualify on it alone.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, or_, select
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

MIN_INDEXABLE_SECTIONS = 2
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


def assemble_state_market(
    code: str,
    *,
    lender_count: int,
    buyer_count: int,
    buyer_cities: list[CityCount],
    generated_at: datetime | None = None,
) -> StateMarketDetail:
    """Pure assembly step so the indexability rule can be tested without a DB."""
    assumptions = state_assumptions(code)
    sections: list[str] = []
    if assumptions.is_state_specific:
        sections.append("assumptions")
    if lender_count > 0:
        sections.append("lenders")
    if buyer_count > 0:
        sections.append("buyers")
    stamp = (generated_at or datetime.now(UTC)).isoformat()
    return StateMarketDetail(
        code=code,
        name=US_STATES[code],
        slug=state_slug(code),
        lender_count=lender_count,
        buyer_count=buyer_count,
        has_state_specific_assumptions=assumptions.is_state_specific,
        indexable=len(sections) >= MIN_INDEXABLE_SECTIONS,
        assumptions=assumptions,
        buyer_cities=buyer_cities,
        data_sections=sections,
        generated_at=stamp,
    )


async def lender_counts_by_state(db: AsyncSession) -> dict[str, int]:
    """Active lenders serving each state. Nationwide lenders count toward every state."""
    served_stmt = (
        select(func.unnest(Lender.states_served).label("st"), func.count())
        .where(ACTIVE_FILTER, Lender.nationwide.is_not(True))
        .group_by("st")
    )
    counts = {str(state).upper(): int(count) for state, count in (await db.execute(served_stmt)).all() if state}
    nationwide_stmt = select(func.count()).select_from(Lender).where(ACTIVE_FILTER, Lender.nationwide.is_(True))
    nationwide = int((await db.execute(nationwide_stmt)).scalar_one())
    return {code: counts.get(code, 0) + nationwide for code in US_STATES}


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
    stmt = (
        select(func.count())
        .select_from(Lender)
        .where(ACTIVE_FILTER, or_(Lender.nationwide.is_(True), Lender.states_served.any(code)))
    )
    return int((await db.execute(stmt)).scalar_one())


async def buyer_count_for_state(db: AsyncSession, code: str) -> int:
    stmt = select(func.count()).select_from(CashBuyer).where(STRICT_FILTER, CashBuyer.state == code)
    return int((await db.execute(stmt)).scalar_one())


async def list_state_markets(db: AsyncSession) -> StateMarketListResponse:
    lenders = await lender_counts_by_state(db)
    buyers = await buyer_counts_by_state(db)
    now = datetime.now(UTC)
    states = [
        assemble_state_market(
            code,
            lender_count=lenders[code],
            buyer_count=buyers[code],
            buyer_cities=[],
            generated_at=now,
        )
        for code in US_STATES
    ]
    summaries = [StateMarketSummary.model_validate(s.model_dump()) for s in states]
    return StateMarketListResponse(states=summaries, generated_at=now.isoformat())


async def get_state_market(db: AsyncSession, code: str) -> StateMarketDetail:
    lender_count = await lender_count_for_state(db, code)
    buyer_count = await buyer_count_for_state(db, code)
    cities = await buyer_cities_for_state(db, code)
    return assemble_state_market(
        code,
        lender_count=lender_count,
        buyer_count=buyer_count,
        buyer_cities=cities,
    )
