"""
Scheduled email tasks — lifecycle and engagement emails sent on a cron
schedule via APScheduler.

Each task opens its own DB session, queries eligible users, checks
notification preferences, sends the email, and records the send
timestamp in the user's ``notification_preferences`` JSON to prevent
duplicates.

Added to the scheduler in ``app/tasks/scheduler.py``.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, or_, select, update

from app.core.config import settings
from app.db.session import get_session_factory
from app.models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from app.models.user import User, UserProfile
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

TOTAL_ONBOARDING_STEPS = 5
MAX_ONBOARDING_NUDGES = 2


def _pref_allows(prefs: dict | None, category: str) -> bool:
    """Return True if the user hasn't opted-out of *category*."""
    if prefs is None:
        return True
    return bool(prefs.get(category, True))


def _last_sent(prefs: dict | None, key: str) -> datetime | None:
    """Parse an ISO timestamp stored in notification_preferences."""
    if not prefs:
        return None
    raw = prefs.get(key)
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except (TypeError, ValueError):
        return None


# ------------------------------------------------------------------
# 1. Incomplete onboarding nudge
# ------------------------------------------------------------------


async def send_onboarding_nudges() -> int:
    """Nudge users who registered but haven't completed onboarding.

    - First nudge: 24 h after registration
    - Second nudge: 72 h after registration
    - Max 2 nudges total
    """
    factory = get_session_factory()
    sent = 0

    async with factory() as db:
        try:
            now = datetime.now(UTC)
            cutoff_24h = now - timedelta(hours=24)
            cutoff_7d = now - timedelta(days=7)

            result = await db.execute(
                select(User, UserProfile)
                .join(UserProfile, UserProfile.user_id == User.id)
                .where(
                    User.is_active.is_(True),
                    UserProfile.onboarding_completed.is_(False),
                    User.created_at < cutoff_24h,
                    User.created_at > cutoff_7d,
                )
            )
            rows = result.all()

            for user, profile in rows:
                prefs = profile.notification_preferences or {}
                if not _pref_allows(prefs, "product_updates"):
                    continue

                nudge_count = prefs.get("onboarding_nudge_count", 0)
                if nudge_count >= MAX_ONBOARDING_NUDGES:
                    continue

                last = _last_sent(prefs, "last_onboarding_nudge")
                if nudge_count == 0 and user.created_at > cutoff_24h:
                    continue
                if nudge_count == 1:
                    cutoff_72h = now - timedelta(hours=72)
                    if user.created_at > cutoff_72h:
                        continue
                    if last and last > now - timedelta(hours=48):
                        continue

                steps_remaining = TOTAL_ONBOARDING_STEPS - (profile.onboarding_step or 0)
                if steps_remaining <= 0:
                    continue

                resp = await email_service.send_onboarding_nudge_email(
                    to=user.email,
                    user_name=user.full_name or "",
                    steps_remaining=steps_remaining,
                )
                if resp.get("success"):
                    new_prefs = {
                        **prefs,
                        "onboarding_nudge_count": nudge_count + 1,
                        "last_onboarding_nudge": now.isoformat(),
                    }
                    await db.execute(
                        update(UserProfile)
                        .where(UserProfile.user_id == user.id)
                        .values(notification_preferences=new_prefs)
                    )
                    sent += 1

            await db.commit()
            logger.info("Sent %d onboarding nudge emails", sent)
        except Exception:
            await db.rollback()
            logger.exception("Failed to send onboarding nudge emails")
    return sent


# ------------------------------------------------------------------
# 2. Re-engagement (dormant user)
# ------------------------------------------------------------------


async def send_reengagement_emails() -> int:
    """Contact users who haven't logged in for 14–60 days (once per 30-day window)."""
    factory = get_session_factory()
    sent = 0

    async with factory() as db:
        try:
            now = datetime.now(UTC)
            cutoff_14d = now - timedelta(days=14)
            cutoff_60d = now - timedelta(days=60)

            result = await db.execute(
                select(User, UserProfile)
                .join(UserProfile, UserProfile.user_id == User.id)
                .where(
                    User.is_active.is_(True),
                    or_(
                        and_(User.last_login.is_not(None), User.last_login < cutoff_14d, User.last_login > cutoff_60d),
                        and_(User.last_login.is_(None), User.created_at < cutoff_14d, User.created_at > cutoff_60d),
                    ),
                )
            )
            rows = result.all()

            for user, profile in rows:
                prefs = profile.notification_preferences or {}
                if not _pref_allows(prefs, "marketing"):
                    continue

                last = _last_sent(prefs, "last_reengagement")
                if last and last > now - timedelta(days=30):
                    continue

                last_active = user.last_login or user.created_at
                days_inactive = (now - last_active).days

                resp = await email_service.send_reengagement_email(
                    to=user.email,
                    user_name=user.full_name or "",
                    days_inactive=days_inactive,
                )
                if resp.get("success"):
                    new_prefs = {**prefs, "last_reengagement": now.isoformat()}
                    await db.execute(
                        update(UserProfile)
                        .where(UserProfile.user_id == user.id)
                        .values(notification_preferences=new_prefs)
                    )
                    sent += 1

            await db.commit()
            logger.info("Sent %d re-engagement emails", sent)
        except Exception:
            await db.rollback()
            logger.exception("Failed to send re-engagement emails")
    return sent


# ------------------------------------------------------------------
# 3. Post-cancellation winback
# ------------------------------------------------------------------


async def send_winback_emails() -> int:
    """Send a single winback email 7 days after subscription cancellation."""
    factory = get_session_factory()
    sent = 0

    async with factory() as db:
        try:
            now = datetime.now(UTC)
            window_start = now - timedelta(days=8)
            window_end = now - timedelta(days=7)

            result = await db.execute(
                select(User, Subscription)
                .join(Subscription, Subscription.user_id == User.id)
                .where(
                    User.is_active.is_(True),
                    Subscription.status == SubscriptionStatus.CANCELED,
                    Subscription.canceled_at.is_not(None),
                    Subscription.canceled_at.between(window_start, window_end),
                )
            )
            rows = result.all()

            for user, _sub in rows:
                profile_result = await db.execute(
                    select(UserProfile.notification_preferences).where(UserProfile.user_id == user.id)
                )
                prefs = profile_result.scalar_one_or_none() or {}

                if not _pref_allows(prefs, "marketing"):
                    continue

                if _last_sent(prefs, "last_winback"):
                    continue

                resp = await email_service.send_winback_email(
                    to=user.email,
                    user_name=user.full_name or "",
                )
                if resp.get("success"):
                    new_prefs = {**prefs, "last_winback": now.isoformat()}
                    await db.execute(
                        update(UserProfile)
                        .where(UserProfile.user_id == user.id)
                        .values(notification_preferences=new_prefs)
                    )
                    sent += 1

            await db.commit()
            logger.info("Sent %d winback emails", sent)
        except Exception:
            await db.rollback()
            logger.exception("Failed to send winback emails")
    return sent


# ------------------------------------------------------------------
# 4. Annual renewal reminder
# ------------------------------------------------------------------


async def send_annual_renewal_reminders() -> int:
    """Remind annual subscribers 7 days before their renewal date."""
    factory = get_session_factory()
    sent = 0

    yearly_price = settings.STRIPE_PRICE_PRO_YEARLY
    if not yearly_price:
        return 0

    async with factory() as db:
        try:
            now = datetime.now(UTC)
            window_start = now + timedelta(days=6)
            window_end = now + timedelta(days=8)

            result = await db.execute(
                select(User, Subscription)
                .join(Subscription, Subscription.user_id == User.id)
                .where(
                    User.is_active.is_(True),
                    Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]),
                    Subscription.stripe_price_id == yearly_price,
                    Subscription.current_period_end.is_not(None),
                    Subscription.current_period_end.between(window_start, window_end),
                    Subscription.cancel_at_period_end.is_(False),
                )
            )
            rows = result.all()

            for user, sub in rows:
                profile_result = await db.execute(
                    select(UserProfile.notification_preferences).where(UserProfile.user_id == user.id)
                )
                prefs = profile_result.scalar_one_or_none() or {}

                if not _pref_allows(prefs, "subscription_alerts"):
                    continue

                last = _last_sent(prefs, "last_annual_reminder")
                if last and last > now - timedelta(days=30):
                    continue

                renewal_date = sub.current_period_end.strftime("%B %d, %Y") if sub.current_period_end else "soon"
                amount_display = "$348.00"  # annual Pro price

                resp = await email_service.send_annual_renewal_reminder_email(
                    to=user.email,
                    user_name=user.full_name or "",
                    renewal_date=renewal_date,
                    amount_display=amount_display,
                )
                if resp.get("success"):
                    new_prefs = {**prefs, "last_annual_reminder": now.isoformat()}
                    await db.execute(
                        update(UserProfile)
                        .where(UserProfile.user_id == user.id)
                        .values(notification_preferences=new_prefs)
                    )
                    sent += 1

            await db.commit()
            logger.info("Sent %d annual renewal reminder emails", sent)
        except Exception:
            await db.rollback()
            logger.exception("Failed to send annual renewal reminders")
    return sent


# ------------------------------------------------------------------
# 5. Activity digest (weekly)
# ------------------------------------------------------------------


async def send_activity_digests() -> int:
    """Send a weekly activity digest to users who opted in."""
    factory = get_session_factory()
    sent = 0

    async with factory() as db:
        try:
            now = datetime.now(UTC)

            result = await db.execute(
                select(User, UserProfile, Subscription)
                .join(UserProfile, UserProfile.user_id == User.id)
                .outerjoin(Subscription, Subscription.user_id == User.id)
                .where(User.is_active.is_(True))
            )
            rows = result.all()

            for user, profile, sub in rows:
                prefs = profile.notification_preferences or {}
                if not prefs.get("digest", False):
                    continue

                last = _last_sent(prefs, "last_digest")
                if last and last > now - timedelta(days=6):
                    continue

                stats: dict = {
                    "analyses_count": sub.searches_used if sub else 0,
                    "saved_count": 0,
                    "price_drops": 0,
                }

                resp = await email_service.send_activity_digest_email(
                    to=user.email,
                    user_name=user.full_name or "",
                    period="weekly",
                    stats=stats,
                )
                if resp.get("success"):
                    new_prefs = {**prefs, "last_digest": now.isoformat()}
                    await db.execute(
                        update(UserProfile)
                        .where(UserProfile.user_id == user.id)
                        .values(notification_preferences=new_prefs)
                    )
                    sent += 1

            await db.commit()
            logger.info("Sent %d activity digest emails", sent)
        except Exception:
            await db.rollback()
            logger.exception("Failed to send activity digest emails")
    return sent
