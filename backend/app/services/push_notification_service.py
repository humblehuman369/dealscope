"""
Push Notification Service — sends notifications via the Expo Push API.

Expo Push docs: https://docs.expo.dev/push-notifications/sending-notifications/

All send methods are async and designed to be called from
FastAPI BackgroundTasks so they don't block request handling.
"""

import logging
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import UserProfile
from app.services.device_service import device_service

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Default notification preferences when user has none set
DEFAULT_NOTIFICATION_PREFS: dict[str, bool] = {
    "push_enabled": True,
    "property_alerts": True,
    "subscription_alerts": True,
    "marketing": True,
}


class PushNotificationService:
    """Sends push notifications through the Expo Push API."""

    # ── Core send method ─────────────────────────────────────────────

    async def send_to_tokens(
        self,
        db: AsyncSession,
        tokens: list[str],
        *,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
        channel_id: str | None = None,
        badge: int | None = None,
    ) -> None:
        """
        Send a push notification to a list of Expo push tokens.

        Handles batching (Expo accepts up to 100 per request) and
        deactivates tokens that Expo reports as invalid.
        """
        if not tokens:
            return

        # Build messages
        messages = []
        for token in tokens:
            msg: dict[str, Any] = {
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
            }
            if data:
                msg["data"] = data
            if channel_id:
                msg["channelId"] = channel_id
            if badge is not None:
                msg["badge"] = badge
            messages.append(msg)

        # Send in batches of 100 (Expo limit)
        headers: dict[str, str] = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        # Optional: use Expo access token for higher throughput
        expo_token = getattr(settings, "EXPO_ACCESS_TOKEN", "")
        if expo_token:
            headers["Authorization"] = f"Bearer {expo_token}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            for i in range(0, len(messages), 100):
                batch = messages[i : i + 100]
                try:
                    resp = await client.post(
                        EXPO_PUSH_URL,
                        json=batch,
                        headers=headers,
                    )
                    resp.raise_for_status()
                    result = resp.json()

                    # Process ticket responses to detect invalid tokens
                    tickets = result.get("data", [])
                    await self._handle_tickets(db, batch, tickets)

                except httpx.HTTPStatusError as exc:
                    logger.error(
                        "Expo Push API HTTP error: %s — %s",
                        exc.response.status_code,
                        exc.response.text[:500],
                    )
                except Exception as exc:
                    logger.error("Expo Push API request failed: %s", exc)

    # ── Convenience methods ──────────────────────────────────────────

    async def send_to_user(
        self,
        db: AsyncSession,
        user_id: UUID,
        *,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
        category: str = "property_alerts",
        channel_id: str | None = None,
    ) -> None:
        """
        Send a notification to all active devices for a user.

        Respects user notification preferences — if the user has
        opted out of the given category, the notification is silently
        dropped.
        """
        # Check user preferences
        if not await self._user_allows_category(db, user_id, category):
            logger.debug("Notification skipped for user %s (category '%s' disabled)", user_id, category)
            return

        tokens = await device_service.get_active_tokens_for_user(db, user_id)
        if not tokens:
            logger.debug("No active tokens for user %s", user_id)
            return

        await self.send_to_tokens(
            db,
            tokens,
            title=title,
            body=body,
            data=data,
            channel_id=channel_id,
        )

    async def broadcast(
        self,
        db: AsyncSession,
        *,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
        category: str = "marketing",
    ) -> int:
        """
        Send a notification to all active devices (admin broadcast).

        Returns the number of tokens targeted.
        NOTE: Does NOT check per-user preferences for broadcast — that
        should be handled if needed via a filtered query in the future.
        """
        tokens = await device_service.get_all_active_tokens(db)
        if not tokens:
            logger.info("Broadcast skipped — no active tokens")
            return 0

        await self.send_to_tokens(
            db,
            tokens,
            title=title,
            body=body,
            data=data,
        )
        logger.info("Broadcast sent to %d tokens", len(tokens))
        return len(tokens)

    # ── Preference checking ──────────────────────────────────────────

    async def _user_allows_category(
        self,
        db: AsyncSession,
        user_id: UUID,
        category: str,
    ) -> bool:
        """
        Check whether a user has opted-in to a notification category.

        Categories match keys in UserProfile.notification_preferences:
          push_enabled, property_alerts, subscription_alerts, marketing

        If no preferences are stored, defaults to True (opt-in).
        """
        result = await db.execute(select(UserProfile.notification_preferences).where(UserProfile.user_id == user_id))
        prefs_row = result.scalar_one_or_none()
        prefs: dict[str, Any] = prefs_row if isinstance(prefs_row, dict) else {}

        # Merge with defaults (missing keys → True)
        effective = {**DEFAULT_NOTIFICATION_PREFS, **prefs}

        # Global kill switch
        if not effective.get("push_enabled", True):
            return False

        # Category-specific
        return bool(effective.get(category, True))

    # ── Ticket handling ──────────────────────────────────────────────

    async def _handle_tickets(
        self,
        db: AsyncSession,
        sent_messages: list[dict[str, Any]],
        tickets: list[dict[str, Any]],
    ) -> None:
        """
        Process Expo push tickets and deactivate tokens that are no
        longer valid (DeviceNotRegistered).
        """
        for msg, ticket in zip(sent_messages, tickets, strict=False):
            ticket_status = ticket.get("status")
            if ticket_status == "ok":
                continue

            # Error ticket — check the details
            details = ticket.get("details", {})
            error = details.get("error") or ticket.get("message", "")

            if error == "DeviceNotRegistered":
                token = msg.get("to", "")
                logger.warning("Token DeviceNotRegistered, deactivating: %s…", token[:20])
                await device_service.deactivate_token(db, token)
            else:
                logger.warning(
                    "Expo push error for token %s…: %s",
                    msg.get("to", "")[:20],
                    ticket,
                )


# Singleton
push_service = PushNotificationService()
