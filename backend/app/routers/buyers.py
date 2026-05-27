"""Cash buyer directory — paginated Postgres API (/api/buyers)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.core.deps import (
    CurrentUser,
    DbSession,
    PRO_BUYERS_MESSAGE,
    PaidProBuyersUser,
    _count_strict_buyers,
    _has_paid_pro_access,
)
from app.schemas.buyers import BuyerListResponse, BuyerOut, BuyerStatsResponse
from app.services.billing_service import billing_service
from app.services.buyers_service import (
    BuyerListFilters,
    buyer_stats,
    get_buyer_by_id,
    list_buyers_page,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/buyers", tags=["Buyers"])


@router.get(
    "/stats",
    response_model=BuyerStatsResponse,
    responses={
        401: {
            "description": "Paid Pro required — total count only",
            "content": {"application/json": {"example": {"detail": {"total": 2812}}}},
        }
    },
    summary="Cash buyer directory stats",
)
async def get_buyer_stats(current_user: CurrentUser, db: DbSession):
    """Directory totals. Non–paid-Pro: 401 with { total } only (no byState)."""
    try:
        subscription = await billing_service.get_subscription(db, current_user.id)
        if not _has_paid_pro_access(subscription):
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
        401: {
            "description": "Paid Pro required",
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
    _: PaidProBuyersUser,
    db: DbSession,
    city: str | None = Query(None),
    state: str | None = Query(None, min_length=2, max_length=2),
    county: str | None = Query(None),
    zip: str | None = Query(None),
    strategy: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(60, ge=1, le=100),
):
    """Filterable, paginated buyer list (passes_strict_filter = true only)."""
    try:
        filters = BuyerListFilters(
            city=city,
            state=state,
            county=county,
            zip=zip,
            strategy=strategy,
        )
        buyers, total, total_pages = await list_buyers_page(
            db,
            filters=filters,
            page=page,
            limit=limit,
        )
        return BuyerListResponse(
            buyers=buyers,
            total=total,
            page=page,
            limit=limit,
            totalPages=total_pages,
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
    "/{buyer_id}",
    response_model=BuyerOut,
    responses={
        401: {
            "description": "Paid Pro required",
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
    summary="Get cash buyer by id",
)
async def get_cash_buyer(buyer_id: int, _: PaidProBuyersUser, db: DbSession):
    """Single buyer; 404 if missing or not in strict filter."""
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
