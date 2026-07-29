"""Cash buyer directory — paginated Postgres API (/api/buyers).

Access model (resolved via the single entitlement helper):
  - free:  403 PRO_REQUIRED (stats teaser still returns { total } only)
  - trial: 403 DIRECTORY_PAID_ONLY — the directory is not part of the trial
  - paid:  full search / filter / view, plus CSV / print exports capped at
           200 records per export and 1,000 per monthly billing cycle

The access, pagination and export mechanics live in ``directory_pipeline`` and
are shared with /api/lenders. What stays here is what is actually specific to
buyers: the query parameters, and the export columns.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.buyers import BuyerListResponse, BuyerOut, BuyerStatsResponse
from app.services.buyers_service import (
    BuyerListFilters,
    buyer_stats,
    count_strict_buyers,
    get_buyer_by_id,
    list_buyers_page,
)
from app.services.directory_pipeline import (
    MAX_PAGE_SIZE,
    DirectorySpec,
    gate_view,
    guard,
    run_export,
    stats_teaser,
)

router = APIRouter(prefix="/api/buyers", tags=["Buyers"])

PRO_BUYERS_MESSAGE = "Cash Buyer Directory requires DealGapIQ Pro"


def _export_row(buyer: BuyerOut) -> list[str]:
    return [
        buyer.company, buyer.owner, buyer.phone, buyer.email, buyer.website,
        buyer.street, buyer.city, buyer.state, buyer.zip,
        "; ".join(buyer.coverage), "; ".join(buyer.strategies),
        str(buyer.deals), str(buyer.years), buyer.response,
    ]


SPEC = DirectorySpec(
    slug="buyers",
    export_title="DealGapIQ — Cash Buyer Directory Export",
    pro_message=PRO_BUYERS_MESSAGE,
    count_total=count_strict_buyers,
    export_headers=(
        "Company", "Owner", "Phone", "Email", "Website", "Street", "City", "State", "Zip",
        "Coverage", "Strategies", "Deals (12mo)", "Years", "Response",
    ),
    export_row=_export_row,
)


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
    teaser = await stats_teaser(db, current_user, SPEC)
    if teaser is not None:
        return teaser
    return await guard("buyer stats", lambda: buyer_stats(db))


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
    """Filterable, paginated buyer list (max 25/page, paid subscribers only)."""
    await gate_view(db, current_user, SPEC)
    filters = BuyerListFilters(city=city, state=state, county=county, zip=zip, strategy=strategy)
    buyers, total, total_pages = await guard(
        "buyers",
        lambda: list_buyers_page(db, filters=filters, page=page, limit=limit),
    )
    return BuyerListResponse(
        buyers=buyers,
        total=total,
        page=page,
        limit=limit,
        totalPages=total_pages,
    )


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
    filters = BuyerListFilters(city=city, state=state, county=county, zip=zip, strategy=strategy)

    async def fetch(cap: int):
        buyers, _total, _pages = await list_buyers_page(db, filters=filters, page=1, limit=cap)
        return buyers

    return await run_export(db, current_user, SPEC, fmt=fmt, fetch=fetch)


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
    """Single full record, paid subscribers only."""
    await gate_view(db, current_user, SPEC)
    buyer = await guard("buyer", lambda: get_buyer_by_id(db, buyer_id))
    if buyer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer not found")
    return buyer
