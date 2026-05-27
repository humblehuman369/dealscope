"""Postgres queries for /api/buyers."""

from __future__ import annotations

import math
from dataclasses import dataclass

from sqlalchemy import Select, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cash_buyer import CashBuyer
from app.schemas.buyers import BuyerOut, BuyerStatsResponse, StateCount
from app.services.buyer_directory_service import row_to_buyer_record

STRICT_FILTER = CashBuyer.passes_strict_filter.is_(True)


@dataclass(frozen=True)
class BuyerListFilters:
    city: str | None = None
    state: str | None = None
    county: str | None = None
    zip: str | None = None
    strategy: str | None = None


def _coverage_ilike(pattern: str):
    """True when any coverage[] element matches pattern (case-insensitive)."""
    return text(
        "EXISTS ("
        "  SELECT 1 FROM unnest(cash_buyers.coverage) AS cov(entry) "
        "  WHERE lower(cov.entry) ILIKE :cov_pattern"
        ")"
    ).bindparams(cov_pattern=pattern)


def _apply_filters(stmt: Select, filters: BuyerListFilters) -> Select:
    stmt = stmt.where(STRICT_FILTER)

    if filters.city:
        city_pat = f"%{filters.city.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(CashBuyer.city).like(city_pat),
                _coverage_ilike(city_pat),
            )
        )

    if filters.state:
        stmt = stmt.where(CashBuyer.state == filters.state.strip().upper()[:2])

    if filters.county:
        stmt = stmt.where(_coverage_ilike(f"%{filters.county.strip().lower()}%"))

    if filters.zip:
        stmt = stmt.where(CashBuyer.zip.ilike(f"{filters.zip.strip()}%"))

    if filters.strategy:
        stmt = stmt.where(CashBuyer.strategies.contains([filters.strategy.strip()]))

    return stmt


async def count_strict_buyers(db: AsyncSession, filters: BuyerListFilters | None = None) -> int:
    stmt = select(func.count()).select_from(CashBuyer)
    if filters:
        stmt = _apply_filters(stmt, filters)
    else:
        stmt = stmt.where(STRICT_FILTER)
    result = await db.execute(stmt)
    return int(result.scalar_one())


async def list_buyers_page(
    db: AsyncSession,
    *,
    filters: BuyerListFilters,
    page: int,
    limit: int,
) -> tuple[list[BuyerOut], int, int]:
    filtered = _apply_filters(select(CashBuyer), filters)

    count_stmt = select(func.count()).select_from(filtered.subquery())
    total = int((await db.execute(count_stmt)).scalar_one())

    offset = (page - 1) * limit
    rows_stmt = (
        filtered.order_by(CashBuyer.deals.desc().nulls_last(), CashBuyer.company_name.asc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(rows_stmt)).scalars().all()
    buyers = [BuyerOut.model_validate(row_to_buyer_record(row)) for row in rows]
    total_pages = math.ceil(total / limit) if total else 0
    return buyers, total, total_pages


async def get_buyer_by_id(db: AsyncSession, buyer_id: int) -> BuyerOut | None:
    stmt = select(CashBuyer).where(CashBuyer.id == buyer_id, STRICT_FILTER)
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        return None
    return BuyerOut.model_validate(row_to_buyer_record(row))


async def buyer_stats(db: AsyncSession) -> BuyerStatsResponse:
    total = await count_strict_buyers(db)
    by_state_stmt = (
        select(CashBuyer.state, func.count())
        .where(STRICT_FILTER, CashBuyer.state.is_not(None))
        .group_by(CashBuyer.state)
        .order_by(func.count().desc())
        .limit(10)
    )
    rows = (await db.execute(by_state_stmt)).all()
    by_state = [StateCount(state=state, count=count) for state, count in rows if state]
    return BuyerStatsResponse(total=total, byState=by_state)
