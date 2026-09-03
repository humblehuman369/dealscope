"""Public state market data for the programmatic /markets pages.

No auth: these feed statically generated marketing pages and expose only
aggregates (counts and the assumption table), never directory records.
Cached 24h; the frontend revalidates on the same cadence.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.core.deps import DbSession
from app.schemas.markets import StateMarketDetail, StateMarketListResponse
from app.services.cache_service import get_cache_service
from app.services.markets_service import (
    get_state_market,
    list_state_markets,
    resolve_state_code,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/markets", tags=["Markets"])

MARKETS_CACHE_TTL = 86400
_LIST_KEY = "markets:states:v1"


def _detail_key(code: str) -> str:
    return f"markets:state:v1:{code}"


@router.get("/states", response_model=StateMarketListResponse, summary="All state market summaries")
async def get_states(db: DbSession) -> StateMarketListResponse:
    cache = get_cache_service()
    cached = await cache.get(_LIST_KEY)
    if cached:
        return StateMarketListResponse.model_validate(cached)
    result = await list_state_markets(db)
    await cache.set(_LIST_KEY, result.model_dump(), ttl_seconds=MARKETS_CACHE_TTL)
    return result


@router.get(
    "/states/{state}",
    response_model=StateMarketDetail,
    responses={404: {"description": "Unknown state"}},
    summary="Market data for one state (code or slug)",
)
async def get_state(state: str, db: DbSession) -> StateMarketDetail:
    code = resolve_state_code(state)
    if code is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown state")
    cache = get_cache_service()
    key = _detail_key(code)
    cached = await cache.get(key)
    if cached:
        return StateMarketDetail.model_validate(cached)
    result = await get_state_market(db, code)
    await cache.set(key, result.model_dump(), ttl_seconds=MARKETS_CACHE_TTL)
    return result
