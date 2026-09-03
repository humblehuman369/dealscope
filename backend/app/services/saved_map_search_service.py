"""
Saved map searches — persistence and replay.

One function here matters more than the rest: ``to_request`` rebuilds the
``MapSearchRequest`` a saved row represents. Both the alert-eligibility check
at write time and the cron at read time go through it, so the search that gets
validated is provably the search that gets run. If they could diverge, a
search could be accepted as cheap and then dispatched as expensive.
"""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_map_search import (
    MAX_SAVED_SEARCHES_PER_USER,
    AlertFrequency,
    SavedMapSearch,
)
from app.schemas.property import MapSearchRequest
from app.schemas.saved_map_search import SavedMapSearchCreate
from app.services.map_search_service import alert_ineligible_reason

logger = logging.getLogger(__name__)

# Alert runs never paginate. An alert is "what showed up since last time" in
# the area the investor drew, and the interactive map caps at 500 rows too, so
# a saved search that overflows that is too broad to alert on usefully.
ALERT_RESULT_LIMIT = 500


def to_request(search: SavedMapSearch, *, limit: int = ALERT_RESULT_LIMIT) -> MapSearchRequest:
    """Rebuild the map search this saved row stands for."""
    return MapSearchRequest(
        north=search.north,
        south=search.south,
        east=search.east,
        west=search.west,
        polygon=search.polygon,
        limit=limit,
        **(search.filters or {}),
    )


def ineligible_reason(search: SavedMapSearch) -> str | None:
    """Why this saved search cannot be alerted on, or None if it can."""
    return alert_ineligible_reason(to_request(search))


async def list_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[SavedMapSearch]:
    result = await db.execute(
        select(SavedMapSearch)
        .where(SavedMapSearch.user_id == user_id)
        .order_by(SavedMapSearch.created_at.desc())
    )
    return list(result.scalars().all())


async def get_for_user(
    db: AsyncSession, user_id: uuid.UUID, search_id: uuid.UUID
) -> SavedMapSearch | None:
    result = await db.execute(
        select(SavedMapSearch).where(
            SavedMapSearch.id == search_id,
            SavedMapSearch.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def count_for_user(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(SavedMapSearch)
        .where(SavedMapSearch.user_id == user_id)
    )
    return int(result.scalar() or 0)


async def is_at_limit(db: AsyncSession, user_id: uuid.UUID) -> bool:
    return await count_for_user(db, user_id) >= MAX_SAVED_SEARCHES_PER_USER


def build(user_id: uuid.UUID, payload: SavedMapSearchCreate) -> SavedMapSearch:
    """Construct an unsaved row from a create payload."""
    return SavedMapSearch(
        user_id=user_id,
        name=payload.name,
        north=payload.north,
        south=payload.south,
        east=payload.east,
        west=payload.west,
        polygon=payload.polygon,
        filters=payload.filters,
        alert_frequency=payload.alert_frequency or AlertFrequency.OFF,
        seen_address_keys=[],
    )
