"""Tests for the single entitlement helper (Task 3.2).

Business rule: ``paid`` requires at least one settled charge (Stripe
PaymentHistory succeeded with amount > 0) or the store-charged equivalent
(RevenueCat/comp subscriptions in ACTIVE status). A trialing Pro
subscription with no settled charge is ``trial``. Everything else is ``free``.
"""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from app.services.entitlements import Entitlement, resolve_entitlement

pytestmark = pytest.mark.asyncio


def _subscription(status: SubscriptionStatus, tier: SubscriptionTier = SubscriptionTier.PRO):
    return Subscription(
        user_id=uuid.uuid4(),
        tier=tier,
        status=status,
        properties_limit=-1,
        searches_per_month=-1,
        api_calls_per_month=-1,
    )


def _db(subscription: Subscription | None, settled_charge: bool = False):
    """DB stub: first execute() resolves the subscription, second the charge check."""
    sub_result = SimpleNamespace(scalar_one_or_none=lambda: subscription)
    charge_result = SimpleNamespace(scalar=lambda: settled_charge)
    return SimpleNamespace(execute=AsyncMock(side_effect=[sub_result, charge_result]))


async def test_no_subscription_is_free():
    assert await resolve_entitlement(_db(None), uuid.uuid4()) == Entitlement.FREE


async def test_free_tier_is_free():
    sub = _subscription(SubscriptionStatus.ACTIVE, tier=SubscriptionTier.FREE)
    assert await resolve_entitlement(_db(sub), uuid.uuid4()) == Entitlement.FREE


@pytest.mark.parametrize(
    "status",
    [
        SubscriptionStatus.CANCELED,
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.UNPAID,
        SubscriptionStatus.INCOMPLETE,
        SubscriptionStatus.PAUSED,
    ],
)
async def test_inactive_pro_is_free(status):
    """Canceled / past-due Pro loses access on the next request (plan acceptance #3)."""
    sub = _subscription(status)
    assert await resolve_entitlement(_db(sub), uuid.uuid4()) == Entitlement.FREE


async def test_active_pro_is_paid():
    """ACTIVE = Stripe first-invoice settled, RC store-charged, or admin comp."""
    sub = _subscription(SubscriptionStatus.ACTIVE)
    db = _db(sub)
    assert await resolve_entitlement(db, uuid.uuid4()) == Entitlement.PAID
    # ACTIVE short-circuits — no PaymentHistory query needed.
    assert db.execute.await_count == 1


async def test_trialing_pro_without_settled_charge_is_trial():
    sub = _subscription(SubscriptionStatus.TRIALING)
    assert await resolve_entitlement(_db(sub, settled_charge=False), uuid.uuid4()) == Entitlement.TRIAL


async def test_trialing_pro_with_settled_charge_is_paid():
    """A returning subscriber in a new trial who already paid once counts as paid."""
    sub = _subscription(SubscriptionStatus.TRIALING)
    assert await resolve_entitlement(_db(sub, settled_charge=True), uuid.uuid4()) == Entitlement.PAID
