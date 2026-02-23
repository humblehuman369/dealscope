"""
Billing router for subscription management and Stripe integration.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from typing import Optional, List

from app.core.deps import CurrentUser, DbSession
from app.services.billing_service import billing_service
from app.core.config import settings
from app.schemas.billing import (
    PricingPlan,
    PricingPlansResponse,
    PlanType,
    SubscriptionResponse,
    UsageResponse,
    CreateCheckoutRequest,
    CheckoutSessionResponse,
    SetupIntentResponse,
    CreateSubscriptionRequest,
    CreateSubscriptionResponse,
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

    plan_type = PlanType.STARTER
    if subscription.tier.value == "pro":
        if subscription.stripe_price_id == settings.STRIPE_PRICE_PRO_YEARLY:
            plan_type = PlanType.PRO_ANNUAL
        else:
            plan_type = PlanType.PRO_MONTHLY  # monthly or legacy Pro

    return SubscriptionResponse(
        id=str(subscription.id),
        tier=subscription.tier,
        status=subscription.status,
        plan_type=plan_type,
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
    try:
        return await billing_service.create_checkout_session(
            db,
            current_user,
            price_id=data.price_id or None,
            lookup_key=data.lookup_key or None,
            success_url=data.success_url,
            cancel_url=data.cancel_url,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Checkout session creation failed for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to payment provider. Please try again shortly.",
        )


@router.post(
    "/setup-intent",
    response_model=SetupIntentResponse,
    summary="Create SetupIntent for card collection"
)
async def create_setup_intent(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Create a Stripe SetupIntent for collecting a payment method
    during the Pro registration flow.
    
    Returns a client_secret for use with Stripe.js confirmCardSetup().
    """
    result = await billing_service.create_setup_intent(db, current_user)
    return SetupIntentResponse(client_secret=result["client_secret"])


@router.post(
    "/subscribe",
    response_model=CreateSubscriptionResponse,
    summary="Create subscription with trial"
)
async def create_subscription(
    data: CreateSubscriptionRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Create a Pro subscription with a 7-day free trial.
    
    Requires a payment_method_id from a confirmed SetupIntent.
    The payment method is attached to the customer and a subscription
    is created with trial_period_days=7.
    """
    if not data.price_id and not data.lookup_key:
        # Default to Pro monthly price from settings
        from app.core.config import settings
        data.price_id = settings.STRIPE_PRICE_PRO_MONTHLY
    
    try:
        result = await billing_service.create_subscription(
            db,
            current_user,
            payment_method_id=data.payment_method_id,
            price_id=data.price_id,
            lookup_key=data.lookup_key,
        )
        return CreateSubscriptionResponse(
            subscription_id=result["subscription_id"],
            status=result["status"],
            trial_end=result.get("trial_end"),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Subscription creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription. Please try again.",
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
    try:
        return await billing_service.create_portal_session(db, current_user)
    except Exception as e:
        logger.error(f"Portal session creation failed for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to payment provider. Please try again shortly.",
        )


# ===========================================
# Diagnostics (admin-only)
# ===========================================

@router.get(
    "/config-check",
    summary="Verify Stripe configuration (admin only)",
)
async def stripe_config_check(current_user: CurrentUser):
    """
    Validate that Stripe API key authenticates and configured price IDs
    exist. Returns mode (test/live) and flags any mismatches.
    Does NOT expose actual key values.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    result: dict = {
        "stripe_configured": billing_service.is_configured,
        "api_key_valid": False,
        "api_key_mode": None,
        "prices": {"monthly": None, "yearly": None},
        "webhook_secret_set": bool(billing_service.webhook_secret),
        "mode_mismatch": False,
        "errors": [],
    }

    if not billing_service.is_configured:
        result["errors"].append(
            "STRIPE_SECRET_KEY is empty or stripe package not installed."
        )
        return result

    try:
        import stripe
        account = stripe.Account.retrieve()
        # Test keys return a "charges_enabled" field; the key prefix is
        # the most reliable indicator of mode.
        key_prefix = (settings.STRIPE_SECRET_KEY or "")[:7]
        if key_prefix.startswith("sk_test"):
            result["api_key_mode"] = "test"
        elif key_prefix.startswith("sk_live"):
            result["api_key_mode"] = "live"
        else:
            result["api_key_mode"] = "unknown"
        result["api_key_valid"] = True
        result["account_name"] = account.get("settings", {}).get(
            "dashboard", {}
        ).get("display_name") or account.get("business_profile", {}).get("name")
    except Exception as e:
        result["errors"].append(f"API key validation failed: {e}")
        return result

    # Verify price IDs
    price_configs = {
        "monthly": settings.STRIPE_PRICE_PRO_MONTHLY,
        "yearly": settings.STRIPE_PRICE_PRO_YEARLY,
    }
    modes_seen: set = set()
    if result["api_key_mode"]:
        modes_seen.add(result["api_key_mode"])

    for label, price_id in price_configs.items():
        if not price_id:
            result["prices"][label] = {"id": None, "status": "not_configured"}
            result["errors"].append(
                f"STRIPE_PRICE_PRO_{label.upper()} is not set."
            )
            continue
        try:
            price = stripe.Price.retrieve(price_id)
            price_mode = "test" if price.get("livemode") is False else "live"
            modes_seen.add(price_mode)
            result["prices"][label] = {
                "id": price_id,
                "active": price.get("active", False),
                "mode": price_mode,
                "amount": price.get("unit_amount"),
                "currency": price.get("currency"),
                "interval": price.get("recurring", {}).get("interval")
                if price.get("recurring")
                else None,
            }
            if not price.get("active"):
                result["errors"].append(
                    f"Price {price_id} ({label}) exists but is not active."
                )
        except Exception as e:
            result["prices"][label] = {"id": price_id, "status": "error"}
            result["errors"].append(
                f"Could not retrieve price {price_id} ({label}): {e}"
            )

    if len(modes_seen) > 1:
        result["mode_mismatch"] = True
        result["errors"].append(
            f"Mode mismatch detected: {modes_seen}. "
            "All keys and prices must be from the same Stripe mode (test or live)."
        )

    return result


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
    payments, total_count = await billing_service.get_payment_history(
        db, 
        current_user.id,
        limit=limit,
        offset=offset,
    )
    
    return PaymentHistoryResponse(
        payments=payments,
        total_count=total_count,
        has_more=(offset + len(payments)) < total_count,
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
    
    # Verify webhook signature - REQUIRED for all environments
    # This prevents attackers from forging webhook events
    event = billing_service.verify_webhook_signature(payload, stripe_signature or "")
    
    if event is None:
        logger.warning("Webhook signature verification failed - rejecting request")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature. Ensure STRIPE_WEBHOOK_SECRET is configured correctly."
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

