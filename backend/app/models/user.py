"""
User and UserProfile models.

User stores authentication credentials and account status.
UserProfile stores investment preferences and UI settings.
Business profile fields are kept on User for simplicity.
"""

from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey, Float, Text, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional, List, TYPE_CHECKING
import uuid
from datetime import datetime, timezone

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.saved_property import SavedProperty
    from app.models.document import Document
    from app.models.subscription import Subscription, PaymentHistory
    from app.models.session import UserSession
    from app.models.role import UserRole
    from app.models.audit_log import AuditLog
    from app.models.verification_token import VerificationToken


def _utcnow() -> datetime:
    """Return timezone-aware UTC now."""
    return datetime.now(timezone.utc)


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

    # Profile info
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))

    # ==========================================
    # Business Profile Fields
    # ==========================================
    business_name: Mapped[Optional[str]] = mapped_column(String(255))
    business_type: Mapped[Optional[str]] = mapped_column(String(100))
    business_address_street: Mapped[Optional[str]] = mapped_column(String(255))
    business_address_city: Mapped[Optional[str]] = mapped_column(String(100))
    business_address_state: Mapped[Optional[str]] = mapped_column(String(10))
    business_address_zip: Mapped[Optional[str]] = mapped_column(String(20))
    business_address_country: Mapped[Optional[str]] = mapped_column(String(100), default="USA")
    phone_numbers: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    additional_emails: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), default=list)
    social_links: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    license_number: Mapped[Optional[str]] = mapped_column(String(100))
    license_state: Mapped[Optional[str]] = mapped_column(String(10))
    bio: Mapped[Optional[str]] = mapped_column(Text)

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
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # ==========================================
    # MFA
    # ==========================================
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(255))  # encrypted TOTP secret
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # ==========================================
    # Legacy token columns (kept for migration, will be removed later)
    # New code uses the verification_tokens table.
    # ==========================================
    verification_token: Mapped[Optional[str]] = mapped_column(String(255))
    verification_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    reset_token: Mapped[Optional[str]] = mapped_column(String(255))
    reset_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

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
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # ==========================================
    # Relationships
    # ==========================================
    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    saved_properties: Mapped[List["SavedProperty"]] = relationship(
        "SavedProperty",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    documents: Mapped[List["Document"]] = relationship(
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
    payment_history: Mapped[List["PaymentHistory"]] = relationship(
        "PaymentHistory",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    user_roles: Mapped[List["UserRole"]] = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    verification_tokens: Mapped[List["VerificationToken"]] = relationship(
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
    investment_experience: Mapped[Optional[str]] = mapped_column(String(50))
    preferred_strategies: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), default=list)
    target_markets: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), default=list)

    # Budget
    investment_budget_min: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    investment_budget_max: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))

    # Target Returns
    target_cash_on_cash: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    target_cap_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))

    # Risk Tolerance
    risk_tolerance: Mapped[Optional[str]] = mapped_column(String(20))

    # Default Assumptions (JSON blob that overrides global defaults)
    default_assumptions: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # UI Preferences
    notification_preferences: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    dashboard_layout: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    preferred_theme: Mapped[Optional[str]] = mapped_column(String(20), default="system")

    # Onboarding
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_step: Mapped[Optional[int]] = mapped_column(default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")
