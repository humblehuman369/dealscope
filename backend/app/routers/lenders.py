"""Hard money lender directory — authenticated, paginated API (/api/lenders).

Access model (resolved via the single entitlement helper):
  - free:  403 PRO_REQUIRED (stats teaser still returns { total } only)
  - trial: 403 DIRECTORY_PAID_ONLY — the directory is not part of the trial
  - paid:  full search / filter / view, plus CSV / print exports capped at
           200 records per export and 1,000 per monthly billing cycle
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import HTMLResponse, JSONResponse

from app.core.deps import CurrentUser, DbSession
from app.schemas.lenders import LenderListResponse, LenderOut, LenderStatsResponse
from app.services.directory_export import build_csv, build_print_html
from app.services.directory_gates import require_paid_export, require_view_access
from app.services.directory_usage import (
    EXPORT_LIMIT_MESSAGE,
    EXPORT_MAX_RECORDS,
    MONTHLY_EXPORT_RECORD_LIMIT,
    add_export_usage,
    get_export_usage,
)
from app.services.entitlements import Entitlement, resolve_entitlement
from app.services.lenders_service import (
    MAX_PAGE_SIZE,
    filter_lenders,
    get_lender_by_id,
    lender_stats,
    lender_total,
    list_lenders_page,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lenders", tags=["Lenders"])

PRO_LENDERS_MESSAGE = "Hard Money Lender Directory requires DealGapIQ Pro"


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
    entitlement = await resolve_entitlement(db, current_user.id)
    if entitlement == Entitlement.FREE:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"total": lender_total()},
        )
    return lender_stats()


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
    await require_view_access(
        db,
        current_user,
        pro_message=PRO_LENDERS_MESSAGE,
        teaser_total=lender_total(),
    )
    try:
        lenders, total, total_pages = list_lenders_page(
            state=state.strip().upper() if state else None,
            product=product,
            min_loan=min_loan,
            credit=credit,
            q=q,
            include_web_only=include_web_only,
            page=page,
            limit=limit,
        )
        return LenderListResponse(
            lenders=lenders,
            total=total,
            page=page,
            limit=limit,
            totalPages=total_pages,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list lenders error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load lenders",
        ) from e


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
    subscription = await require_paid_export(
        db,
        current_user,
        pro_message=PRO_LENDERS_MESSAGE,
        teaser_total=lender_total(),
    )

    used = await get_export_usage(db, current_user.id, subscription)
    remaining = MONTHLY_EXPORT_RECORD_LIMIT - used
    if remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "EXPORT_LIMIT_REACHED", "message": EXPORT_LIMIT_MESSAGE},
        )

    export_cap = min(EXPORT_MAX_RECORDS, remaining)
    lenders = filter_lenders(
        state=state.strip().upper() if state else None,
        product=product,
        min_loan=min_loan,
        credit=credit,
        q=q,
        include_web_only=include_web_only,
    )[:export_cap]

    headers = [
        "Company", "Domain", "Phone", "Email", "Website", "HQ State", "States Served",
        "Loan Products", "Credit Policy", "Min Credit Score",
    ]
    rows = [
        [
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
        for lender in lenders
    ]

    new_total = await add_export_usage(db, current_user.id, subscription, len(rows))
    logger.info(
        "lender export: user=%s fmt=%s records=%s cycle_total=%s",
        current_user.id, fmt, len(rows), new_total,
    )

    meter_headers = {
        "X-Export-Records": str(len(rows)),
        "X-Export-Cycle-Used": str(new_total),
        "X-Export-Cycle-Limit": str(MONTHLY_EXPORT_RECORD_LIMIT),
    }
    if fmt == "print":
        html = build_print_html(
            "DealGapIQ — Hard Money Lender Directory Export",
            f"{len(rows)} records · exported {datetime.now(UTC).strftime('%B %d, %Y')}",
            headers,
            rows,
        )
        return HTMLResponse(content=html, headers=meter_headers)

    csv_content = build_csv(headers, rows)
    filename = f"dealgapiq-lenders-{datetime.now(UTC).strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            **meter_headers,
        },
    )


@router.get(
    "/{lender_id}",
    response_model=LenderOut,
    responses={403: {"description": "Paid subscription required"}},
    summary="Get lender by id",
)
async def get_lender(lender_id: int, current_user: CurrentUser, db: DbSession):
    """Single full record, paid subscribers only."""
    await require_view_access(
        db,
        current_user,
        pro_message=PRO_LENDERS_MESSAGE,
        teaser_total=lender_total(),
    )
    lender = get_lender_by_id(lender_id)
    if lender is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lender not found")
    return lender
