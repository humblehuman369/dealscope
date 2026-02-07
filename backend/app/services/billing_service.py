"""
Billing service for Stripe integration.
"""

import logging
import os
from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime, timedelta, timezone
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.subscription import (
    Subscription, 
    PaymentHistory, 
    SubscriptionTier, 
    SubscriptionStatus,
    TIER_LIMITS,
)
from app.models.user import User
from app.schemas.billing import (
    PricingPlan,
    PlanFeature,
    SubscriptionResponse,
    UsageResponse,
    CheckoutSessionResponse,
    PortalSessionResponse,
    PaymentHistoryItem,
)

logger = logging.getLogger(__name__)

# Try to import stripe
try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    logger.warning("Stripe not installed. Billing functionality will be limited.")


class BillingService:
    """
    Service for managing subscriptions and billing via Stripe.
    """

    def __init__(self):
        self.api_key = os.getenv("STRIPE_SECRET_KEY")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.is_configured = bool(self.api_key and STRIPE_AVAILABLE)
        
        if self.is_configured:
            stripe.api_key = self.api_key
            logger.info("Billing service initialized with Stripe")
        else:
            logger.warning("Billing service running in dev mode (no payments)")
        
        # Define pricing plans
        self.plans = self._define_plans()

    def _define_plans(self) -> Dict[str, PricingPlan]:
        """Define pricing plans with Stripe price IDs."""
        return {
            "free": PricingPlan(
                id="free",
                name="Free",
                tier=SubscriptionTier.FREE,
                description="Perfect for getting started",
                price_monthly=0,
                price_yearly=0,
                stripe_price_id_monthly=None,
                stripe_price_id_yearly=None,
                properties_limit=5,
                searches_per_month=25,
                api_calls_per_month=100,
                features=[
                    PlanFeature(name="Property Analysis", description="Analyze up to 5 properties"),
                    PlanFeature(name="6 Investment Strategies", description="LTR, STR, BRRRR, Flip, House Hack, Wholesale"),
                    PlanFeature(name="Basic Reports", description="View analysis results"),
                    PlanFeature(name="25 Searches/month", description="Monthly property searches", limit="25/month"),
                    PlanFeature(name="Export Reports", description="Download PDF/Excel reports", included=False),
                    PlanFeature(name="API Access", description="Integrate with your tools", included=False),
                ],
            ),
            "starter": PricingPlan(
                id="starter",
                name="Starter",
                tier=SubscriptionTier.STARTER,
                description="For active investors",
                price_monthly=2900,  # $29/month
                price_yearly=29000,  # $290/year (save ~$58)
                stripe_price_id_monthly=os.getenv("STRIPE_PRICE_STARTER_MONTHLY", "price_starter_monthly"),
                stripe_price_id_yearly=os.getenv("STRIPE_PRICE_STARTER_YEARLY", "price_starter_yearly"),
                properties_limit=25,
                searches_per_month=100,
                api_calls_per_month=500,
                is_popular=True,
                features=[
                    PlanFeature(name="Everything in Free", description="All free tier features"),
                    PlanFeature(name="25 Saved Properties", description="Save and track more deals"),
                    PlanFeature(name="100 Searches/month", description="More property searches", limit="100/month"),
                    PlanFeature(name="Export Reports", description="PDF and Excel exports"),
                    PlanFeature(name="Email Alerts", description="Get notified on price changes"),
                    PlanFeature(name="Priority Support", description="Fast email support"),
                ],
            ),
            "pro": PricingPlan(
                id="pro",
                name="Pro",
                tier=SubscriptionTier.PRO,
                description="For serious investors & agents",
                price_monthly=7900,  # $79/month
                price_yearly=79000,  # $790/year (save ~$158)
                stripe_price_id_monthly=os.getenv("STRIPE_PRICE_PRO_MONTHLY", "price_pro_monthly"),
                stripe_price_id_yearly=os.getenv("STRIPE_PRICE_PRO_YEARLY", "price_pro_yearly"),
                properties_limit=100,
                searches_per_month=500,
                api_calls_per_month=2500,
                features=[
                    PlanFeature(name="Everything in Starter", description="All starter tier features"),
                    PlanFeature(name="100 Saved Properties", description="Track your entire pipeline"),
                    PlanFeature(name="500 Searches/month", description="Unlimited property analysis", limit="500/month"),
                    PlanFeature(name="API Access", description="Integrate with your tools"),
                    PlanFeature(name="Team Sharing", description="Share deals with your team"),
                    PlanFeature(name="Custom Branding", description="White-label reports"),
                    PlanFeature(name="Phone Support", description="Direct line to support"),
                ],
            ),
            "enterprise": PricingPlan(
                id="enterprise",
                name="Enterprise",
                tier=SubscriptionTier.ENTERPRISE,
                description="For teams and organizations",
                price_monthly=29900,  # $299/month
                price_yearly=299000,  # $2990/year
                stripe_price_id_monthly=os.getenv("STRIPE_PRICE_ENTERPRISE_MONTHLY", "price_enterprise_monthly"),
                stripe_price_id_yearly=os.getenv("STRIPE_PRICE_ENTERPRISE_YEARLY", "price_enterprise_yearly"),
                properties_limit=-1,  # Unlimited
                searches_per_month=-1,  # Unlimited
                api_calls_per_month=-1,  # Unlimited
                features=[
                    PlanFeature(name="Everything in Pro", description="All pro tier features"),
                    PlanFeature(name="Unlimited Properties", description="No limits on saved properties"),
                    PlanFeature(name="Unlimited Searches", description="Search as much as you need"),
                    PlanFeature(name="Unlimited API Calls", description="Full API access"),
                    PlanFeature(name="SSO Integration", description="Single sign-on support"),
                    PlanFeature(name="Dedicated Account Manager", description="Your personal contact"),
                    PlanFeature(name="Custom Integrations", description="We'll build what you need"),
                    PlanFeature(name="SLA Guarantee", description="99.9% uptime guarantee"),
                ],
            ),
        }

    def get_plans(self) -> List[PricingPlan]:
        """Get all pricing plans."""
        return list(self.plans.values())

    # ===========================================
    # Subscription Management
    # ===========================================

    async def get_or_create_subscription(
        self, 
        db: AsyncSession, 
        user_id: uuid.UUID
    ) -> Subscription:
        """Get existing subscription or create free tier."""
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            subscription = Subscription(
                user_id=user_id,
                tier=SubscriptionTier.FREE,
                status=SubscriptionStatus.ACTIVE,
                **TIER_LIMITS[SubscriptionTier.FREE],
            )
            # Remove 'features' from limits as it's not a column
            subscription.properties_limit = TIER_LIMITS[SubscriptionTier.FREE]["properties_limit"]
            subscription.searches_per_month = TIER_LIMITS[SubscriptionTier.FREE]["searches_per_month"]
            subscription.api_calls_per_month = TIER_LIMITS[SubscriptionTier.FREE]["api_calls_per_month"]
            subscription.usage_reset_date = datetime.now(timezone.utc)
            
            db.add(subscription)
            await db.commit()
            await db.refresh(subscription)
            logger.info(f"Created free subscription for user {user_id}")
        
        return subscription

    async def get_subscription(
        self, 
        db: AsyncSession, 
        user_id: uuid.UUID
    ) -> Optional[Subscription]:
        """Get user's subscription."""
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_usage(
        self, 
        db: AsyncSession, 
        user_id: uuid.UUID
    ) -> UsageResponse:
        """Get user's current usage."""
        subscription = await self.get_or_create_subscription(db, user_id)
        
        # Count saved properties using COUNT query (not loading all into memory)
        from app.models.saved_property import SavedProperty
        from sqlalchemy import func
        result = await db.execute(
            select(func.count()).select_from(SavedProperty).where(SavedProperty.user_id == user_id)
        )
        properties_count = result.scalar() or 0
        
        # Calculate remaining
        props_limit = subscription.properties_limit
        searches_limit = subscription.searches_per_month
        api_limit = subscription.api_calls_per_month
        
        # Handle unlimited (-1)
        props_remaining = -1 if props_limit == -1 else max(0, props_limit - properties_count)
        searches_remaining = -1 if searches_limit == -1 else max(0, searches_limit - subscription.searches_used)
        api_remaining = -1 if api_limit == -1 else max(0, api_limit - subscription.api_calls_used)
        
        # Days until reset
        days_until_reset = None
        if subscription.usage_reset_date:
            next_reset = subscription.usage_reset_date + timedelta(days=30)
            days_until_reset = max(0, (next_reset - datetime.now(timezone.utc)).days)
        
        return UsageResponse(
            tier=subscription.tier,
            properties_saved=properties_count,
            properties_limit=props_limit,
            properties_remaining=props_remaining,
            searches_used=subscription.searches_used,
            searches_limit=searches_limit,
            searches_remaining=searches_remaining,
            api_calls_used=subscription.api_calls_used,
            api_calls_limit=api_limit,
            api_calls_remaining=api_remaining,
            usage_reset_date=subscription.usage_reset_date,
            days_until_reset=days_until_reset,
        )

    # ===========================================
    # Stripe Integration
    # ===========================================

    async def get_or_create_stripe_customer(
        self, 
        db: AsyncSession, 
        user: User
    ) -> str:
        """Get or create Stripe customer for user."""
        subscription = await self.get_or_create_subscription(db, user.id)
        
        if subscription.stripe_customer_id:
            return subscription.stripe_customer_id
        
        if not self.is_configured:
            # Dev mode - return fake ID
            fake_id = f"cus_dev_{user.id}"
            subscription.stripe_customer_id = fake_id
            await db.commit()
            return fake_id
        
        # Create Stripe customer
        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name,
            metadata={
                "user_id": str(user.id),
            }
        )
        
        subscription.stripe_customer_id = customer.id
        await db.commit()
        
        logger.info(f"Created Stripe customer {customer.id} for user {user.id}")
        return customer.id

    async def create_checkout_session(
        self,
        db: AsyncSession,
        user: User,
        price_id: str,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
    ) -> CheckoutSessionResponse:
        """Create Stripe checkout session."""
        customer_id = await self.get_or_create_stripe_customer(db, user)
        
        success_url = success_url or f"{self.frontend_url}/billing?success=true"
        cancel_url = cancel_url or f"{self.frontend_url}/billing?canceled=true"
        
        if not self.is_configured:
            # Dev mode - return fake session
            return CheckoutSessionResponse(
                checkout_url=f"{self.frontend_url}/billing?dev=true",
                session_id="cs_dev_test_session",
            )
        
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url + "&session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            metadata={
                "user_id": str(user.id),
            },
            subscription_data={
                "metadata": {
                    "user_id": str(user.id),
                }
            },
            allow_promotion_codes=True,
        )
        
        logger.info(f"Created checkout session {session.id} for user {user.id}")
        
        return CheckoutSessionResponse(
            checkout_url=session.url,
            session_id=session.id,
        )

    async def create_portal_session(
        self,
        db: AsyncSession,
        user: User,
    ) -> PortalSessionResponse:
        """Create Stripe customer portal session."""
        customer_id = await self.get_or_create_stripe_customer(db, user)
        
        if not self.is_configured:
            return PortalSessionResponse(
                portal_url=f"{self.frontend_url}/billing?dev=portal",
            )
        
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{self.frontend_url}/billing",
        )
        
        logger.info(f"Created portal session for user {user.id}")
        
        return PortalSessionResponse(portal_url=session.url)

    async def cancel_subscription(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        cancel_immediately: bool = False,
        reason: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Cancel user's subscription."""
        subscription = await self.get_subscription(db, user_id)
        
        if not subscription or not subscription.stripe_subscription_id:
            return False, "No active subscription found"
        
        if not self.is_configured:
            # Dev mode
            subscription.cancel_at_period_end = True
            subscription.canceled_at = datetime.now(timezone.utc)
            await db.commit()
            return True, "Subscription will be canceled at period end (dev mode)"
        
        try:
            if cancel_immediately:
                stripe.Subscription.delete(subscription.stripe_subscription_id)
                subscription.status = SubscriptionStatus.CANCELED
                subscription.canceled_at = datetime.now(timezone.utc)
            else:
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True,
                    metadata={"cancellation_reason": reason} if reason else {},
                )
                subscription.cancel_at_period_end = True
            
            await db.commit()
            
            message = "Subscription canceled immediately" if cancel_immediately else "Subscription will be canceled at period end"
            logger.info(f"Canceled subscription for user {user_id}: {message}")
            return True, message
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling subscription: {e}")
            return False, str(e)

    # ===========================================
    # Webhook Handlers
    # ===========================================

    def verify_webhook_signature(self, payload: bytes, signature: str) -> Optional[Dict[str, Any]]:
        """Verify Stripe webhook signature and return event."""
        if not self.is_configured or not self.webhook_secret:
            logger.warning("Webhook verification skipped - not configured")
            return None
        
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return event
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {e}")
            return None
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            return None

    async def handle_webhook_event(
        self, 
        db: AsyncSession, 
        event: Dict[str, Any]
    ) -> bool:
        """Process Stripe webhook event."""
        event_type = event.get("type")
        data = event.get("data", {}).get("object", {})
        
        logger.info(f"Processing webhook: {event_type}")
        
        handlers = {
            "checkout.session.completed": self._handle_checkout_completed,
            "customer.subscription.created": self._handle_subscription_created,
            "customer.subscription.updated": self._handle_subscription_updated,
            "customer.subscription.deleted": self._handle_subscription_deleted,
            "invoice.paid": self._handle_invoice_paid,
            "invoice.payment_failed": self._handle_invoice_payment_failed,
        }
        
        handler = handlers.get(event_type)
        if handler:
            try:
                await handler(db, data)
                return True
            except Exception as e:
                logger.error(f"Error handling {event_type}: {e}")
                return False
        else:
            logger.debug(f"Unhandled webhook event: {event_type}")
            return True

    async def _handle_checkout_completed(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle successful checkout."""
        user_id = data.get("metadata", {}).get("user_id")
        if not user_id:
            logger.warning("Checkout completed without user_id in metadata")
            return
        
        subscription_id = data.get("subscription")
        customer_id = data.get("customer")
        
        subscription = await self.get_subscription(db, uuid.UUID(user_id))
        if subscription:
            subscription.stripe_customer_id = customer_id
            subscription.stripe_subscription_id = subscription_id
            await db.commit()
        
        logger.info(f"Checkout completed for user {user_id}")

    async def _handle_subscription_created(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle new subscription."""
        await self._sync_subscription(db, data)

    async def _handle_subscription_updated(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle subscription update."""
        await self._sync_subscription(db, data)

    async def _handle_subscription_deleted(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle subscription cancellation."""
        stripe_sub_id = data.get("id")
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            # Downgrade to free tier
            subscription.tier = SubscriptionTier.FREE
            subscription.status = SubscriptionStatus.CANCELED
            subscription.stripe_subscription_id = None
            subscription.stripe_price_id = None
            subscription.properties_limit = TIER_LIMITS[SubscriptionTier.FREE]["properties_limit"]
            subscription.searches_per_month = TIER_LIMITS[SubscriptionTier.FREE]["searches_per_month"]
            subscription.api_calls_per_month = TIER_LIMITS[SubscriptionTier.FREE]["api_calls_per_month"]
            
            await db.commit()
            logger.info(f"Subscription deleted, downgraded user {subscription.user_id} to free tier")

    async def _handle_invoice_paid(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle successful invoice payment."""
        customer_id = data.get("customer")
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_customer_id == customer_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            # Record payment
            payment = PaymentHistory(
                user_id=subscription.user_id,
                stripe_invoice_id=data.get("id"),
                stripe_payment_intent_id=data.get("payment_intent"),
                amount=data.get("amount_paid", 0),
                currency=data.get("currency", "usd"),
                status="succeeded",
                description=f"Subscription payment - {subscription.tier.value}",
                invoice_pdf_url=data.get("invoice_pdf"),
                receipt_url=data.get("hosted_invoice_url"),
            )
            db.add(payment)
            await db.commit()
            
            logger.info(f"Invoice paid for user {subscription.user_id}")

    async def _handle_invoice_payment_failed(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle failed invoice payment."""
        customer_id = data.get("customer")
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_customer_id == customer_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            subscription.status = SubscriptionStatus.PAST_DUE
            
            # Record failed payment
            payment = PaymentHistory(
                user_id=subscription.user_id,
                stripe_invoice_id=data.get("id"),
                amount=data.get("amount_due", 0),
                currency=data.get("currency", "usd"),
                status="failed",
                description="Payment failed",
            )
            db.add(payment)
            await db.commit()
            
            logger.warning(f"Payment failed for user {subscription.user_id}")

    async def _sync_subscription(self, db: AsyncSession, stripe_sub: Dict[str, Any]):
        """Sync subscription data from Stripe."""
        stripe_sub_id = stripe_sub.get("id")
        customer_id = stripe_sub.get("customer")
        user_id = stripe_sub.get("metadata", {}).get("user_id")
        
        # Find subscription by stripe_subscription_id or user_id
        subscription = None
        if stripe_sub_id:
            result = await db.execute(
                select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
            )
            subscription = result.scalar_one_or_none()
        
        if not subscription and user_id:
            result = await db.execute(
                select(Subscription).where(Subscription.user_id == uuid.UUID(user_id))
            )
            subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"Could not find subscription for stripe_sub {stripe_sub_id}")
            return
        
        # Update subscription details
        subscription.stripe_subscription_id = stripe_sub_id
        subscription.stripe_customer_id = customer_id
        
        # Map status
        status_map = {
            "active": SubscriptionStatus.ACTIVE,
            "past_due": SubscriptionStatus.PAST_DUE,
            "canceled": SubscriptionStatus.CANCELED,
            "incomplete": SubscriptionStatus.INCOMPLETE,
            "incomplete_expired": SubscriptionStatus.INCOMPLETE_EXPIRED,
            "trialing": SubscriptionStatus.TRIALING,
            "unpaid": SubscriptionStatus.UNPAID,
            "paused": SubscriptionStatus.PAUSED,
        }
        subscription.status = status_map.get(stripe_sub.get("status"), SubscriptionStatus.ACTIVE)
        
        # Update period
        if stripe_sub.get("current_period_start"):
            subscription.current_period_start = datetime.fromtimestamp(stripe_sub["current_period_start"])
        if stripe_sub.get("current_period_end"):
            subscription.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"])
        
        subscription.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)
        
        if stripe_sub.get("canceled_at"):
            subscription.canceled_at = datetime.fromtimestamp(stripe_sub["canceled_at"])
        
        # Trial
        if stripe_sub.get("trial_start"):
            subscription.trial_start = datetime.fromtimestamp(stripe_sub["trial_start"])
        if stripe_sub.get("trial_end"):
            subscription.trial_end = datetime.fromtimestamp(stripe_sub["trial_end"])
        
        # Determine tier from price
        items = stripe_sub.get("items", {}).get("data", [])
        if items:
            price_id = items[0].get("price", {}).get("id")
            subscription.stripe_price_id = price_id
            
            # Match price to tier
            for plan in self.plans.values():
                if price_id in [plan.stripe_price_id_monthly, plan.stripe_price_id_yearly]:
                    subscription.tier = plan.tier
                    subscription.properties_limit = plan.properties_limit
                    subscription.searches_per_month = plan.searches_per_month
                    subscription.api_calls_per_month = plan.api_calls_per_month
                    break
        
        await db.commit()
        logger.info(f"Synced subscription {stripe_sub_id} for user {subscription.user_id}")

    # ===========================================
    # Payment History
    # ===========================================

    async def get_payment_history(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 10,
        offset: int = 0,
    ) -> List[PaymentHistoryItem]:
        """Get user's payment history."""
        result = await db.execute(
            select(PaymentHistory)
            .where(PaymentHistory.user_id == user_id)
            .order_by(PaymentHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        payments = result.scalars().all()
        
        return [
            PaymentHistoryItem(
                id=str(p.id),
                amount=p.amount,
                currency=p.currency,
                status=p.status,
                description=p.description,
                invoice_pdf_url=p.invoice_pdf_url,
                receipt_url=p.receipt_url,
                created_at=p.created_at,
            )
            for p in payments
        ]


# Singleton instance
billing_service = BillingService()

