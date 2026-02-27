"""
User and UserProfile models.

User stores authentication credentials and account status.
UserProfile stores investment preferences and UI settings.
Business profile fields are kept on User for simplicity.
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.audit_log import AuditLog
    from app.models.document import Document
    from app.models.role import UserRole
    from app.models.saved_property import SavedProperty
    from app.models.session import UserSession
    from app.models.subscription import PaymentHistory, Subscription
    from app.models.verification_token import VerificationToken


def _utcnow() -> datetime:
    """Return timezone-aware UTC now."""
    return datetime.now(UTC)


class User(Base):
    """
    User account model.
    Stores authentication credentials, account status, and business profile.
    """

    __tablename__ = "users"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Authentication
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # OAuth (e.g. Google); hashed_password unused for oauth-only users
    oauth_provider: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    oauth_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    # Profile info
    full_name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(500))

    # ==========================================
    # Business Profile Fields
    # ==========================================
    business_name: Mapped[str | None] = mapped_column(String(255))
    business_type: Mapped[str | None] = mapped_column(String(100))
    business_address_street: Mapped[str | None] = mapped_column(String(255))
    business_address_city: Mapped[str | None] = mapped_column(String(100))
    business_address_state: Mapped[str | None] = mapped_column(String(10))
    business_address_zip: Mapped[str | None] = mapped_column(String(20))
    business_address_country: Mapped[str | None] = mapped_column(String(100), default="USA")
    phone_numbers: Mapped[list | None] = mapped_column(JSON, default=list)
    additional_emails: Mapped[list[str] | None] = mapped_column(ARRAY(String), default=list)
    social_links: Mapped[dict | None] = mapped_column(JSON, default=dict)
    license_number: Mapped[str | None] = mapped_column(String(100))
    license_state: Mapped[str | None] = mapped_column(String(10))
    bio: Mapped[str | None] = mapped_column(Text)

    # ==========================================
    # Account status
    # ==========================================
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    # is_superuser kept for backward compat during migration; RBAC is the authority
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # ==========================================
    # Security — account lockout
    # ==========================================
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ==========================================
    # MFA
    # ==========================================
    mfa_secret: Mapped[str | None] = mapped_column(String(255))  # encrypted TOTP secret
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # ==========================================
    # Timestamps
    # ==========================================
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ==========================================
    # Relationships
    # ==========================================
    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    saved_properties: Mapped[list["SavedProperty"]] = relationship(
        "SavedProperty",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    subscription: Mapped[Optional["Subscription"]] = relationship(
        "Subscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    payment_history: Mapped[list["PaymentHistory"]] = relationship(
        "PaymentHistory",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[list["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    verification_tokens: Mapped[list["VerificationToken"]] = relationship(
        "VerificationToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserProfile(Base):
    """
    User investment profile.
    Stores investment preferences, goals, and default assumptions.
    """

    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # Investment Experience
    investment_experience: Mapped[str | None] = mapped_column(String(50))
    preferred_strategies: Mapped[list[str] | None] = mapped_column(ARRAY(String), default=list)
    target_markets: Mapped[list[str] | None] = mapped_column(ARRAY(String), default=list)

    # Budget
    investment_budget_min: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    investment_budget_max: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    # Target Returns
    target_cash_on_cash: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    target_cap_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))

    # Risk Tolerance
    risk_tolerance: Mapped[str | None] = mapped_column(String(20))

    # Default Assumptions (JSON blob that overrides global defaults)
    default_assumptions: Mapped[dict | None] = mapped_column(JSON, default=dict)

    # UI Preferences
    notification_preferences: Mapped[dict | None] = mapped_column(JSON, default=dict)
    dashboard_layout: Mapped[dict | None] = mapped_column(JSON, default=dict)
    preferred_theme: Mapped[str | None] = mapped_column(String(20), default="system")

    # Onboarding
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_step: Mapped[int | None] = mapped_column(default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")
