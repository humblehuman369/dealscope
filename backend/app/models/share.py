"""
SharedLink model for sharing properties with external users.
Supports public links, password-protected links, and email invites.
"""

import enum
import secrets
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.saved_property import SavedProperty
    from app.models.user import User


class ShareType(enum.StrEnum):
    """Types of sharing access."""

    PUBLIC_LINK = "public_link"  # Anyone with link can view
    PASSWORD_LINK = "password_link"  # Requires password
    EMAIL_INVITE = "email_invite"  # Specific email recipients
    TEAM_SHARE = "team_share"  # Future: team/organization


class SharedLink(Base):
    """
    A shareable link for a saved property.
    Allows users to share property analysis with others.
    """

    __tablename__ = "shared_links"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("saved_properties.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Share Configuration
    share_type: Mapped[ShareType] = mapped_column(SQLEnum(ShareType), default=ShareType.PUBLIC_LINK)
    share_token: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, default=lambda: secrets.token_urlsafe(32)
    )

    # Password Protection
    password_hash: Mapped[str | None] = mapped_column(String(255))  # For password-protected links

    # Access Control
    allowed_emails: Mapped[list[str] | None] = mapped_column(
        ARRAY(String)
    )  # For email invites - list of allowed emails

    # View Limits
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    max_views: Mapped[int | None] = mapped_column(Integer)  # None = unlimited

    # What to Share (visibility settings)
    include_analytics: Mapped[bool] = mapped_column(Boolean, default=True)
    include_documents: Mapped[bool] = mapped_column(Boolean, default=False)
    include_adjustments: Mapped[bool] = mapped_column(Boolean, default=True)
    include_notes: Mapped[bool] = mapped_column(Boolean, default=False)

    # Strategy visibility (None = all strategies)
    visible_strategies: Mapped[list[str] | None] = mapped_column(
        ARRAY(String)
    )  # ['ltr', 'str', 'brrrr'] - if None, show all

    # Custom Message
    message: Mapped[str | None] = mapped_column(Text)  # Personal note to recipient

    # Link Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Expiration
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    user: Mapped["User"] = relationship("User")
    saved_property: Mapped["SavedProperty"] = relationship("SavedProperty")

    def check_is_expired(self) -> bool:
        """Check if the link has expired."""
        if self.expires_at is None:
            return False
        return datetime.now(UTC) > self.expires_at

    def check_is_view_limit_reached(self) -> bool:
        """Check if max views have been reached."""
        if self.max_views is None:
            return False
        return self.view_count >= self.max_views

    def check_is_accessible(self) -> bool:
        """Check if the link is still accessible."""
        return self.is_active and not self.check_is_expired() and not self.check_is_view_limit_reached()

    def increment_view_count(self) -> None:
        """Increment view count atomically via SQL expression.

        Uses ``Column + 1`` so SQLAlchemy emits
        ``SET view_count = view_count + 1`` instead of a Python-side
        read-modify-write, preventing lost updates under concurrency.
        """
        self.view_count = SharedLink.view_count + 1  # type: ignore[assignment]
        self.last_accessed_at = datetime.now(UTC)
