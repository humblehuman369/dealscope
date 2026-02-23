"""
Billing service for Stripe integration.
"""

import logging
from typing import Optional, Dict, Any, Tuple, List, Union
from datetime import datetime, timedelta, timezone
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
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
from app.services.email_service import email_service

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
        self.api_key = settings.STRIPE_SECRET_KEY or None
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET or None
        self.frontend_url = settings.FRONTEND_URL
        self.is_configured = bool(self.api_key and STRIPE_AVAILABLE)
        
        if self.is_configured:
            stripe.api_key = self.api_key
            if not self.webhook_secret:
                logger.error(
                    "STRIPE_SECRET_KEY is configured but STRIPE_WEBHOOK_SECRET is "
                    "empty — webhook events will NOT be verified. Set "
                    "STRIPE_WEBHOOK_SECRET to enable signature verification."
                )
            logger.info("Billing service initialized with Stripe")
        else:
            logger.warning("Billing service running in dev mode (no payments)")
        
        # Define pricing plans
        self.plans = self._define_plans()

    def _define_plans(self) -> Dict[str, PricingPlan]:
        """Define pricing plans aligned to 2-tier model: Starter (Free) + Pro ($29/mo)."""
        return {
            "free": PricingPlan(
                id="free",
                name="Starter",
                tier=SubscriptionTier.FREE,
                description="Always free. No credit card required.",
                price_monthly=0,
                price_yearly=0,
                stripe_price_id_monthly=None,
                stripe_price_id_yearly=None,
                properties_limit=10,
                searches_per_month=5,
                api_calls_per_month=50,
                features=[
                    PlanFeature(name="5 Property Analyses/month", description="Analyze up to 5 properties per month", limit="5/month"),
                    PlanFeature(name="Deal Gap + Income Value + Target Buy", description="Core pricing metrics for every property"),
                    PlanFeature(name="IQ Verdict Score", description="Pass / Marginal / Buy verdict"),
                    PlanFeature(name="All 6 Strategy Snapshots", description="LTR, STR, BRRRR, Flip, House Hack, Wholesale"),
                    PlanFeature(name="Seller Motivation Indicator", description="Gauge negotiation likelihood"),
                    PlanFeature(name="Full Calculation Breakdown", description="See every assumption behind the numbers", included=False),
                    PlanFeature(name="Editable Inputs & Stress Testing", description="Change rent, vacancy, rates — recalculate instantly", included=False),
                    PlanFeature(name="Comparable Rental Data Sources", description="See the 12+ comps that set your rent estimate", included=False),
                    PlanFeature(name="Downloadable Excel Proforma", description="Export financial proformas", included=False),
                    PlanFeature(name="DealVaultIQ Pipeline & Tracking", description="Save and manage your deal pipeline", included=False),
                    PlanFeature(name="Lender-Ready PDF Reports", description="Professional reports for partners and lenders", included=False),
                    PlanFeature(name="Side-by-Side Deal Comparison", description="Compare multiple properties", included=False),
                ],
            ),
            "pro": PricingPlan(
                id="pro",
                name="Pro Investor",
                tier=SubscriptionTier.PRO,
                description="For investors who verify the math before they make the offer.",
                price_monthly=3900,  # $39/month (monthly billing)
                price_yearly=34800,  # $348/year ($29/mo billed annually)
                stripe_price_id_monthly=settings.STRIPE_PRICE_PRO_MONTHLY,
                stripe_price_id_yearly=settings.STRIPE_PRICE_PRO_YEARLY,
                properties_limit=-1,  # Unlimited
                searches_per_month=-1,  # Unlimited
                api_calls_per_month=-1,  # Unlimited
                is_popular=True,
                features=[
                    PlanFeature(name="Unlimited Property Analyses", description="Analyze as many properties as you want"),
                    PlanFeature(name="Deal Gap + Income Value + Target Buy", description="Core pricing metrics for every property"),
                    PlanFeature(name="IQ Verdict Score", description="Pass / Marginal / Buy verdict"),
                    PlanFeature(name="All 6 Strategy Models — Full Detail", description="Complete strategy analysis"),
                    PlanFeature(name="Seller Motivation Indicator", description="Gauge negotiation likelihood"),
                    PlanFeature(name="Full Calculation Breakdown", description="See every assumption: rent, vacancy, capex, taxes, insurance"),
                    PlanFeature(name="Editable Inputs & Stress Testing", description="Change any variable — Deal Gap recalculates in real time"),
                    PlanFeature(name="Comparable Rental Data Sources", description="See the comps that drive the rent estimate"),
                    PlanFeature(name="Downloadable Excel Proforma", description="Instant financial proforma — modify assumptions, share with lenders"),
                    PlanFeature(name="DealVaultIQ Pipeline & Tracking", description="Save and manage your deal pipeline"),
                    PlanFeature(name="Lender-Ready PDF Reports", description="Professional reports for partners and lenders"),
                    PlanFeature(name="Side-by-Side Deal Comparison", description="Compare multiple properties"),
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
            free_limits = TIER_LIMITS[SubscriptionTier.FREE]
            subscription = Subscription(
                user_id=user_id,
                tier=SubscriptionTier.FREE,
                status=SubscriptionStatus.ACTIVE,
                properties_limit=free_limits["properties_limit"],
                searches_per_month=free_limits["searches_per_month"],
                api_calls_per_month=free_limits["api_calls_per_month"],
                usage_reset_date=datetime.now(timezone.utc),
            )
            
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
        """Get user's current usage. Lazily resets counters if 30+ days since last reset."""
        subscription = await self.get_or_create_subscription(db, user_id)
        
        # Lazy usage reset: if 30+ days since last reset, zero the counters
        if subscription.usage_reset_date:
            days_since_reset = (datetime.now(timezone.utc) - subscription.usage_reset_date).days
            if days_since_reset >= 30:
                subscription.reset_usage()
                await db.commit()
                await db.refresh(subscription)
                logger.info(f"Auto-reset usage for user {user_id} ({days_since_reset} days since last reset)")
        
        properties_count = subscription.properties_count
        
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
        price_id: Optional[str] = None,
        lookup_key: Optional[str] = None,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
    ) -> CheckoutSessionResponse:
        """Create Stripe checkout session with 7-day trial.
        
        Accepts either a price_id or a lookup_key to resolve the price.
        """
        customer_id = await self.get_or_create_stripe_customer(db, user)
        
        success_url = success_url or f"{self.frontend_url}/register?success=true"
        cancel_url = cancel_url or f"{self.frontend_url}/register?canceled=true"
        
        if not self.is_configured:
            return CheckoutSessionResponse(
                checkout_url=f"{self.frontend_url}/register?dev=true",
                session_id="cs_dev_test_session",
            )
        
        # Resolve price — explicit price_id > lookup_key > default Pro monthly
        resolved_price_id = price_id
        if lookup_key and not price_id:
            prices = stripe.Price.list(
                lookup_keys=[lookup_key],
                expand=["data.product"],
            )
            if not prices.data:
                raise ValueError(f"No price found for lookup_key: {lookup_key}")
            resolved_price_id = prices.data[0].id
        
        if not resolved_price_id:
            resolved_price_id = settings.STRIPE_PRICE_PRO_MONTHLY
        if not resolved_price_id:
            raise ValueError(
                "No Stripe price configured. Set STRIPE_PRICE_PRO_MONTHLY in environment."
            )
        
        sep = "&" if "?" in success_url else "?"
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": resolved_price_id, "quantity": 1}],
            success_url=success_url + sep + "session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            metadata={
                "user_id": str(user.id),
            },
            subscription_data={
                "trial_period_days": 7,
                "metadata": {
                    "user_id": str(user.id),
                },
            },
            allow_promotion_codes=True,
        )
        
        logger.info(f"Created checkout session {session.id} for user {user.id} (7-day trial)")
        
        return CheckoutSessionResponse(
            checkout_url=session.url,
            session_id=session.id,
        )

    async def create_setup_intent(
        self,
        db: AsyncSession,
        user: User,
    ) -> Dict[str, str]:
        """Create a Stripe SetupIntent for embedded card collection."""
        customer_id = await self.get_or_create_stripe_customer(db, user)
        
        if not self.is_configured:
            return {"client_secret": "seti_dev_secret_placeholder"}
        
        intent = stripe.SetupIntent.create(
            customer=customer_id,
            metadata={"user_id": str(user.id)},
        )
        
        logger.info(f"Created SetupIntent {intent.id} for user {user.id}")
        return {"client_secret": intent.client_secret}

    async def create_subscription(
        self,
        db: AsyncSession,
        user: User,
        payment_method_id: str,
        price_id: Optional[str] = None,
        lookup_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Attach payment method and create subscription with 7-day trial."""
        # Guard: prevent duplicate subscriptions
        existing = await self.get_subscription(db, user.id)
        if existing and existing.is_premium() and existing.is_active():
            raise ValueError("User already has an active Pro subscription")
        
        customer_id = await self.get_or_create_stripe_customer(db, user)
        
        if not self.is_configured:
            return {
                "subscription_id": "sub_dev_test",
                "status": "trialing",
                "trial_end": None,
            }
        
        # Attach payment method to customer and set as default
        stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )
        
        # Resolve price
        resolved_price_id = price_id
        if lookup_key and not price_id:
            prices = stripe.Price.list(
                lookup_keys=[lookup_key],
                expand=["data.product"],
            )
            if not prices.data:
                raise ValueError(f"No price found for lookup_key: {lookup_key}")
            resolved_price_id = prices.data[0].id
        
        if not resolved_price_id:
            # Fall back to the Pro monthly price from env
            resolved_price_id = settings.STRIPE_PRICE_PRO_MONTHLY
            if not resolved_price_id:
                raise ValueError("No price_id, lookup_key, or STRIPE_PRICE_PRO_MONTHLY configured")
        
        # Create subscription with 7-day trial
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": resolved_price_id}],
            trial_period_days=7,
            metadata={"user_id": str(user.id)},
        )
        
        logger.info(
            f"Created subscription {subscription.id} for user {user.id} "
            f"(status={subscription.status}, trial_end={subscription.trial_end})"
        )
        
        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "trial_end": subscription.trial_end,
        }

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

    async def _get_user_for_email(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        """Look up user by ID for sending transactional emails."""
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Failed to look up user {user_id} for email: {e}")
            return None

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
        """Process Stripe webhook event (idempotent — skips duplicate event IDs)."""
        event_id = event.get("id")
        event_type = event.get("type")
        data = event.get("data", {}).get("object", {})
        
        # Idempotency: skip if we've already processed this exact event.
        # For invoice events we check by stripe_invoice_id; for all events
        # we log the event_id so replays are harmless.
        if event_id and event_type == "invoice.paid":
            invoice_id = data.get("id")
            if invoice_id:
                existing = await db.execute(
                    select(PaymentHistory).where(PaymentHistory.stripe_invoice_id == invoice_id)
                )
                if existing.scalar_one_or_none():
                    logger.info(f"Skipping duplicate webhook event {event_id} (invoice {invoice_id} already recorded)")
                    return True
        
        logger.info(f"Processing webhook: {event_type} (event_id={event_id})")
        
        handlers = {
            "checkout.session.completed": self._handle_checkout_completed,
            "customer.subscription.created": self._handle_subscription_created,
            "customer.subscription.updated": self._handle_subscription_updated,
            "customer.subscription.deleted": self._handle_subscription_deleted,
            "customer.subscription.trial_will_end": self._handle_trial_will_end,
            "invoice.paid": self._handle_invoice_paid,
            "invoice.payment_failed": self._handle_invoice_payment_failed,
            "entitlements.active_entitlement_summary.updated": self._handle_entitlement_updated,
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
        """Handle successful checkout. Sync subscription from Stripe so user is Pro when they land on success page."""
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

        if subscription_id and self.is_configured and STRIPE_AVAILABLE:
            try:
                stripe_sub = stripe.Subscription.retrieve(
                    subscription_id,
                    expand=["items.data.price"],
                )
                await self._sync_subscription(db, stripe_sub)
            except Exception as e:
                logger.warning("Could not sync subscription after checkout: %s", e)

        logger.info(f"Checkout completed for user {user_id}")

    async def _handle_subscription_created(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle new subscription — sync state and send Pro welcome email."""
        await self._sync_subscription(db, data)
        
        user_id = data.get("metadata", {}).get("user_id")
        if user_id:
            user = await self._get_user_for_email(db, uuid.UUID(user_id))
            if user:
                trial_end_str = None
                if data.get("trial_end"):
                    trial_end_dt = datetime.fromtimestamp(data["trial_end"], tz=timezone.utc)
                    trial_end_str = trial_end_dt.strftime("%B %d, %Y")
                await email_service.send_pro_welcome_email(
                    to=user.email,
                    user_name=user.full_name or "",
                    trial_end_date=trial_end_str,
                )

    async def _handle_subscription_updated(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle subscription update."""
        await self._sync_subscription(db, data)

    async def _handle_subscription_deleted(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle subscription cancellation — downgrade and notify user."""
        stripe_sub_id = data.get("id")
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            user_id = subscription.user_id
            
            subscription.tier = SubscriptionTier.FREE
            subscription.status = SubscriptionStatus.CANCELED
            subscription.stripe_subscription_id = None
            subscription.stripe_price_id = None
            subscription.properties_limit = TIER_LIMITS[SubscriptionTier.FREE]["properties_limit"]
            subscription.searches_per_month = TIER_LIMITS[SubscriptionTier.FREE]["searches_per_month"]
            subscription.api_calls_per_month = TIER_LIMITS[SubscriptionTier.FREE]["api_calls_per_month"]
            
            await db.commit()
            logger.info(f"Subscription deleted, downgraded user {user_id} to free tier")
            
            user = await self._get_user_for_email(db, user_id)
            if user:
                await email_service.send_subscription_canceled_email(
                    to=user.email,
                    user_name=user.full_name or "",
                )

    async def _handle_trial_will_end(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle subscription trial ending soon (fires 3 days before trial end)."""
        stripe_sub_id = data.get("id")
        logger.info(f"Subscription trial will end: {stripe_sub_id}")
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            trial_end_str = "soon"
            if data.get("trial_end"):
                trial_end_dt = datetime.fromtimestamp(data["trial_end"], tz=timezone.utc)
                trial_end_str = trial_end_dt.strftime("%B %d, %Y")
            
            user = await self._get_user_for_email(db, subscription.user_id)
            if user:
                await email_service.send_trial_ending_email(
                    to=user.email,
                    user_name=user.full_name or "",
                    trial_end_date=trial_end_str,
                )

    async def _handle_entitlement_updated(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle active entitlement summary update."""
        logger.info(f"Entitlement summary updated: {data.get('id', 'unknown')}")
        # Logged for future entitlement-based feature gating

    async def _handle_invoice_paid(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle successful invoice payment — record and send receipt."""
        customer_id = data.get("customer")
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_customer_id == customer_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            amount_paid = data.get("amount_paid", 0)
            currency = data.get("currency", "usd")
            description = f"Subscription payment - {subscription.tier.value}"
            receipt_url = data.get("hosted_invoice_url")
            invoice_pdf_url = data.get("invoice_pdf")
            
            payment = PaymentHistory(
                user_id=subscription.user_id,
                stripe_invoice_id=data.get("id"),
                stripe_payment_intent_id=data.get("payment_intent"),
                amount=amount_paid,
                currency=currency,
                status="succeeded",
                description=description,
                invoice_pdf_url=invoice_pdf_url,
                receipt_url=receipt_url,
            )
            db.add(payment)
            await db.commit()
            
            logger.info(f"Invoice paid for user {subscription.user_id}")
            
            if amount_paid > 0:
                user = await self._get_user_for_email(db, subscription.user_id)
                if user:
                    await email_service.send_payment_receipt_email(
                        to=user.email,
                        user_name=user.full_name or "",
                        amount_cents=amount_paid,
                        currency=currency,
                        description=description,
                        receipt_url=receipt_url,
                        invoice_pdf_url=invoice_pdf_url,
                    )

    async def _handle_invoice_payment_failed(self, db: AsyncSession, data: Dict[str, Any]):
        """Handle failed invoice payment — mark past_due and notify user."""
        customer_id = data.get("customer")
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_customer_id == customer_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            amount_due = data.get("amount_due", 0)
            currency = data.get("currency", "usd")
            
            subscription.status = SubscriptionStatus.PAST_DUE
            
            payment = PaymentHistory(
                user_id=subscription.user_id,
                stripe_invoice_id=data.get("id"),
                amount=amount_due,
                currency=currency,
                status="failed",
                description="Payment failed",
            )
            db.add(payment)
            await db.commit()
            
            logger.warning(f"Payment failed for user {subscription.user_id}")
            
            user = await self._get_user_for_email(db, subscription.user_id)
            if user:
                await email_service.send_payment_failed_email(
                    to=user.email,
                    user_name=user.full_name or "",
                    amount_cents=amount_due,
                    currency=currency,
                )

    async def _sync_subscription(self, db: AsyncSession, stripe_sub: Union[Dict[str, Any], Any]):
        """Sync subscription data from Stripe (dict from webhook or StripeObject from retrieve)."""
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
        
        # Update period (use timezone-aware datetimes to match model columns)
        if stripe_sub.get("current_period_start"):
            subscription.current_period_start = datetime.fromtimestamp(stripe_sub["current_period_start"], tz=timezone.utc)
        if stripe_sub.get("current_period_end"):
            subscription.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"], tz=timezone.utc)
        
        subscription.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)
        
        if stripe_sub.get("canceled_at"):
            subscription.canceled_at = datetime.fromtimestamp(stripe_sub["canceled_at"], tz=timezone.utc)
        
        # Trial
        if stripe_sub.get("trial_start"):
            subscription.trial_start = datetime.fromtimestamp(stripe_sub["trial_start"], tz=timezone.utc)
        if stripe_sub.get("trial_end"):
            subscription.trial_end = datetime.fromtimestamp(stripe_sub["trial_end"], tz=timezone.utc)
        
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
    ) -> Tuple[List[PaymentHistoryItem], int]:
        """Get user's payment history. Returns (items, total_count)."""
        from sqlalchemy import func
        
        # Total count for pagination
        count_result = await db.execute(
            select(func.count()).select_from(PaymentHistory).where(PaymentHistory.user_id == user_id)
        )
        total_count = count_result.scalar() or 0
        
        result = await db.execute(
            select(PaymentHistory)
            .where(PaymentHistory.user_id == user_id)
            .order_by(PaymentHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        payments = result.scalars().all()
        
        items = [
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
        return items, total_count


# Singleton instance
billing_service = BillingService()

