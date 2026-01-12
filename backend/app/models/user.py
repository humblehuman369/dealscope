"""
User and UserProfile models for authentication and investment preferences.
"""

from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional, List, TYPE_CHECKING
import uuid
from datetime import datetime

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.saved_property import SavedProperty
    from app.models.document import Document


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
        default=uuid.uuid4
    )
    
    # Authentication
    email: Mapped[str] = mapped_column(
        String(255), 
        unique=True, 
        index=True, 
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Profile info
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    # ==========================================
    # Business Profile Fields
    # ==========================================
    business_name: Mapped[Optional[str]] = mapped_column(String(255))
    business_type: Mapped[Optional[str]] = mapped_column(String(100))  # LLC, Corp, Sole Prop, etc.
    
    # Business Address
    business_address_street: Mapped[Optional[str]] = mapped_column(String(255))
    business_address_city: Mapped[Optional[str]] = mapped_column(String(100))
    business_address_state: Mapped[Optional[str]] = mapped_column(String(10))
    business_address_zip: Mapped[Optional[str]] = mapped_column(String(20))
    business_address_country: Mapped[Optional[str]] = mapped_column(String(100), default="USA")
    
    # Contact Information (JSON arrays for multiple entries)
    phone_numbers: Mapped[Optional[dict]] = mapped_column(
        JSON, 
        default=list
    )  # [{"type": "mobile", "number": "...", "primary": true}, ...]
    
    additional_emails: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String),
        default=list
    )  # Additional contact emails
    
    # Social & Marketing Links
    social_links: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict
    )  # {"linkedin": "...", "facebook": "...", "instagram": "...", "twitter": "...", "website": "..."}
    
    # Professional Info
    license_number: Mapped[Optional[str]] = mapped_column(String(100))
    license_state: Mapped[Optional[str]] = mapped_column(String(10))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    
    # ==========================================
    # Account status
    # ==========================================
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Verification
    verification_token: Mapped[Optional[str]] = mapped_column(String(255))
    verification_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Password reset
    reset_token: Mapped[Optional[str]] = mapped_column(String(255))
    reset_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relationships
    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile", 
        back_populates="user", 
        uselist=False,
        cascade="all, delete-orphan"
    )
    saved_properties: Mapped[List["SavedProperty"]] = relationship(
        "SavedProperty", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", 
        back_populates="user",
        cascade="all, delete-orphan"
    )


class UserProfile(Base):
    """
    User investment profile.
    Stores investment preferences, goals, and default assumptions.
    """
    __tablename__ = "user_profiles"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign key to user
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        unique=True,
        nullable=False
    )
    
    # Investment Experience
    investment_experience: Mapped[Optional[str]] = mapped_column(
        String(50)
    )  # beginner, intermediate, advanced, expert
    
    # Preferred Strategies (array of strategy IDs)
    preferred_strategies: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), 
        default=list
    )  # ['ltr', 'str', 'brrrr', 'flip', 'house_hack', 'wholesale']
    
    # Target Markets
    target_markets: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), 
        default=list
    )  # State codes or city names
    
    # Investment Budget
    investment_budget_min: Mapped[Optional[float]] = mapped_column(Float)
    investment_budget_max: Mapped[Optional[float]] = mapped_column(Float)
    
    # Target Returns
    target_cash_on_cash: Mapped[Optional[float]] = mapped_column(Float)  # e.g., 0.08 = 8%
    target_cap_rate: Mapped[Optional[float]] = mapped_column(Float)  # e.g., 0.06 = 6%
    
    # Risk Tolerance
    risk_tolerance: Mapped[Optional[str]] = mapped_column(
        String(20)
    )  # conservative, moderate, aggressive
    
    # Default Assumptions (JSON blob that overrides global defaults)
    default_assumptions: Mapped[Optional[dict]] = mapped_column(
        JSON, 
        default=dict
    )
    
    # UI Preferences
    notification_preferences: Mapped[Optional[dict]] = mapped_column(
        JSON, 
        default=dict
    )
    dashboard_layout: Mapped[Optional[dict]] = mapped_column(
        JSON, 
        default=dict
    )
    preferred_theme: Mapped[Optional[str]] = mapped_column(
        String(20), 
        default="system"
    )  # light, dark, system
    
    # Onboarding
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_step: Mapped[Optional[int]] = mapped_column(default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")

