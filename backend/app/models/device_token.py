"""
DeviceToken model.
Stores push notification tokens for user devices (Expo Push).
"""

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class DevicePlatform(enum.StrEnum):
    """Mobile platform type."""

    IOS = "ios"
    ANDROID = "android"


class DeviceToken(Base):
    """
    Push notification device token.
    Each row represents one device registered to receive push notifications.
    Uses Expo Push tokens (ExponentPushToken[...]).
    """

    __tablename__ = "device_tokens"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Foreign key to user
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Expo push token — unique across all users
    token: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    # Device metadata
    device_platform: Mapped[DevicePlatform] = mapped_column(
        SQLEnum(DevicePlatform),
        nullable=False,
    )
    device_name: Mapped[str | None] = mapped_column(String(255))

    # Active flag — set to False when Expo reports DeviceNotRegistered
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="device_tokens")
