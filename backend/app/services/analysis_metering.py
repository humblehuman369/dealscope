"""
Shared rule for what counts as a metered property analysis.

One analysis = one distinct property. Re-analyzing an address the user already
analyzed in the last 30 days is free, so refreshes, Verdict <-> Strategy
navigation, and re-running a bulk batch over an area they already worked never
burn quota.

That rule lives here rather than in the search router because there are now two
metered entry points — ``POST /properties/search`` and the bulk analyze queue —
and a user's bill must not depend on which one they used.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search_history import SearchHistory

# Matches the monthly quota window the counter resets on, so "already analyzed
# this month" and "already analyzed recently" cannot drift apart.
REPEAT_WINDOW_DAYS = 30


async def has_recent_successful_analysis(
    db: AsyncSession,
    user_id: uuid.UUID,
    full_address: str,
) -> bool:
    """True when the user already successfully analyzed this address recently."""
    window_start = datetime.now(UTC) - timedelta(days=REPEAT_WINDOW_DAYS)
    result = await db.execute(
        select(SearchHistory.id)
        .where(
            SearchHistory.user_id == user_id,
            SearchHistory.search_query == full_address,
            SearchHistory.was_successful.is_(True),
            SearchHistory.searched_at >= window_start,
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None
