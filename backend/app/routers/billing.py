"""
Billing router for subscription management and Stripe integration.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from typing import Optional, List

from app.core.deps import CurrentUser, DbSession
from app.services.billing_service import billing_service
from app.schemas.billing import (
    PricingPlan,
    PricingPlansResponse,
    SubscriptionResponse,
    UsageResponse,
    CreateCheckoutRequest,
    CheckoutSessionResponse,
    PortalSessionResponse,
    CancelSubscriptionRequest,
    CancelSubscriptionResponse,
    PaymentHistoryItem,
    PaymentHistoryResponse,
    WebhookEventResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/billing", tags=["Billing"])


# ===========================================
# Public Endpoints
# ===========================================

@router.get(
    "/plans",
    response_model=PricingPlansResponse,
    summary="Get pricing plans"
)
async def get_pricing_plans():
    """
    Get all available pricing plans.
    
    This endpoint is public and doesn't require authentication.
    """
    plans = billing_service.get_plans()
    return PricingPlansResponse(plans=plans)


# ===========================================
# Subscription Management
# ===========================================

@router.get(
    "/subscription",
    response_model=SubscriptionResponse,
    summary="Get current subscription"
)
async def get_subscription(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Get the current user's subscription details.
    
    Returns subscription tier, status, limits, and billing period information.
    """
    subscription = await billing_service.get_or_create_subscription(db, current_user.id)
    
    return SubscriptionResponse(
        id=str(subscription.id),
        tier=subscription.tier,
        status=subscription.status,
        stripe_customer_id=subscription.stripe_customer_id,
        stripe_subscription_id=subscription.stripe_subscription_id,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        canceled_at=subscription.canceled_at,
        trial_start=subscription.trial_start,
        trial_end=subscription.trial_end,
        properties_limit=subscription.properties_limit,
        searches_per_month=subscription.searches_per_month,
        api_calls_per_month=subscription.api_calls_per_month,
        searches_used=subscription.searches_used,
        api_calls_used=subscription.api_calls_used,
        usage_reset_date=subscription.usage_reset_date,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at,
    )


@router.get(
    "/usage",
    response_model=UsageResponse,
    summary="Get current usage"
)
async def get_usage(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Get the current user's usage statistics.
    
    Returns:
    - Properties saved vs limit
    - Searches used vs limit
    - API calls used vs limit
    - Days until usage reset
    """
    return await billing_service.get_usage(db, current_user.id)


@router.post(
    "/subscription/cancel",
    response_model=CancelSubscriptionResponse,
    summary="Cancel subscription"
)
async def cancel_subscription(
    data: CancelSubscriptionRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Cancel the current subscription.
    
    By default, the subscription will be canceled at the end of the current
    billing period. Set `cancel_immediately` to true to cancel right away.
    """
    success, message = await billing_service.cancel_subscription(
        db,
        current_user.id,
        cancel_immediately=data.cancel_immediately,
        reason=data.reason,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    subscription = await billing_service.get_subscription(db, current_user.id)
    
    return CancelSubscriptionResponse(
        success=True,
        message=message,
        cancel_at_period_end=subscription.cancel_at_period_end if subscription else False,
        current_period_end=subscription.current_period_end if subscription else None,
    )


# ===========================================
# Stripe Checkout & Portal
# ===========================================

@router.post(
    "/checkout",
    response_model=CheckoutSessionResponse,
    summary="Create checkout session"
)
async def create_checkout_session(
    data: CreateCheckoutRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Create a Stripe checkout session for subscription upgrade.
    
    Returns a URL to redirect the user to Stripe's hosted checkout page.
    """
    return await billing_service.create_checkout_session(
        db,
        current_user,
        price_id=data.price_id,
        success_url=data.success_url,
        cancel_url=data.cancel_url,
    )


@router.post(
    "/portal",
    response_model=PortalSessionResponse,
    summary="Create customer portal session"
)
async def create_portal_session(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Create a Stripe customer portal session.
    
    The portal allows users to:
    - Update payment methods
    - View invoices
    - Cancel subscription
    - Change plan
    """
    return await billing_service.create_portal_session(db, current_user)


# ===========================================
# Payment History
# ===========================================

@router.get(
    "/payments",
    response_model=PaymentHistoryResponse,
    summary="Get payment history"
)
async def get_payment_history(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = 10,
    offset: int = 0
):
    """
    Get the user's payment history.
    
    Returns a list of past payments with invoice links.
    """
    payments = await billing_service.get_payment_history(
        db, 
        current_user.id,
        limit=limit,
        offset=offset,
    )
    
    return PaymentHistoryResponse(
        payments=payments,
        total_count=len(payments),
        has_more=len(payments) == limit,
    )


# ===========================================
# Webhooks
# ===========================================

@router.post(
    "/webhook",
    response_model=WebhookEventResponse,
    summary="Stripe webhook handler"
)
async def stripe_webhook(
    request: Request,
    db: DbSession,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
):
    """
    Handle Stripe webhook events.
    
    This endpoint receives events from Stripe when:
    - Subscription is created, updated, or canceled
    - Payment succeeds or fails
    - Invoice is paid
    
    **Note**: This endpoint should be configured in your Stripe dashboard.
    """
    payload = await request.body()
    
    # Verify signature
    event = billing_service.verify_webhook_signature(payload, stripe_signature or "")
    
    if event is None:
        # In dev mode, try to parse payload directly
        import json
        try:
            event = json.loads(payload)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook payload"
            )
    
    # Handle the event
    success = await billing_service.handle_webhook_event(db, event)
    
    if not success:
        logger.error(f"Failed to handle webhook event: {event.get('type')}")
    
    return WebhookEventResponse(
        received=True,
        event_type=event.get("type"),
        message="Webhook processed" if success else "Webhook processing failed",
    )

