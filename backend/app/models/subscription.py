"""
Subscription and billing models for Stripe integration.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional, List
import uuid
from datetime import datetime
import enum

from app.db.base import Base


class SubscriptionTier(str, enum.Enum):
    """Subscription tier levels."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    """Stripe subscription status."""
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    TRIALING = "trialing"
    UNPAID = "unpaid"
    PAUSED = "paused"


class Subscription(Base):
    """
    User subscription record linked to Stripe.
    """
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        unique=True,
        index=True
    )
    
    # Stripe IDs
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    stripe_price_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Subscription details
    tier: Mapped[SubscriptionTier] = mapped_column(
        SQLEnum(SubscriptionTier), 
        default=SubscriptionTier.FREE
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        SQLEnum(SubscriptionStatus), 
        default=SubscriptionStatus.ACTIVE
    )
    
    # Billing period
    current_period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    canceled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Trial
    trial_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    trial_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Usage limits based on tier
    properties_limit: Mapped[int] = mapped_column(Integer, default=5)  # Free tier: 5
    searches_per_month: Mapped[int] = mapped_column(Integer, default=25)  # Free tier: 25
    api_calls_per_month: Mapped[int] = mapped_column(Integer, default=100)  # Free tier: 100
    
    # Usage tracking (reset monthly)
    searches_used: Mapped[int] = mapped_column(Integer, default=0)
    api_calls_used: Mapped[int] = mapped_column(Integer, default=0)
    usage_reset_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="subscription")

    def is_active(self) -> bool:
        """Check if subscription is active."""
        return self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
    
    def is_premium(self) -> bool:
        """Check if user has a paid subscription."""
        return self.tier in [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE]
    
    def can_save_property(self, current_count: int) -> bool:
        """Check if user can save another property."""
        return current_count < self.properties_limit
    
    def can_search(self) -> bool:
        """Check if user has searches remaining."""
        return self.searches_used < self.searches_per_month
    
    def increment_search(self) -> None:
        """Increment search counter."""
        self.searches_used += 1
    
    def reset_usage(self) -> None:
        """Reset monthly usage counters."""
        self.searches_used = 0
        self.api_calls_used = 0
        self.usage_reset_date = datetime.utcnow()


class PaymentHistory(Base):
    """
    Record of payment events from Stripe webhooks.
    """
    __tablename__ = "payment_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True
    )
    
    # Stripe IDs
    stripe_invoice_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Payment details
    amount: Mapped[int] = mapped_column(Integer)  # Amount in cents
    currency: Mapped[str] = mapped_column(String(3), default="usd")
    status: Mapped[str] = mapped_column(String(50))  # succeeded, failed, pending, refunded
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Invoice details
    invoice_pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Metadata
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="payment_history")


# Tier configurations for easy reference
TIER_LIMITS = {
    SubscriptionTier.FREE: {
        "properties_limit": 5,
        "searches_per_month": 25,
        "api_calls_per_month": 100,
        "features": ["basic_analysis", "save_properties"],
    },
    SubscriptionTier.STARTER: {
        "properties_limit": 25,
        "searches_per_month": 100,
        "api_calls_per_month": 500,
        "features": ["basic_analysis", "save_properties", "export_reports", "email_alerts"],
    },
    SubscriptionTier.PRO: {
        "properties_limit": 100,
        "searches_per_month": 500,
        "api_calls_per_month": 2500,
        "features": ["basic_analysis", "save_properties", "export_reports", "email_alerts", "api_access", "priority_support"],
    },
    SubscriptionTier.ENTERPRISE: {
        "properties_limit": -1,  # Unlimited
        "searches_per_month": -1,  # Unlimited
        "api_calls_per_month": -1,  # Unlimited
        "features": ["basic_analysis", "save_properties", "export_reports", "email_alerts", "api_access", "priority_support", "white_label", "dedicated_support"],
    },
}

