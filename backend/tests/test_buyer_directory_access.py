from types import SimpleNamespace
from unittest.mock import AsyncMock
import uuid

import pytest
from fastapi import HTTPException

from app.core.deps import get_current_paid_pro_user
from app.models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from app.services.billing_service import BillingService


pytestmark = pytest.mark.asyncio


def _user():
    return SimpleNamespace(id=uuid.uuid4(), email="paid@example.com", full_name="Paid User")


def _subscription(user_id: uuid.UUID, status: SubscriptionStatus, tier: SubscriptionTier = SubscriptionTier.PRO):
    return Subscription(
        user_id=user_id,
        tier=tier,
        status=status,
        properties_limit=-1,
        searches_per_month=-1,
        api_calls_per_month=-1,
    )


async def test_paid_active_pro_user_can_access_buyer_directory(monkeypatch):
    user = _user()
    billing = SimpleNamespace(get_subscription=AsyncMock(return_value=_subscription(user.id, SubscriptionStatus.ACTIVE)))
    monkeypatch.setattr("app.services.billing_service.billing_service", billing)

    result = await get_current_paid_pro_user(current_user=user, db=SimpleNamespace())

    assert result is user


@pytest.mark.parametrize(
    ("tier", "status"),
    [
        (SubscriptionTier.PRO, SubscriptionStatus.TRIALING),
        (SubscriptionTier.PRO, SubscriptionStatus.PAST_DUE),
        (SubscriptionTier.FREE, SubscriptionStatus.ACTIVE),
    ],
)
async def test_non_paid_active_users_are_rejected(monkeypatch, tier, status):
    user = _user()
    billing = SimpleNamespace(get_subscription=AsyncMock(return_value=_subscription(user.id, status, tier)))
    monkeypatch.setattr("app.services.billing_service.billing_service", billing)

    with pytest.raises(HTTPException) as exc:
        await get_current_paid_pro_user(current_user=user, db=SimpleNamespace())

    assert exc.value.status_code == 403
    assert "paid Pro" in exc.value.detail


async def test_paid_only_checkout_omits_trial_period(monkeypatch):
    captured: dict = {}

    class FakeSession:
        id = "cs_paid_now"
        url = "https://checkout.example/session"

    class FakeSessionApi:
        @staticmethod
        def create(**kwargs):
            captured.update(kwargs)
            return FakeSession()

    fake_stripe = SimpleNamespace(checkout=SimpleNamespace(Session=FakeSessionApi))
    monkeypatch.setattr("app.services.billing_service.stripe", fake_stripe, raising=False)

    service = BillingService()
    service.is_configured = True
    service.get_or_create_stripe_customer = AsyncMock(return_value="cus_test")
    service.get_subscription = AsyncMock(return_value=None)

    await service.create_checkout_session(
        db=SimpleNamespace(),
        user=_user(),
        price_id="price_test",
        success_url="https://app.example/checkout/success",
        cancel_url="https://app.example/directory",
        return_to="/directory",
        skip_trial=True,
    )

    assert captured["subscription_data"]["metadata"]["return_to"] == "/directory"
    assert "trial_period_days" not in captured["subscription_data"]


async def test_regular_checkout_keeps_trial_period(monkeypatch):
    captured: dict = {}

    class FakeSession:
        id = "cs_trial"
        url = "https://checkout.example/session"

    class FakeSessionApi:
        @staticmethod
        def create(**kwargs):
            captured.update(kwargs)
            return FakeSession()

    fake_stripe = SimpleNamespace(checkout=SimpleNamespace(Session=FakeSessionApi))
    monkeypatch.setattr("app.services.billing_service.stripe", fake_stripe, raising=False)

    service = BillingService()
    service.is_configured = True
    service.get_or_create_stripe_customer = AsyncMock(return_value="cus_test")
    service.get_subscription = AsyncMock(return_value=None)

    await service.create_checkout_session(
        db=SimpleNamespace(),
        user=_user(),
        price_id="price_test",
        success_url="https://app.example/checkout/success",
        cancel_url="https://app.example/pricing",
    )

    assert captured["subscription_data"]["trial_period_days"] == 7


async def test_paid_only_checkout_ends_existing_trial_without_second_subscription(monkeypatch):
    captured: dict = {}
    user = _user()
    trial_sub = _subscription(user.id, SubscriptionStatus.TRIALING)
    trial_sub.stripe_subscription_id = "sub_trial"

    class FakeSubscriptionApi:
        @staticmethod
        def modify(subscription_id, **kwargs):
            captured["subscription_id"] = subscription_id
            captured["modify"] = kwargs
            return {
                "current_period_start": 1_700_000_000,
                "current_period_end": 1_702_592_000,
            }

    class FakeSessionApi:
        @staticmethod
        def create(**kwargs):  # pragma: no cover - should not be called
            captured["checkout"] = kwargs
            raise AssertionError("checkout session should not be created for an existing trial")

    fake_stripe = SimpleNamespace(
        Subscription=FakeSubscriptionApi,
        checkout=SimpleNamespace(Session=FakeSessionApi),
    )
    monkeypatch.setattr("app.services.billing_service.stripe", fake_stripe, raising=False)

    db = SimpleNamespace(commit=AsyncMock(), refresh=AsyncMock())
    service = BillingService()
    service.is_configured = True
    service.get_or_create_stripe_customer = AsyncMock(return_value="cus_test")
    service.get_subscription = AsyncMock(return_value=trial_sub)

    result = await service.create_checkout_session(
        db=db,
        user=user,
        price_id="price_test",
        success_url="https://app.example/checkout/success",
        cancel_url="https://app.example/directory",
        return_to="/directory",
        skip_trial=True,
    )

    assert captured["subscription_id"] == "sub_trial"
    assert captured["modify"] == {"trial_end": "now"}
    assert "checkout" not in captured
    assert trial_sub.status == SubscriptionStatus.ACTIVE
    assert result.checkout_url == "https://app.example/checkout/success"
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(trial_sub)
