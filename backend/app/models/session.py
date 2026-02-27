"""
Server-side session model.

Each row represents an active (or revoked) login session.
The session_token is sent as an httpOnly cookie (web) or stored in
SecureStore (mobile).  A short-lived JWT is derived from the session
for stateless API authorization with a 5-minute window.
"""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


def _utcnow() -> datetime:
    return datetime.now(UTC)


class UserSession(Base):
    """A single login session for a user."""

    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Opaque tokens — 64-byte url-safe random strings
    session_token: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        nullable=False,
        index=True,
    )
    refresh_token: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        nullable=False,
        index=True,
    )

    # Device / client metadata
    ip_address: Mapped[str | None] = mapped_column(String(45))  # IPv6 max
    user_agent: Mapped[str | None] = mapped_column(Text)
    device_name: Mapped[str | None] = mapped_column(String(255))

    # Lifecycle
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    last_active_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")

    __table_args__ = (Index("ix_user_sessions_user_active", "user_id", "is_revoked"),)
