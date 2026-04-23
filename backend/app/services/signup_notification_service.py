"""
Signup notification service.

Notifies configured admin recipients whenever a new user signs up via any
auth path (email/password, Google OAuth, Apple Sign In). Designed to be
fired-and-forgotten from the auth router via ``asyncio.create_task`` —
never blocks the signup response and never raises into the caller.

Channels are intentionally pluggable so adding Slack/Discord later is a
single ``await`` inside ``_dispatch``.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import func, select

from app.core.config import settings
from app.models.user import User
from app.services.cache_service import get_cache_service
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

SignupSource = Literal["email", "google", "apple"]

_SOURCE_LABELS: dict[str, str] = {
    "email": "Email + password",
    "google": "Google OAuth",
    "apple": "Apple Sign In",
}

_IDEMPOTENCY_KEY_PREFIX = "signup_notified"
_IDEMPOTENCY_TTL_SECONDS = 86400  # 24 hours


class SignupNotificationService:
    """Fan-out notifier for new-signup events.

    Today: per-recipient admin email via Resend.
    Tomorrow: add Slack/Discord by extending ``_dispatch``.
    """

    async def notify(
        self,
        *,
        user_id: uuid.UUID,
        email: str,
        full_name: str | None,
        source: SignupSource,
        ip_address: str | None = None,
    ) -> None:
        """Entry point. Safe to call from ``asyncio.create_task``.

        Catches every exception so a notification failure can never
        impact the user-facing signup flow.
        """
        try:
            await self._notify_inner(
                user_id=user_id,
                email=email,
                full_name=full_name,
                source=source,
                ip_address=ip_address,
            )
        except Exception as exc:
            logger.error(
                "Signup notification failed for user_id=%s: %s",
                user_id,
                exc,
                exc_info=True,
            )

    async def _notify_inner(
        self,
        *,
        user_id: uuid.UUID,
        email: str,
        full_name: str | None,
        source: SignupSource,
        ip_address: str | None,
    ) -> None:
        recipients = settings.admin_notification_emails_list
        if not recipients:
            logger.debug("Signup notification skipped — ADMIN_NOTIFICATION_EMAILS unset")
            return

        if await self._already_notified(user_id):
            logger.info("Signup notification skipped — already sent for user_id=%s", user_id)
            return

        total_users = await self._fetch_total_user_count()

        await self._dispatch(
            recipients=recipients,
            email=email,
            full_name=full_name,
            source=source,
            ip_address=ip_address,
            total_users=total_users,
        )

        await self._mark_notified(user_id)

    # ------------------------------------------------------------------
    # Channel dispatch (extend here to add Slack/Discord/etc.)
    # ------------------------------------------------------------------

    async def _dispatch(
        self,
        *,
        recipients: list[str],
        email: str,
        full_name: str | None,
        source: SignupSource,
        ip_address: str | None,
        total_users: int | None,
    ) -> None:
        source_label = _SOURCE_LABELS.get(source, source)
        signup_time = datetime.now(UTC).strftime("%B %d, %Y at %I:%M %p UTC")
        location = self._approximate_location(ip_address)

        for recipient in recipients:
            try:
                result = await email_service.send_signup_notification_email(
                    to=recipient,
                    new_user_email=email,
                    new_user_name=full_name,
                    source=source_label,
                    signup_time=signup_time,
                    location=location,
                    total_users=total_users,
                )
                if not result.get("success"):
                    logger.error(
                        "Admin signup email rejected for %s: %s",
                        recipient,
                        result.get("error", "unknown error"),
                    )
            except Exception as exc:
                logger.error(
                    "Admin signup email crashed for %s: %s",
                    recipient,
                    exc,
                    exc_info=True,
                )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _idempotency_key(user_id: uuid.UUID) -> str:
        return f"{_IDEMPOTENCY_KEY_PREFIX}:{user_id}"

    async def _already_notified(self, user_id: uuid.UUID) -> bool:
        try:
            return await get_cache_service().exists(self._idempotency_key(user_id))
        except Exception as exc:
            logger.warning("Idempotency check failed (allowing send): %s", exc)
            return False

    async def _mark_notified(self, user_id: uuid.UUID) -> None:
        try:
            await get_cache_service().set(
                self._idempotency_key(user_id),
                True,
                ttl_seconds=_IDEMPOTENCY_TTL_SECONDS,
            )
        except Exception as exc:
            logger.warning("Idempotency mark failed for user_id=%s: %s", user_id, exc)

    async def _fetch_total_user_count(self) -> int | None:
        """Query a fresh, short-lived DB session for the total user count.

        We deliberately do NOT reuse the request-scoped session — this
        runs in a background task, after the request has completed and
        its session has been closed.
        """
        try:
            from app.db.session import get_session_factory

            session_factory = get_session_factory()
            async with session_factory() as session:
                result = await session.execute(select(func.count()).select_from(User))
                return int(result.scalar_one())
        except Exception as exc:
            logger.warning("Failed to fetch total user count for signup notification: %s", exc)
            return None

    @staticmethod
    def _approximate_location(ip_address: str | None) -> str | None:
        """Placeholder for IP-geolocation.

        We deliberately avoid logging or transmitting the raw IP. When a
        real geo provider (e.g. MaxMind, ipinfo.io) is added, plug it in
        here and return a city/region/country string. Returning ``None``
        leaves the email field as "Unknown".
        """
        if not ip_address:
            return None
        return None


# Module-level singleton (mirrors email_service / auth_service pattern)
signup_notification_service = SignupNotificationService()
