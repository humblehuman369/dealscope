"""
Security audit log model.

Every security-relevant action (login, logout, password change, MFA
enable/disable, session revoke, etc.) is recorded here with the
acting user, IP, user-agent, and an arbitrary metadata payload.
"""

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


def _utcnow() -> datetime:
    return datetime.now(UTC)


class AuditAction(enum.StrEnum):
    """Enumeration of auditable actions."""

    REGISTER = "register"
    LOGIN = "login"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    TOKEN_REFRESH = "token_refresh"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_COMPLETE = "password_reset_complete"
    EMAIL_VERIFICATION = "email_verification"
    MFA_ENABLE = "mfa_enable"
    MFA_DISABLE = "mfa_disable"
    MFA_CHALLENGE = "mfa_challenge"
    SESSION_REVOKE = "session_revoke"
    SESSION_REVOKE_ALL = "session_revoke_all"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    ROLE_GRANTED = "role_granted"
    ROLE_REVOKED = "role_revoked"
    # Admin actions
    ADMIN_UPDATE_USER = "admin:update_user"
    ADMIN_DELETE_USER = "admin:delete_user"
    ADMIN_UPDATE_ASSUMPTIONS = "admin:update_assumptions"


class AuditLog(Base):
    """Immutable record of a security-relevant event."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        index=True,
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")

    __table_args__ = (Index("ix_audit_logs_user_action", "user_id", "action"),)
