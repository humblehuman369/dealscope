"""
SharedLink model for sharing properties with external users.
Supports public links, password-protected links, and email invites.
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional, List, TYPE_CHECKING
import uuid
from datetime import datetime
import enum
import secrets

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.saved_property import SavedProperty


class ShareType(str, enum.Enum):
    """Types of sharing access."""
    PUBLIC_LINK = "public_link"          # Anyone with link can view
    PASSWORD_LINK = "password_link"      # Requires password
    EMAIL_INVITE = "email_invite"        # Specific email recipients
    TEAM_SHARE = "team_share"            # Future: team/organization


class SharedLink(Base):
    """
    A shareable link for a saved property.
    Allows users to share property analysis with others.
    """
    __tablename__ = "shared_links"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("saved_properties.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Share Configuration
    share_type: Mapped[ShareType] = mapped_column(
        SQLEnum(ShareType), 
        default=ShareType.PUBLIC_LINK
    )
    share_token: Mapped[str] = mapped_column(
        String(64), 
        unique=True, 
        index=True,
        default=lambda: secrets.token_urlsafe(32)
    )
    
    # Password Protection
    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255)
    )  # For password-protected links
    
    # Access Control
    allowed_emails: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String)
    )  # For email invites - list of allowed emails
    
    # View Limits
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    max_views: Mapped[Optional[int]] = mapped_column(Integer)  # None = unlimited
    
    # What to Share (visibility settings)
    include_analytics: Mapped[bool] = mapped_column(Boolean, default=True)
    include_documents: Mapped[bool] = mapped_column(Boolean, default=False)
    include_adjustments: Mapped[bool] = mapped_column(Boolean, default=True)
    include_notes: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Strategy visibility (None = all strategies)
    visible_strategies: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String)
    )  # ['ltr', 'str', 'brrrr'] - if None, show all
    
    # Custom Message
    message: Mapped[Optional[str]] = mapped_column(Text)  # Personal note to recipient
    
    # Link Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Expiration
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relationships
    user: Mapped["User"] = relationship("User")
    property: Mapped["SavedProperty"] = relationship("SavedProperty")
    
    @property
    def is_expired(self) -> bool:
        """Check if the link has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_view_limit_reached(self) -> bool:
        """Check if max views have been reached."""
        if self.max_views is None:
            return False
        return self.view_count >= self.max_views
    
    @property
    def is_accessible(self) -> bool:
        """Check if the link is still accessible."""
        return (
            self.is_active 
            and not self.is_expired 
            and not self.is_view_limit_reached
        )
    
    def increment_view_count(self) -> None:
        """Increment view count and update last accessed time."""
        self.view_count += 1
        self.last_accessed_at = datetime.utcnow()

