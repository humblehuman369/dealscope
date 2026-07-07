"""Hard-money lender directory — server-side data access.

Task 3.1: lender records moved out of the client bundle. The dataset is
static (regenerated offline), so it is served from ``app/data/lenders.json``
mirroring the buyer directory's JSON pattern. Every list response is
paginated — no endpoint returns the full dataset.
"""

from __future__ import annotations

import json
import logging
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.schemas.lenders import LenderOut, LenderStatsResponse

logger = logging.getLogger(__name__)

LENDERS_DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "lenders.json"

# Hard page-size ceiling (plan: max 25 records per page).
MAX_PAGE_SIZE = 25


@lru_cache(maxsize=1)
def _load_lenders_file() -> tuple[tuple[LenderOut, ...], LenderStatsResponse]:
    """Load and validate the lender dataset once per process."""
    with LENDERS_DATA_PATH.open(encoding="utf-8") as f:
        data: dict[str, Any] = json.load(f)

    raw_lenders = data.get("lenders")
    if not isinstance(raw_lenders, list):
        raise ValueError("Lender dataset must contain a 'lenders' list")

    lenders = tuple(LenderOut.model_validate(item) for item in raw_lenders)

    raw_stats = data.get("stats") or {}
    stats = LenderStatsResponse(
        total=len(lenders),
        byState=raw_stats.get("by_state") or {},
        byProduct=raw_stats.get("by_product") or {},
        byCreditPolicy=raw_stats.get("by_credit_policy") or {},
        noCreditCheckCount=raw_stats.get("no_credit_check_count") or 0,
        nationwideCount=raw_stats.get("nationwide_count") or 0,
    )
    return lenders, stats


def lender_total() -> int:
    lenders, _ = _load_lenders_file()
    return len(lenders)


def lender_stats() -> LenderStatsResponse:
    _, stats = _load_lenders_file()
    return stats


def _no_credit_check(lender: LenderOut) -> bool:
    if lender.no_credit_check is not None:
        return lender.no_credit_check
    return lender.credit_check_policy in ("none", "soft_pull")


def _matches(
    lender: LenderOut,
    *,
    state: str | None,
    product: str | None,
    min_loan: int | None,
    credit: str | None,
    q: str | None,
    include_web_only: bool,
) -> bool:
    if state and state not in lender.states_served:
        return False
    if product and product not in lender.loan_products:
        return False
    if min_loan is not None and lender.max_loan_amount is not None and lender.max_loan_amount < min_loan:
        return False
    if credit == "no_credit_check" and not _no_credit_check(lender):
        return False
    if credit == "soft_pull" and lender.credit_check_policy != "soft_pull":
        return False
    if credit == "no_min_score" and (lender.min_credit_score is not None or not _no_credit_check(lender)):
        return False
    if q:
        term = q.strip().lower()
        if term and term not in lender.company_name.lower() and term not in lender.domain.lower():
            return False
    if not include_web_only and lender.contact_type == "web_only":
        return False
    return True


def filter_lenders(
    *,
    state: str | None = None,
    product: str | None = None,
    min_loan: int | None = None,
    credit: str | None = None,
    q: str | None = None,
    include_web_only: bool = True,
) -> list[LenderOut]:
    """Full filtered list — server-side use only (export slicing, pagination).

    Never returned to a client whole: list responses paginate at
    ``MAX_PAGE_SIZE`` and exports slice to the metered cap.
    """
    lenders, _ = _load_lenders_file()
    return [
        lender
        for lender in lenders
        if _matches(
            lender,
            state=state,
            product=product,
            min_loan=min_loan,
            credit=credit,
            q=q,
            include_web_only=include_web_only,
        )
    ]


def list_lenders_page(
    *,
    state: str | None = None,
    product: str | None = None,
    min_loan: int | None = None,
    credit: str | None = None,
    q: str | None = None,
    include_web_only: bool = True,
    page: int = 1,
    limit: int = MAX_PAGE_SIZE,
) -> tuple[list[LenderOut], int, int]:
    """Filtered, paginated lender list. Returns (lenders, total, total_pages)."""
    limit = max(1, min(limit, MAX_PAGE_SIZE))
    filtered = filter_lenders(
        state=state,
        product=product,
        min_loan=min_loan,
        credit=credit,
        q=q,
        include_web_only=include_web_only,
    )

    total = len(filtered)
    total_pages = math.ceil(total / limit) if total else 0
    offset = (page - 1) * limit
    return filtered[offset : offset + limit], total, total_pages


def get_lender_by_id(lender_id: int) -> LenderOut | None:
    lenders, _ = _load_lenders_file()
    for lender in lenders:
        if lender.id == lender_id:
            return lender
    return None
