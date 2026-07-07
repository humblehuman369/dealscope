"""Directory access gates (Task 3.3) — every rule enforced server-side.

View free-tier: 403. Trial: full search/filter/view with record-detail opens
capped at 25/day (counted server-side). Paid: uncapped viewing. Exports:
paid only, checked here BEFORE any file is generated (Task 3.4 meters the
records). All decisions resolve through the single entitlement helper.
"""

from __future__ import annotations

import uuid
from typing import Protocol

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.services.directory_usage import (
    EXPORTS_PAID_ONLY_MESSAGE,
    VIEW_LIMIT_MESSAGE,
    record_detail_view,
)
from app.services.entitlements import Entitlement, resolve_entitlement_with_subscription


class _HasId(Protocol):
    id: uuid.UUID


async def require_view_access(
    db: AsyncSession,
    user: _HasId,
    *,
    pro_message: str,
    teaser_total: int,
) -> Entitlement:
    """Trial and paid may view; free gets 403 with the upgrade teaser."""
    entitlement, _ = await resolve_entitlement_with_subscription(db, user.id)
    if entitlement == Entitlement.FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "PRO_REQUIRED",
                "message": pro_message,
                "total": teaser_total,
            },
        )
    return entitlement


async def enforce_detail_view_cap(
    db: AsyncSession,
    user: _HasId,
    entitlement: Entitlement,
) -> None:
    """Count a trial user's record-detail open; 429 past 25/day. Paid is uncapped."""
    if entitlement != Entitlement.TRIAL:
        return
    allowed, _used = await record_detail_view(db, user.id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "VIEW_LIMIT_REACHED",
                "message": VIEW_LIMIT_MESSAGE,
            },
        )


async def require_paid_export(
    db: AsyncSession,
    user: _HasId,
    *,
    pro_message: str,
    teaser_total: int,
) -> Subscription | None:
    """Exports are paid-only — enforced before any file bytes are generated.

    Returns the subscription so the caller can anchor the monthly meter on
    the billing date.
    """
    entitlement, subscription = await resolve_entitlement_with_subscription(db, user.id)
    if entitlement == Entitlement.PAID:
        return subscription
    if entitlement == Entitlement.TRIAL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "EXPORTS_PAID_ONLY",
                "message": EXPORTS_PAID_ONLY_MESSAGE,
            },
        )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "error": "PRO_REQUIRED",
            "message": pro_message,
            "total": teaser_total,
        },
    )
