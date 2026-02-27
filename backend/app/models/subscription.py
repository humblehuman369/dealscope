"""
Subscription and billing models for Stripe integration.
"""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class SubscriptionTier(enum.StrEnum):
    """Subscription tier levels."""

    FREE = "free"
    PRO = "pro"


class SubscriptionStatus(enum.StrEnum):
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

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    # Stripe IDs
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    stripe_price_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Subscription details
    tier: Mapped[SubscriptionTier] = mapped_column(SQLEnum(SubscriptionTier), default=SubscriptionTier.FREE)
    status: Mapped[SubscriptionStatus] = mapped_column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)

    # Billing period
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Trial
    trial_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trial_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Usage limits based on tier (defaults match TIER_LIMITS[FREE])
    properties_limit: Mapped[int] = mapped_column(Integer, default=10)  # Starter: 10
    searches_per_month: Mapped[int] = mapped_column(Integer, default=5)  # Starter: 5 analyses/mo
    api_calls_per_month: Mapped[int] = mapped_column(Integer, default=50)  # Starter: 50

    # Usage tracking (reset monthly)
    properties_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    searches_used: Mapped[int] = mapped_column(Integer, default=0)
    api_calls_used: Mapped[int] = mapped_column(Integer, default=0)
    usage_reset_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Extra data from Stripe
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    # Relationship
    user: Mapped[User] = relationship("User", back_populates="subscription")

    def is_active(self) -> bool:
        """Check if subscription is active."""
        return self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]

    def is_premium(self) -> bool:
        """Check if user has a paid subscription."""
        return self.tier == SubscriptionTier.PRO

    def can_save_property(self, current_count: int | None = None) -> bool:
        """Check if user can save another property.

        Uses the denormalized ``properties_count`` column by default.
        ``current_count`` is accepted for backward compatibility but
        ignored when the column is populated.
        """
        if self.properties_limit == -1:
            return True
        count = self.properties_count if current_count is None else current_count
        return count < self.properties_limit

    def can_search(self) -> bool:
        """Check if user has searches remaining."""
        if self.searches_per_month == -1:
            return True
        return self.searches_used < self.searches_per_month

    def increment_search(self) -> None:
        """Increment search counter."""
        self.searches_used += 1

    def reset_usage(self) -> None:
        """Reset monthly usage counters."""
        self.searches_used = 0
        self.api_calls_used = 0
        self.usage_reset_date = datetime.now(UTC)


class PaymentHistory(Base):
    """
    Record of payment events from Stripe webhooks.
    """

    __tablename__ = "payment_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Stripe IDs
    stripe_invoice_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_charge_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Payment details
    amount: Mapped[int] = mapped_column(Integer)  # Amount in cents
    currency: Mapped[str] = mapped_column(String(3), default="usd")
    status: Mapped[str] = mapped_column(String(50))  # succeeded, failed, pending, refunded
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Invoice details
    invoice_pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    receipt_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Extra data from Stripe
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Relationship
    user: Mapped[User] = relationship("User", back_populates="payment_history")


# Tier configurations for easy reference
TIER_LIMITS = {
    SubscriptionTier.FREE: {
        "properties_limit": 10,
        "searches_per_month": 5,
        "api_calls_per_month": 50,
        "features": ["basic_analysis", "save_properties", "iq_verdict", "strategy_snapshots", "seller_motivation"],
    },
    SubscriptionTier.PRO: {
        "properties_limit": -1,  # Unlimited
        "searches_per_month": -1,  # Unlimited
        "api_calls_per_month": -1,  # Unlimited
        "features": [
            "basic_analysis",
            "save_properties",
            "iq_verdict",
            "strategy_snapshots",
            "seller_motivation",
            "full_breakdown",
            "editable_inputs",
            "rental_comps",
            "excel_proforma",
            "dealvault_pipeline",
            "pdf_reports",
            "deal_comparison",
        ],
    },
}
