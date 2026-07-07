"""Entitlement resolution — the single source of truth for free / trial / paid.

Task 3.2 of the directory-gating plan: every access gate (directories, exports,
metering) resolves the user through this ONE helper instead of scattering
subscription-status logic across routers.

Business rule
-------------
``paid`` requires at least one settled charge:

* Web (Stripe): a ``PaymentHistory`` row with status ``succeeded`` and a
  positive amount — written by the ``invoice.paid`` webhook. Trial-start
  invoices are $0 and never qualify. As a belt-and-braces fallback, a
  subscription in ``ACTIVE`` status also counts: Stripe only transitions a
  charge-automatically subscription to ``active`` after its first invoice
  settles (otherwise it sits in ``incomplete``/``past_due``).
* Mobile (RevenueCat): the RC webhook sets ``TRIALING`` for TRIAL/INTRO
  period types and ``ACTIVE`` only once Apple/Google actually charged, so
  ``ACTIVE`` is the settled-charge equivalent. RC produces no per-charge rows.
* Admin-comped Pro accounts (ACTIVE with no Stripe/RC backing) are deliberate
  grants and resolve to ``paid``.

A trialing Pro subscription with no settled charge resolves to ``trial``.
Everything else — no subscription, free tier, canceled, past-due, unpaid —
resolves to ``free``.
"""

from __future__ import annotations

import enum
import logging
import uuid

from sqlalchemy import and_, exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import PaymentHistory, Subscription, SubscriptionStatus

logger = logging.getLogger(__name__)


class Entitlement(enum.StrEnum):
    """Resolved access level for gating decisions."""

    FREE = "free"
    TRIAL = "trial"
    PAID = "paid"


async def has_settled_charge(db: AsyncSession, user_id: uuid.UUID) -> bool:
    """True when the user has at least one succeeded payment with amount > 0.

    Trial-start invoices are recorded at $0 by the Stripe webhook and do not
    count as settled charges.
    """
    stmt = select(
        exists().where(
            and_(
                PaymentHistory.user_id == user_id,
                PaymentHistory.status == "succeeded",
                PaymentHistory.amount > 0,
            )
        )
    )
    result = await db.execute(stmt)
    return bool(result.scalar())


async def resolve_entitlement_with_subscription(
    db: AsyncSession, user_id: uuid.UUID
) -> tuple[Entitlement, Subscription | None]:
    """Resolve entitlement and return the subscription row alongside it.

    The subscription is needed by callers that anchor metering periods on the
    billing date (Task 3.4 export meter).
    """
    result = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
    subscription = result.scalar_one_or_none()

    if subscription is None or not subscription.is_premium() or not subscription.is_active():
        return Entitlement.FREE, subscription

    # ACTIVE means the first charge settled (Stripe), the store charged
    # (RevenueCat non-trial period), or an admin comp — all paid.
    if subscription.status == SubscriptionStatus.ACTIVE:
        return Entitlement.PAID, subscription

    # TRIALING: paid only when a settled charge is already on record
    # (e.g. a returning subscriber); otherwise it is a trial.
    if await has_settled_charge(db, user_id):
        return Entitlement.PAID, subscription

    return Entitlement.TRIAL, subscription


async def resolve_entitlement(db: AsyncSession, user_id: uuid.UUID) -> Entitlement:
    """Resolve a user to ``free``, ``trial``, or ``paid``.

    This is the ONE entitlement helper (Task 3.2). All directory / export /
    metering gates must call this instead of re-deriving subscription status.
    """
    entitlement, _ = await resolve_entitlement_with_subscription(db, user_id)
    return entitlement
