"""Directory access gates — every rule enforced server-side.

Both directories are paid-only: viewing requires a settled charge, so free and
trial are refused alike. Exports are likewise paid-only and checked here BEFORE
any file is generated (the export meter then counts records). All decisions
resolve through the single entitlement helper.
"""

from __future__ import annotations

import uuid
from typing import Protocol

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.services.directory_usage import (
    DIRECTORY_PAID_ONLY_MESSAGE,
    EXPORTS_PAID_ONLY_MESSAGE,
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
) -> None:
    """Paid only. Free and trial both get 403, with copy matching where they are.

    A trialing user already picked a plan and needs their first payment to
    settle, so telling them to "upgrade to Pro" would be wrong and confusing.
    """
    entitlement, _ = await resolve_entitlement_with_subscription(db, user.id)
    if entitlement == Entitlement.PAID:
        return
    if entitlement == Entitlement.TRIAL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "DIRECTORY_PAID_ONLY",
                "message": DIRECTORY_PAID_ONLY_MESSAGE,
                "total": teaser_total,
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
