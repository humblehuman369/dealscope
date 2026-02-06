"""
Verification token model.

Stores hashed (SHA-256) tokens for email verification, password resets,
and MFA setup.  The raw token is sent to the user; only the hash is
persisted so a database leak does not expose usable tokens.
"""

from sqlalchemy import String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional, TYPE_CHECKING
import uuid
from datetime import datetime, timezone
import enum

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TokenType(str, enum.Enum):
    """Types of verification tokens."""
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    MFA_SETUP = "mfa_setup"


class VerificationToken(Base):
    """A one-time-use verification token."""
    __tablename__ = "verification_tokens"

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
    token_hash: Mapped[str] = mapped_column(
        String(64),          # SHA-256 hex digest
        unique=True,
        nullable=False,
        index=True,
    )
    token_type: Mapped[str] = mapped_column(String(30), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="verification_tokens")

    __table_args__ = (
        Index("ix_verification_tokens_user_type", "user_id", "token_type"),
    )
