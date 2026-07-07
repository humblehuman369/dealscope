"""Cash buyer directory — paginated Postgres API (/api/buyers).

Access model (Tasks 3.3 / 3.4, resolved via the single entitlement helper):
  - free:  403 PRO_REQUIRED (stats teaser still returns { total } only)
  - trial: full search/filter/view; list responses redact direct-contact
           fields; record-detail opens are counted server-side, 25/day
  - paid:  full view access, no cap; CSV / print exports (paid-only) capped
           at 200 records per export and 1,000 per monthly billing cycle
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import HTMLResponse, JSONResponse

from app.core.deps import PRO_BUYERS_MESSAGE, CurrentUser, DbSession, _count_strict_buyers
from app.schemas.buyers import BuyerListResponse, BuyerOut, BuyerStatsResponse
from app.services.buyers_service import (
    BuyerListFilters,
    buyer_stats,
    get_buyer_by_id,
    list_buyers_page,
)
from app.services.directory_export import build_csv, build_print_html
from app.services.directory_gates import (
    enforce_detail_view_cap,
    require_paid_export,
    require_view_access,
)
from app.services.directory_usage import (
    EXPORT_LIMIT_MESSAGE,
    EXPORT_MAX_RECORDS,
    MONTHLY_EXPORT_RECORD_LIMIT,
    add_export_usage,
    get_export_usage,
)
from app.services.entitlements import Entitlement, resolve_entitlement

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/buyers", tags=["Buyers"])

# Plan spec: list pagination is capped at 25 records per page.
MAX_PAGE_SIZE = 25


def _redact_buyer(buyer: BuyerOut) -> BuyerOut:
    """Blank direct-contact fields for trial list responses."""
    return buyer.model_copy(update={"phone": "", "email": "", "website": "", "street": ""})


@router.get(
    "/stats",
    response_model=BuyerStatsResponse,
    responses={
        401: {
            "description": "Pro required — total count only",
            "content": {"application/json": {"example": {"total": 2812}}},
        }
    },
    summary="Cash buyer directory stats",
)
async def get_buyer_stats(current_user: CurrentUser, db: DbSession):
    """Directory totals. Free tier: 401 with { total } only (marketing teaser)."""
    try:
        entitlement = await resolve_entitlement(db, current_user.id)
        if entitlement == Entitlement.FREE:
            total = await _count_strict_buyers(db)
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"total": total})

        return await buyer_stats(db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("buyer stats error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load buyer stats",
        ) from e


@router.get(
    "",
    response_model=BuyerListResponse,
    responses={
        403: {
            "description": "Pro required (free tier)",
            "content": {
                "application/json": {
                    "example": {
                        "detail": {
                            "error": "PRO_REQUIRED",
                            "message": PRO_BUYERS_MESSAGE,
                            "total": 2812,
                        }
                    }
                }
            },
        }
    },
    summary="Search cash buyers",
)
async def list_cash_buyers(
    current_user: CurrentUser,
    db: DbSession,
    city: str | None = Query(None),
    state: str | None = Query(None, min_length=2, max_length=2),
    county: str | None = Query(None),
    zip: str | None = Query(None),
    strategy: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(MAX_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    """Filterable, paginated buyer list (max 25/page; trial sees redacted contacts)."""
    entitlement = await require_view_access(
        db,
        current_user,
        pro_message=PRO_BUYERS_MESSAGE,
        teaser_total=await _count_strict_buyers(db),
    )
    try:
        filters = BuyerListFilters(city=city, state=state, county=county, zip=zip, strategy=strategy)
        buyers, total, total_pages = await list_buyers_page(
            db,
            filters=filters,
            page=page,
            limit=limit,
        )
        redact = entitlement == Entitlement.TRIAL
        if redact:
            buyers = [_redact_buyer(b) for b in buyers]
        return BuyerListResponse(
            buyers=buyers,
            total=total,
            page=page,
            limit=limit,
            totalPages=total_pages,
            contactsRedacted=redact,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list cash buyers error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load buyers",
        ) from e


@router.get(
    "/export",
    summary="Export cash buyers (paid only; 200/export, 1,000/billing cycle)",
    responses={
        403: {"description": "Paid Pro required — exports unlock with the first payment"},
        429: {"description": "Monthly export record ceiling reached"},
    },
)
async def export_cash_buyers(
    current_user: CurrentUser,
    db: DbSession,
    fmt: str = Query("csv", pattern="^(csv|print)$", description="csv download or print-to-PDF view"),
    city: str | None = Query(None),
    state: str | None = Query(None, min_length=2, max_length=2),
    county: str | None = Query(None),
    zip: str | None = Query(None),
    strategy: str | None = Query(None),
):
    """Export the current filtered set — server-gated BEFORE any file is generated."""
    subscription = await require_paid_export(
        db,
        current_user,
        pro_message=PRO_BUYERS_MESSAGE,
        teaser_total=await _count_strict_buyers(db),
    )

    used = await get_export_usage(db, current_user.id, subscription)
    remaining = MONTHLY_EXPORT_RECORD_LIMIT - used
    if remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "EXPORT_LIMIT_REACHED", "message": EXPORT_LIMIT_MESSAGE},
        )

    filters = BuyerListFilters(city=city, state=state, county=county, zip=zip, strategy=strategy)
    export_cap = min(EXPORT_MAX_RECORDS, remaining)
    buyers, _total, _pages = await list_buyers_page(db, filters=filters, page=1, limit=export_cap)

    headers = [
        "Company", "Owner", "Phone", "Email", "Website", "Street", "City", "State", "Zip",
        "Coverage", "Strategies", "Deals (12mo)", "Years", "Response",
    ]
    rows = [
        [
            b.company, b.owner, b.phone, b.email, b.website, b.street, b.city, b.state, b.zip,
            "; ".join(b.coverage), "; ".join(b.strategies), str(b.deals), str(b.years), b.response,
        ]
        for b in buyers
    ]

    new_total = await add_export_usage(db, current_user.id, subscription, len(rows))
    logger.info(
        "buyer export: user=%s fmt=%s records=%s cycle_total=%s",
        current_user.id, fmt, len(rows), new_total,
    )

    meter_headers = {
        "X-Export-Records": str(len(rows)),
        "X-Export-Cycle-Used": str(new_total),
        "X-Export-Cycle-Limit": str(MONTHLY_EXPORT_RECORD_LIMIT),
    }
    if fmt == "print":
        html = build_print_html(
            "DealGapIQ — Cash Buyer Directory Export",
            f"{len(rows)} records · exported {datetime.now(UTC).strftime('%B %d, %Y')}",
            headers,
            rows,
        )
        return HTMLResponse(content=html, headers=meter_headers)

    csv_content = build_csv(headers, rows)
    filename = f"dealgapiq-buyers-{datetime.now(UTC).strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            **meter_headers,
        },
    )


@router.get(
    "/{buyer_id}",
    response_model=BuyerOut,
    responses={
        403: {"description": "Pro required (free tier)"},
        429: {"description": "Trial daily view limit reached"},
    },
    summary="Get cash buyer by id",
)
async def get_cash_buyer(buyer_id: int, current_user: CurrentUser, db: DbSession):
    """Single full record; trial opens are counted server-side (25/day)."""
    entitlement = await require_view_access(
        db,
        current_user,
        pro_message=PRO_BUYERS_MESSAGE,
        teaser_total=await _count_strict_buyers(db),
    )
    await enforce_detail_view_cap(db, current_user, entitlement)
    try:
        buyer = await get_buyer_by_id(db, buyer_id)
        if buyer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buyer not found",
            )
        return buyer
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get cash buyer %s error: %s", buyer_id, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load buyer",
        ) from e
