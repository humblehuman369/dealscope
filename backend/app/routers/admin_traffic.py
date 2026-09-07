"""Admin API for the traffic board (``/api/v1/admin/traffic``).

Read-only. Live PostHog numbers for the founder's one-page view: visitors,
sessions, bounce, funnel events by day, and first-touch UTM sources.
Requires ``admin:system``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.deps import require_permission
from app.models.user import User
from app.schemas.traffic import TrafficBoard
from app.services import traffic_board

router = APIRouter(prefix="/traffic", tags=["Admin"])

ADMIN = Depends(require_permission("admin:system"))


@router.get("", response_model=TrafficBoard)
async def get_traffic_board(
    days: int = Query(14, description="Window in days: 7, 14 or 28."),
    refresh: bool = Query(False, description="Bypass the 5-minute cache."),
    _admin: User = ADMIN,
) -> TrafficBoard:
    return await traffic_board.fetch_board(days, refresh=refresh)
