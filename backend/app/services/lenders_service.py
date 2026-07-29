"""Hard-money lender directory — Postgres queries for /api/lenders.

The dataset lives in the ``lenders`` table, seeded from ``app/data/lenders.json``
by ``scripts/seed_lenders.py``. It moved out of an in-memory JSON load so lender
coverage can join to ``geo_counties``, carry stable ids, and be filtered in SQL
the way the buyer directory already is.

Every list response is paginated — no endpoint returns the full dataset.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from sqlalchemy import Select, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lender import Lender
from app.schemas.lenders import LenderOut, LenderStatsResponse
from app.services.directory_pipeline import MAX_PAGE_SIZE

ACTIVE_FILTER = Lender.is_active.is_(True)

# Credit policies that mean "we won't pull your credit". Mirrors the previous
# in-memory rule: the explicit flag wins, and these policies imply it when the
# flag is absent.
_NO_PULL_POLICIES = ("none", "soft_pull")


@dataclass(frozen=True)
class LenderListFilters:
    state: str | None = None
    product: str | None = None
    min_loan: int | None = None
    credit: str | None = None
    q: str | None = None
    include_web_only: bool = True


def _like_escape(term: str) -> str:
    """Neutralise LIKE wildcards so search stays a literal substring match.

    The in-memory predicate this replaced used Python's ``in``, where ``%`` and
    ``_`` are ordinary characters. Passing them through to LIKE unescaped would
    quietly turn a user's search string into a pattern.
    """
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _no_credit_check_clause():
    """SQL form of ``no_credit_check if set, else policy in (none, soft_pull)``."""
    return case(
        (Lender.no_credit_check.is_not(None), Lender.no_credit_check),
        else_=Lender.credit_check_policy.in_(_NO_PULL_POLICIES),
    )


def _apply_filters(stmt: Select, filters: LenderListFilters) -> Select:
    stmt = stmt.where(ACTIVE_FILTER)

    if filters.state:
        stmt = stmt.where(Lender.states_served.contains([filters.state]))

    if filters.product:
        stmt = stmt.where(Lender.loan_products.contains([filters.product]))

    # Only excludes a lender whose stated ceiling is below the requested loan;
    # an unknown ceiling is not evidence that they won't lend that much.
    if filters.min_loan is not None:
        stmt = stmt.where(
            or_(
                Lender.max_loan_amount.is_(None),
                Lender.max_loan_amount >= filters.min_loan,
            )
        )

    if filters.credit == "no_credit_check":
        stmt = stmt.where(_no_credit_check_clause())
    elif filters.credit == "soft_pull":
        stmt = stmt.where(Lender.credit_check_policy == "soft_pull")
    elif filters.credit == "no_min_score":
        stmt = stmt.where(Lender.min_credit_score.is_(None), _no_credit_check_clause())

    if filters.q:
        term = filters.q.strip().lower()
        if term:
            pattern = f"%{_like_escape(term)}%"
            stmt = stmt.where(
                or_(
                    func.lower(Lender.company_name).like(pattern, escape="\\"),
                    func.lower(Lender.domain).like(pattern, escape="\\"),
                )
            )

    if not filters.include_web_only:
        stmt = stmt.where(Lender.contact_type != "web_only")

    return stmt


def _locality_order(state: str):
    """Order lenders by how local they are to ``state``.

    Coverage is state-level, so every match is equally "licensed here". What
    differentiates them is focus: a lender headquartered in the state, then one
    that serves a handful of states including this one, then a national shop.
    """
    return case(
        (Lender.state == state, 0),
        (Lender.nationwide.is_(False), 1),
        else_=2,
    )


def _order_by(stmt: Select, state: str | None) -> Select:
    """Stable ordering. Id breaks ties so pagination can't repeat or skip rows."""
    if state:
        return stmt.order_by(_locality_order(state), Lender.company_name, Lender.id)
    return stmt.order_by(Lender.id)


async def lender_total(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(Lender).where(ACTIVE_FILTER)
    return int((await db.execute(stmt)).scalar_one())


async def lender_stats(db: AsyncSession) -> LenderStatsResponse:
    """Directory aggregates, computed live rather than read from a frozen block."""
    total = await lender_total(db)

    by_state_stmt = (
        select(func.unnest(Lender.states_served).label("st"), func.count())
        .where(ACTIVE_FILTER)
        .group_by("st")
    )
    by_state = {
        state: int(count) for state, count in (await db.execute(by_state_stmt)).all() if state
    }

    by_product_stmt = (
        select(func.unnest(Lender.loan_products).label("product"), func.count())
        .where(ACTIVE_FILTER)
        .group_by("product")
    )
    by_product = {
        product: int(count)
        for product, count in (await db.execute(by_product_stmt)).all()
        if product
    }

    # A missing policy is reported as "unknown" rather than dropped, matching the
    # convention the dataset's own stats block used.
    policy_label = func.coalesce(Lender.credit_check_policy, "unknown").label("policy")
    by_policy_stmt = select(policy_label, func.count()).where(ACTIVE_FILTER).group_by(policy_label)
    by_credit_policy = {
        policy: int(count) for policy, count in (await db.execute(by_policy_stmt)).all()
    }

    no_credit_check_stmt = (
        select(func.count()).select_from(Lender).where(ACTIVE_FILTER, _no_credit_check_clause())
    )
    no_credit_check_count = int((await db.execute(no_credit_check_stmt)).scalar_one())

    nationwide_stmt = (
        select(func.count())
        .select_from(Lender)
        .where(ACTIVE_FILTER, Lender.nationwide.is_(True))
    )
    nationwide_count = int((await db.execute(nationwide_stmt)).scalar_one())

    return LenderStatsResponse(
        total=total,
        byState=by_state,
        byProduct=by_product,
        byCreditPolicy=by_credit_policy,
        noCreditCheckCount=no_credit_check_count,
        nationwideCount=nationwide_count,
    )


async def filter_lenders(
    db: AsyncSession,
    *,
    filters: LenderListFilters,
    limit: int | None = None,
) -> list[LenderOut]:
    """Filtered list in display order — server-side use only (exports).

    Never returned to a client whole: list responses paginate at
    ``MAX_PAGE_SIZE`` and exports pass the metered cap as ``limit``.
    """
    stmt = _order_by(_apply_filters(select(Lender), filters), filters.state)
    if limit is not None:
        stmt = stmt.limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [LenderOut.model_validate(row) for row in rows]


async def list_lenders_page(
    db: AsyncSession,
    *,
    filters: LenderListFilters,
    page: int = 1,
    limit: int = MAX_PAGE_SIZE,
) -> tuple[list[LenderOut], int, int]:
    """Filtered, paginated lender list. Returns (lenders, total, total_pages)."""
    limit = max(1, min(limit, MAX_PAGE_SIZE))
    filtered = _apply_filters(select(Lender), filters)

    count_stmt = select(func.count()).select_from(filtered.subquery())
    total = int((await db.execute(count_stmt)).scalar_one())

    rows_stmt = _order_by(filtered, filters.state).offset((page - 1) * limit).limit(limit)
    rows = (await db.execute(rows_stmt)).scalars().all()

    total_pages = math.ceil(total / limit) if total else 0
    return [LenderOut.model_validate(row) for row in rows], total, total_pages


async def get_lender_by_id(db: AsyncSession, lender_id: int) -> LenderOut | None:
    stmt = select(Lender).where(Lender.id == lender_id, ACTIVE_FILTER)
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        return None
    return LenderOut.model_validate(row)
