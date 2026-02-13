"""
Device token service — CRUD operations for push notification tokens.
"""

import logging
from typing import Optional, List
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device_token import DeviceToken, DevicePlatform

logger = logging.getLogger(__name__)


class DeviceService:
    """Manages push notification device tokens."""

    async def register_token(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        token: str,
        device_platform: DevicePlatform,
        device_name: Optional[str] = None,
    ) -> DeviceToken:
        """
        Register or re-activate a device token.

        Idempotent: if the token already exists for this user, we update
        it and mark it active. If it belongs to a different user, we
        reassign it (token is globally unique — a device can only have
        one owner).
        """
        # Check if token already exists
        result = await db.execute(
            select(DeviceToken).where(DeviceToken.token == token)
        )
        existing = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if existing:
            # Re-activate and update ownership / metadata
            existing.user_id = user_id
            existing.device_platform = device_platform
            existing.device_name = device_name or existing.device_name
            existing.is_active = True
            existing.last_used_at = now
            existing.updated_at = now
            await db.commit()
            await db.refresh(existing)
            logger.info("Device token updated for user %s (platform=%s)", user_id, device_platform.value)
            return existing

        # Create new token
        device = DeviceToken(
            user_id=user_id,
            token=token,
            device_platform=device_platform,
            device_name=device_name,
            is_active=True,
            last_used_at=now,
        )
        db.add(device)
        await db.commit()
        await db.refresh(device)
        logger.info("Device token registered for user %s (platform=%s)", user_id, device_platform.value)
        return device

    async def unregister_token(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        token: str,
    ) -> bool:
        """
        Unregister a device token (e.g., on logout).
        Returns True if a token was deactivated.
        """
        result = await db.execute(
            update(DeviceToken)
            .where(DeviceToken.token == token, DeviceToken.user_id == user_id)
            .values(is_active=False, updated_at=datetime.now(timezone.utc))
        )
        await db.commit()
        deactivated = result.rowcount > 0  # type: ignore[union-attr]
        if deactivated:
            logger.info("Device token unregistered for user %s", user_id)
        return deactivated

    async def deactivate_token(
        self,
        db: AsyncSession,
        token: str,
    ) -> None:
        """
        Deactivate a token (e.g., Expo reported DeviceNotRegistered).
        Does not require user context.
        """
        await db.execute(
            update(DeviceToken)
            .where(DeviceToken.token == token)
            .values(is_active=False, updated_at=datetime.now(timezone.utc))
        )
        await db.commit()
        logger.info("Device token deactivated (DeviceNotRegistered): %s…", token[:20])

    async def get_active_tokens_for_user(
        self,
        db: AsyncSession,
        user_id: UUID,
    ) -> List[str]:
        """Return all active push tokens for a user."""
        result = await db.execute(
            select(DeviceToken.token).where(
                DeviceToken.user_id == user_id,
                DeviceToken.is_active.is_(True),
            )
        )
        return list(result.scalars().all())

    async def get_all_active_tokens(
        self,
        db: AsyncSession,
    ) -> List[str]:
        """Return all active push tokens across all users (for broadcast)."""
        result = await db.execute(
            select(DeviceToken.token).where(DeviceToken.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def list_user_devices(
        self,
        db: AsyncSession,
        user_id: UUID,
    ) -> List[DeviceToken]:
        """Return all device tokens (active and inactive) for a user."""
        result = await db.execute(
            select(DeviceToken)
            .where(DeviceToken.user_id == user_id)
            .order_by(DeviceToken.last_used_at.desc())
        )
        return list(result.scalars().all())

    async def touch_token(
        self,
        db: AsyncSession,
        token: str,
    ) -> None:
        """Update last_used_at for a token (called on successful push)."""
        await db.execute(
            update(DeviceToken)
            .where(DeviceToken.token == token)
            .values(last_used_at=datetime.now(timezone.utc))
        )
        await db.commit()


# Singleton
device_service = DeviceService()
