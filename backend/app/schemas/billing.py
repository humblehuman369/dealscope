"""
Pydantic schemas for billing and subscription management.
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class SubscriptionTier(StrEnum):
    """Subscription tier levels."""

    FREE = "free"
    PRO = "pro"


class SubscriptionStatus(StrEnum):
    """Subscription status."""

    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    TRIALING = "trialing"
    UNPAID = "unpaid"
    PAUSED = "paused"


# ===========================================
# Pricing Plans
# ===========================================


class PlanFeature(BaseModel):
    """A feature included in a plan."""

    name: str
    description: str
    included: bool = True
    limit: str | None = None  # e.g., "100/month"


class PricingPlan(BaseModel):
    """Pricing plan details."""

    id: str
    name: str
    tier: SubscriptionTier
    description: str
    price_monthly: int  # Price in cents
    price_yearly: int  # Price in cents (yearly total)
    stripe_price_id_monthly: str | None = None
    stripe_price_id_yearly: str | None = None
    features: list[PlanFeature]
    is_popular: bool = False
    properties_limit: int
    searches_per_month: int
    api_calls_per_month: int


class PricingPlansResponse(BaseModel):
    """Response with all pricing plans."""

    plans: list[PricingPlan]


# ===========================================
# Subscription Management
# ===========================================


class PlanType(StrEnum):
    """Billing interval for Pro (for display only)."""

    STARTER = "starter"
    PRO_MONTHLY = "pro_monthly"
    PRO_ANNUAL = "pro_annual"


class SubscriptionResponse(BaseModel):
    """Current subscription details."""

    id: str
    tier: SubscriptionTier
    status: SubscriptionStatus
    plan_type: PlanType | None = None  # starter | pro_monthly | pro_annual
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    canceled_at: datetime | None = None
    trial_start: datetime | None = None
    trial_end: datetime | None = None

    # Limits
    properties_limit: int
    searches_per_month: int
    api_calls_per_month: int

    # Usage
    searches_used: int
    api_calls_used: int
    usage_reset_date: datetime | None = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UsageResponse(BaseModel):
    """Current usage statistics."""

    tier: SubscriptionTier

    # Properties
    properties_saved: int
    properties_limit: int
    properties_remaining: int

    # Searches
    searches_used: int
    searches_limit: int
    searches_remaining: int

    # API calls
    api_calls_used: int
    api_calls_limit: int
    api_calls_remaining: int

    # Reset info
    usage_reset_date: datetime | None = None
    days_until_reset: int | None = None


# ===========================================
# Checkout & Portal
# ===========================================


class CreateCheckoutRequest(BaseModel):
    """Request to create a Stripe checkout session."""

    price_id: str | None = Field(None, description="Stripe price ID (provide this or lookup_key)")
    lookup_key: str | None = Field(None, description="Stripe price lookup key (alternative to price_id)")
    success_url: str | None = Field(None, description="URL to redirect after success")
    cancel_url: str | None = Field(None, description="URL to redirect after cancel")


class CheckoutSessionResponse(BaseModel):
    """Stripe checkout session response."""

    checkout_url: str
    session_id: str


class SetupIntentResponse(BaseModel):
    """Stripe SetupIntent client secret for embedded card collection."""

    client_secret: str


class CreateSubscriptionRequest(BaseModel):
    """Request to create a subscription after collecting payment method."""

    payment_method_id: str = Field(..., description="Stripe PaymentMethod ID from confirmed SetupIntent")
    price_id: str | None = Field(None, description="Stripe price ID")
    lookup_key: str | None = Field(None, description="Stripe price lookup key")


class CreateSubscriptionResponse(BaseModel):
    """Response after subscription creation."""

    subscription_id: str
    status: str
    trial_end: datetime | None = None


class PortalSessionResponse(BaseModel):
    """Stripe customer portal session response."""

    portal_url: str


class CancelSubscriptionRequest(BaseModel):
    """Request to cancel subscription."""

    cancel_immediately: bool = Field(False, description="Cancel immediately vs at period end")
    reason: str | None = Field(None, description="Cancellation reason")


class CancelSubscriptionResponse(BaseModel):
    """Response after cancellation."""

    success: bool
    message: str
    cancel_at_period_end: bool
    current_period_end: datetime | None = None


# ===========================================
# Payment History
# ===========================================


class PaymentHistoryItem(BaseModel):
    """Single payment history item."""

    id: str
    amount: int  # In cents
    currency: str
    status: str
    description: str | None = None
    invoice_pdf_url: str | None = None
    receipt_url: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentHistoryResponse(BaseModel):
    """Payment history list response."""

    payments: list[PaymentHistoryItem]
    total_count: int
    has_more: bool


# ===========================================
# Webhooks
# ===========================================


class WebhookEventResponse(BaseModel):
    """Response to webhook events."""

    received: bool = True
    event_type: str | None = None
    message: str | None = None
