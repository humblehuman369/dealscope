"""
Pydantic schemas for billing and subscription management.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SubscriptionTier(str, Enum):
    """Subscription tier levels."""
    FREE = "free"
    PRO = "pro"


class SubscriptionStatus(str, Enum):
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
    limit: Optional[str] = None  # e.g., "100/month"


class PricingPlan(BaseModel):
    """Pricing plan details."""
    id: str
    name: str
    tier: SubscriptionTier
    description: str
    price_monthly: int  # Price in cents
    price_yearly: int  # Price in cents (yearly total)
    stripe_price_id_monthly: Optional[str] = None
    stripe_price_id_yearly: Optional[str] = None
    features: List[PlanFeature]
    is_popular: bool = False
    properties_limit: int
    searches_per_month: int
    api_calls_per_month: int


class PricingPlansResponse(BaseModel):
    """Response with all pricing plans."""
    plans: List[PricingPlan]


# ===========================================
# Subscription Management
# ===========================================

class SubscriptionResponse(BaseModel):
    """Current subscription details."""
    id: str
    tier: SubscriptionTier
    status: SubscriptionStatus
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    
    # Limits
    properties_limit: int
    searches_per_month: int
    api_calls_per_month: int
    
    # Usage
    searches_used: int
    api_calls_used: int
    usage_reset_date: Optional[datetime] = None
    
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
    usage_reset_date: Optional[datetime] = None
    days_until_reset: Optional[int] = None


# ===========================================
# Checkout & Portal
# ===========================================

class CreateCheckoutRequest(BaseModel):
    """Request to create a Stripe checkout session."""
    price_id: Optional[str] = Field(None, description="Stripe price ID (provide this or lookup_key)")
    lookup_key: Optional[str] = Field(None, description="Stripe price lookup key (alternative to price_id)")
    success_url: Optional[str] = Field(None, description="URL to redirect after success")
    cancel_url: Optional[str] = Field(None, description="URL to redirect after cancel")


class CheckoutSessionResponse(BaseModel):
    """Stripe checkout session response."""
    checkout_url: str
    session_id: str


class PortalSessionResponse(BaseModel):
    """Stripe customer portal session response."""
    portal_url: str


class CancelSubscriptionRequest(BaseModel):
    """Request to cancel subscription."""
    cancel_immediately: bool = Field(False, description="Cancel immediately vs at period end")
    reason: Optional[str] = Field(None, description="Cancellation reason")


class CancelSubscriptionResponse(BaseModel):
    """Response after cancellation."""
    success: bool
    message: str
    cancel_at_period_end: bool
    current_period_end: Optional[datetime] = None


# ===========================================
# Payment History
# ===========================================

class PaymentHistoryItem(BaseModel):
    """Single payment history item."""
    id: str
    amount: int  # In cents
    currency: str
    status: str
    description: Optional[str] = None
    invoice_pdf_url: Optional[str] = None
    receipt_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentHistoryResponse(BaseModel):
    """Payment history list response."""
    payments: List[PaymentHistoryItem]
    total_count: int
    has_more: bool


# ===========================================
# Webhooks
# ===========================================

class WebhookEventResponse(BaseModel):
    """Response to webhook events."""
    received: bool = True
    event_type: Optional[str] = None
    message: Optional[str] = None

