"""Hard money lender directory — authenticated, paginated API (/api/lenders).

Access model (resolved via the single entitlement helper):
  - free:  403 PRO_REQUIRED (stats teaser still returns { total } only)
  - trial: 403 DIRECTORY_PAID_ONLY — the directory is not part of the trial
  - paid:  full search / filter / view, plus CSV / print exports capped at
           200 records per export and 1,000 per monthly billing cycle

The access, pagination and export mechanics live in ``directory_pipeline`` and
are shared with /api/buyers. What stays here is what is actually specific to
lenders: the query parameters, and the export columns.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.lenders import LenderListResponse, LenderOut, LenderStatsResponse
from app.services.directory_pipeline import (
    MAX_PAGE_SIZE,
    DirectorySpec,
    gate_view,
    guard,
    run_export,
    stats_teaser,
)
from app.services.lenders_service import (
    LenderListFilters,
    filter_lenders,
    get_lender_by_id,
    lender_stats,
    lender_total,
    list_lenders_page,
)

router = APIRouter(prefix="/api/lenders", tags=["Lenders"])

PRO_LENDERS_MESSAGE = "Hard Money Lender Directory requires DealGapIQ Pro"


def _export_row(lender: LenderOut) -> list[str]:
    return [
        lender.company_name,
        lender.domain,
        lender.phone or "",
        lender.email or "",
        lender.website,
        lender.state or "",
        "; ".join(lender.states_served),
        "; ".join(lender.loan_products),
        lender.credit_check_policy or "",
        str(lender.min_credit_score) if lender.min_credit_score is not None else "",
    ]


SPEC = DirectorySpec(
    slug="lenders",
    export_title="DealGapIQ — Hard Money Lender Directory Export",
    pro_message=PRO_LENDERS_MESSAGE,
    count_total=lender_total,
    export_headers=(
        "Company", "Domain", "Phone", "Email", "Website", "HQ State", "States Served",
        "Loan Products", "Credit Policy", "Min Credit Score",
    ),
    export_row=_export_row,
)


@router.get(
    "/stats",
    response_model=LenderStatsResponse,
    responses={
        401: {
            "description": "Pro required — total count only",
            "content": {"application/json": {"example": {"total": 484}}},
        }
    },
    summary="Lender directory stats",
)
async def get_lender_stats(current_user: CurrentUser, db: DbSession):
    """Directory totals. Free tier: 401 with { total } only (marketing teaser)."""
    teaser = await stats_teaser(db, current_user, SPEC)
    if teaser is not None:
        return teaser
    return await guard("lender stats", lambda: lender_stats(db))


@router.get(
    "",
    response_model=LenderListResponse,
    responses={
        403: {
            "description": "Pro required (free tier)",
            "content": {
                "application/json": {
                    "example": {
                        "detail": {
                            "error": "PRO_REQUIRED",
                            "message": PRO_LENDERS_MESSAGE,
                            "total": 484,
                        }
                    }
                }
            },
        }
    },
    summary="Search hard money lenders",
)
async def list_lenders(
    current_user: CurrentUser,
    db: DbSession,
    state: str | None = Query(None, min_length=2, max_length=2),
    product: str | None = Query(None, max_length=50),
    min_loan: int | None = Query(None, ge=0),
    credit: str | None = Query(None, max_length=30),
    q: str | None = Query(None, max_length=100, description="Company name / domain search"),
    include_web_only: bool = Query(True),
    page: int = Query(1, ge=1),
    limit: int = Query(MAX_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    """Filterable, paginated lender list (max 25/page, paid subscribers only)."""
    await gate_view(db, current_user, SPEC)
    filters = _filters(state, product, min_loan, credit, q, include_web_only)
    lenders, total, total_pages = await guard(
        "lenders",
        lambda: list_lenders_page(db, filters=filters, page=page, limit=limit),
    )
    return LenderListResponse(
        lenders=lenders,
        total=total,
        page=page,
        limit=limit,
        totalPages=total_pages,
    )


@router.get(
    "/export",
    summary="Export lenders (paid only; 200/export, 1,000/billing cycle)",
    responses={
        403: {"description": "Paid Pro required — exports unlock with the first payment"},
        429: {"description": "Monthly export record ceiling reached"},
    },
)
async def export_lenders(
    current_user: CurrentUser,
    db: DbSession,
    fmt: str = Query("csv", pattern="^(csv|print)$", description="csv download or print-to-PDF view"),
    state: str | None = Query(None, min_length=2, max_length=2),
    product: str | None = Query(None, max_length=50),
    min_loan: int | None = Query(None, ge=0),
    credit: str | None = Query(None, max_length=30),
    q: str | None = Query(None, max_length=100),
    include_web_only: bool = Query(True),
):
    """Export the current filtered set — server-gated BEFORE any file is generated."""
    filters = _filters(state, product, min_loan, credit, q, include_web_only)
    return await run_export(
        db,
        current_user,
        SPEC,
        fmt=fmt,
        fetch=lambda cap: filter_lenders(db, filters=filters, limit=cap),
    )


@router.get(
    "/{lender_id}",
    response_model=LenderOut,
    responses={403: {"description": "Paid subscription required"}},
    summary="Get lender by id",
)
async def get_lender(lender_id: int, current_user: CurrentUser, db: DbSession):
    """Single full record, paid subscribers only."""
    await gate_view(db, current_user, SPEC)
    lender = await guard("lender", lambda: get_lender_by_id(db, lender_id))
    if lender is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lender not found")
    return lender


def _filters(
    state: str | None,
    product: str | None,
    min_loan: int | None,
    credit: str | None,
    q: str | None,
    include_web_only: bool,
) -> LenderListFilters:
    """Shared by list and export so the two can never drift apart."""
    return LenderListFilters(
        state=state.strip().upper() if state else None,
        product=product,
        min_loan=min_loan,
        credit=credit,
        q=q,
        include_web_only=include_web_only,
    )
