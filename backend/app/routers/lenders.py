"""Hard money lender directory — authenticated, paginated API (/api/lenders).

Mirrors the /api/buyers surface. Access resolves through the single
entitlement helper (Task 3.2): ``paid`` gets records; ``free``/``trial`` get
401 PRO_REQUIRED with the total-count teaser only. (Task 3.3 will relax
viewing for trial users through the same helper.)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.core.deps import CurrentUser, DbSession
from app.schemas.lenders import LenderListResponse, LenderOut, LenderStatsResponse
from app.services.entitlements import Entitlement, resolve_entitlement
from app.services.lenders_service import (
    MAX_PAGE_SIZE,
    get_lender_by_id,
    lender_stats,
    lender_total,
    list_lenders_page,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lenders", tags=["Lenders"])

PRO_LENDERS_MESSAGE = "Hard Money Lender Directory requires DealGapIQ Pro"


async def _require_paid_lenders(db, user) -> None:
    """401 PRO_REQUIRED (with total teaser) unless the user resolves to paid."""
    entitlement = await resolve_entitlement(db, user.id)
    if entitlement == Entitlement.PAID:
        return
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": "PRO_REQUIRED",
            "message": PRO_LENDERS_MESSAGE,
            "total": lender_total(),
        },
    )


@router.get(
    "/stats",
    response_model=LenderStatsResponse,
    responses={
        401: {
            "description": "Paid Pro required — total count only",
            "content": {"application/json": {"example": {"total": 484}}},
        }
    },
    summary="Lender directory stats",
)
async def get_lender_stats(current_user: CurrentUser, db: DbSession):
    """Directory totals. Non-paid: 401 with { total } only (no breakdowns)."""
    entitlement = await resolve_entitlement(db, current_user.id)
    if entitlement != Entitlement.PAID:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"total": lender_total()},
        )
    return lender_stats()


@router.get(
    "",
    response_model=LenderListResponse,
    responses={
        401: {
            "description": "Paid Pro required",
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
    """Filterable, paginated lender list (max 25 per page)."""
    await _require_paid_lenders(db, current_user)
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
    "/{lender_id}",
    response_model=LenderOut,
    responses={
        401: {
            "description": "Paid Pro required",
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
    summary="Get lender by id",
)
async def get_lender(lender_id: int, current_user: CurrentUser, db: DbSession):
    """Single lender record; 404 if missing."""
    await _require_paid_lenders(db, current_user)
    lender = get_lender_by_id(lender_id)
    if lender is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lender not found")
    return lender
