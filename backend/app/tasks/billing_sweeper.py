"""
Periodic sweeper for stale subscription state.

Stripe and RevenueCat normally transition users out of TRIALING and ACTIVE
states via webhooks. If a webhook is lost, delayed, or misrouted, a user
could keep Pro access indefinitely after their trial ended or their paid
period expired. This sweeper provides a safety net by downgrading
subscriptions whose ``trial_end`` or ``current_period_end`` has clearly
passed without any recent webhook activity.

Buffers are intentionally generous to avoid races with legitimate in-flight
webhooks. If a user is actually paying, the next webhook (or their next
``/sync-iap`` call from the mobile app) will re-upgrade them on the next
event cycle.

Closes Risk #3 from the trial-enforcement audit.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, select

from app.db.session import get_session_factory
from app.models.subscription import (
    TIER_LIMITS,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
)

logger = logging.getLogger(__name__)


# Generous buffers so we never sweep a record that might still be receiving
# webhook updates. Tuned to be longer than typical webhook retry windows.
TRIAL_PAST_DUE_BUFFER = timedelta(hours=6)
PAID_PAST_DUE_BUFFER = timedelta(hours=24)
RECENT_UPDATE_BUFFER = timedelta(hours=1)


async def sweep_expired_subscriptions() -> dict[str, int]:
    """Downgrade subscriptions whose trial or paid period clearly ended
    without a webhook transition.

    Returns:
        ``{"trials_swept": N, "paid_swept": N, "errors": N}``
    """
    factory = get_session_factory()
    now = datetime.now(UTC)
    trial_cutoff = now - TRIAL_PAST_DUE_BUFFER
    paid_cutoff = now - PAID_PAST_DUE_BUFFER
    recent_cutoff = now - RECENT_UPDATE_BUFFER

    counts = {"trials_swept": 0, "paid_swept": 0, "errors": 0}
    free_limits = TIER_LIMITS[SubscriptionTier.FREE]

    async with factory() as db:
        try:
            # ---- Stale trials ----
            # TRIALING + trial_end well past + not touched recently.
            # The recent-update gate avoids racing with an in-flight webhook
            # that may already be processing the trial-end transition.
            trials_q = select(Subscription).where(
                and_(
                    Subscription.status == SubscriptionStatus.TRIALING,
                    Subscription.trial_end.isnot(None),
                    Subscription.trial_end < trial_cutoff,
                    Subscription.updated_at < recent_cutoff,
                )
            )
            stale_trials = (await db.execute(trials_q)).scalars().all()
            for sub in stale_trials:
                logger.info(
                    "billing_sweeper: downgrading stale trial user_id=%s "
                    "trial_end=%s now=%s",
                    sub.user_id,
                    sub.trial_end,
                    now,
                )
                _downgrade_to_free(sub, free_limits, now)
                counts["trials_swept"] += 1

            # ---- Stale paid subscriptions ----
            # PRO + ACTIVE + current_period_end well past + not touched recently.
            # Excludes PAST_DUE (those are inside Stripe's retry window) and
            # CANCELED/INCOMPLETE/etc. (those are end-of-life states).
            paid_q = select(Subscription).where(
                and_(
                    Subscription.tier == SubscriptionTier.PRO,
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.current_period_end.isnot(None),
                    Subscription.current_period_end < paid_cutoff,
                    Subscription.updated_at < recent_cutoff,
                )
            )
            stale_paid = (await db.execute(paid_q)).scalars().all()
            for sub in stale_paid:
                logger.info(
                    "billing_sweeper: downgrading stale paid user_id=%s "
                    "current_period_end=%s now=%s",
                    sub.user_id,
                    sub.current_period_end,
                    now,
                )
                _downgrade_to_free(sub, free_limits, now)
                counts["paid_swept"] += 1

            await db.commit()

            if counts["trials_swept"] or counts["paid_swept"]:
                logger.info(
                    "billing_sweeper finished: %d trials swept, %d paid swept",
                    counts["trials_swept"],
                    counts["paid_swept"],
                )
            else:
                logger.debug("billing_sweeper finished: no stale subscriptions")

        except Exception:
            counts["errors"] += 1
            logger.exception("billing_sweeper: failed to sweep subscriptions")
            await db.rollback()

    return counts


def _downgrade_to_free(
    sub: Subscription,
    free_limits: dict,
    now: datetime,
) -> None:
    """Apply a uniform downgrade to FREE tier with CANCELED status."""
    sub.tier = SubscriptionTier.FREE
    sub.status = SubscriptionStatus.CANCELED
    sub.properties_limit = free_limits["properties_limit"]
    sub.searches_per_month = free_limits["searches_per_month"]
    sub.api_calls_per_month = free_limits["api_calls_per_month"]
    sub.cancel_at_period_end = False
    sub.canceled_at = now
    sub.updated_at = now
