"""
Tests for billing/subscription service — tier limits and subscription management.
"""

from datetime import UTC, datetime, timedelta

import pytest
from app.models.subscription import (
    TIER_LIMITS,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
)
from app.services.billing_service import BillingService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio


# ------------------------------------------------------------------
# Tier configuration tests
# ------------------------------------------------------------------

class TestTierConfiguration:
    """Verify TIER_LIMITS constants are correctly defined."""

    def test_free_tier_limits(self):
        free = TIER_LIMITS[SubscriptionTier.FREE]
        assert free["properties_limit"] > 0
        assert free["searches_per_month"] > 0
        assert "basic_analysis" in free["features"]

    def test_pro_tier_is_unlimited(self):
        pro = TIER_LIMITS[SubscriptionTier.PRO]
        assert pro["properties_limit"] == -1
        assert pro["searches_per_month"] == -1
        assert pro["api_calls_per_month"] == -1

    def test_pro_tier_superset_of_free_features(self):
        free = set(TIER_LIMITS[SubscriptionTier.FREE]["features"])
        pro = set(TIER_LIMITS[SubscriptionTier.PRO]["features"])
        assert free.issubset(pro)

    def test_all_tiers_have_required_keys(self):
        required_keys = {"properties_limit", "searches_per_month", "api_calls_per_month", "features"}
        for tier in SubscriptionTier:
            tier_config = TIER_LIMITS.get(tier)
            assert tier_config is not None, f"Tier {tier.value} missing from TIER_LIMITS"
            assert required_keys.issubset(tier_config.keys()), (
                f"Tier {tier.value} missing keys: {required_keys - tier_config.keys()}"
            )


# ------------------------------------------------------------------
# Subscription enum
# ------------------------------------------------------------------

class TestSubscriptionEnum:
    def test_tier_values(self):
        assert SubscriptionTier.FREE.value == "free"
        assert SubscriptionTier.PRO.value == "pro"
        assert set(SubscriptionTier) == {SubscriptionTier.FREE, SubscriptionTier.PRO}


# ------------------------------------------------------------------
# get_or_create_subscription — regression coverage for the
# "An unexpected error occurred" 500 on POST /api/v1/properties/saved.
#
# Repro: a Pro user whose denormalized properties_limit drifted from
# TIER_LIMITS[PRO] would hit ``_sync_limits_from_tier`` → broken
# ``async with db.begin(): pass`` → InvalidRequestError → unhandled
# exception out of ``save_property`` (the call is before the route's
# try/except), surfacing as the generic 500.
# ------------------------------------------------------------------


class TestGetOrCreateSubscription:
    async def test_repairs_drifted_limits_without_raising(
        self,
        db_session: AsyncSession,
        created_user,
    ):
        """A Pro subscription with stale ``properties_limit`` must repair and commit
        without raising ``InvalidRequestError`` (prior bug: ``async with db.begin():``
        ran while the session already had an implicit txn from ``db.execute``)."""
        pro_limits = TIER_LIMITS[SubscriptionTier.PRO]
        stale = Subscription(
            user_id=created_user.id,
            tier=SubscriptionTier.PRO,
            status=SubscriptionStatus.ACTIVE,
            properties_limit=10,
            searches_per_month=pro_limits["searches_per_month"],
            api_calls_per_month=pro_limits["api_calls_per_month"],
            usage_reset_date=datetime.now(UTC),
        )
        db_session.add(stale)
        await db_session.flush()

        service = BillingService()
        result = await service.get_or_create_subscription(db_session, created_user.id)

        assert result.tier == SubscriptionTier.PRO
        assert result.properties_limit == pro_limits["properties_limit"]

    async def test_creates_free_subscription_for_new_user_without_raising(
        self,
        db_session: AsyncSession,
        created_user,
    ):
        """First-time users with no Subscription row must get one created without
        ``InvalidRequestError`` from the broken commit pattern."""
        service = BillingService()
        result = await service.get_or_create_subscription(db_session, created_user.id)

        assert result.tier == SubscriptionTier.FREE
        assert result.user_id == created_user.id


# ------------------------------------------------------------------
# grant/revoke subscription — regression coverage for the admin
# "Failed to update subscription" toast on PATCH
# /api/v1/admin/users/{id}/subscription.
#
# Repro: the admin endpoint queries the target user first, autobeginning
# a transaction on the session. The old ``async with db.begin():`` in
# grant_subscription / revoke_subscription then raised
# ``InvalidRequestError: A transaction is already begun`` → 500.
# ------------------------------------------------------------------


class TestGrantRevokeSubscription:
    async def test_grant_pro_with_transaction_already_begun(
        self,
        db_session: AsyncSession,
        created_user,
    ):
        """Granting Pro after a prior query on the same session must not raise."""
        # Simulate the admin endpoint's preceding user lookup (autobegins txn)
        await db_session.execute(select(Subscription).where(Subscription.user_id == created_user.id))

        service = BillingService()
        result = await service.grant_subscription(db_session, created_user.id, SubscriptionTier.PRO)

        pro_limits = TIER_LIMITS[SubscriptionTier.PRO]
        assert result.tier == SubscriptionTier.PRO
        assert result.status == SubscriptionStatus.ACTIVE
        assert result.properties_limit == pro_limits["properties_limit"]

    async def test_revoke_back_to_free_with_transaction_already_begun(
        self,
        db_session: AsyncSession,
        created_user,
    ):
        """Revoking Pro after a prior query on the same session must not raise."""
        service = BillingService()
        await service.grant_subscription(db_session, created_user.id, SubscriptionTier.PRO)

        await db_session.execute(select(Subscription).where(Subscription.user_id == created_user.id))
        result = await service.revoke_subscription(db_session, created_user.id)

        free_limits = TIER_LIMITS[SubscriptionTier.FREE]
        assert result.tier == SubscriptionTier.FREE
        assert result.status == SubscriptionStatus.ACTIVE
        assert result.properties_limit == free_limits["properties_limit"]
        assert result.searches_used == 0

    async def test_grant_pro_clears_stale_period_and_trial_dates(
        self,
        db_session: AsyncSession,
        created_user,
    ):
        """An admin comp must not carry over a prior trial/subscription billing
        period, otherwise the billing sweeper would treat it as an expired paid
        record and silently downgrade it. Regression for: granted Pro resetting
        to Free after the hourly sweeper runs."""
        past = datetime.now(UTC) - timedelta(days=40)
        stale = Subscription(
            user_id=created_user.id,
            tier=SubscriptionTier.FREE,
            status=SubscriptionStatus.CANCELED,
            properties_limit=3,
            searches_per_month=3,
            api_calls_per_month=50,
            current_period_start=past,
            current_period_end=past,
            trial_start=past,
            trial_end=past,
            usage_reset_date=past,
        )
        db_session.add(stale)
        await db_session.flush()

        service = BillingService()
        result = await service.grant_subscription(db_session, created_user.id, SubscriptionTier.PRO)

        assert result.tier == SubscriptionTier.PRO
        assert result.status == SubscriptionStatus.ACTIVE
        assert result.current_period_start is None
        assert result.current_period_end is None
        assert result.trial_start is None
        assert result.trial_end is None


# ------------------------------------------------------------------
# Billing sweeper — admin comps must survive the hourly safety-net
# sweep. The sweeper exists only to compensate for lost Stripe
# webhooks, so it must never downgrade a subscription that has no
# Stripe subscription id (i.e. an admin-granted comp).
#
# Regression for: "Grant Pro" in the admin dashboard reverting to
# Free after the user's session ends (the hourly sweeper ran).
# ------------------------------------------------------------------


def _bind_sweeper_to_test_session(monkeypatch, db_session: AsyncSession) -> None:
    """Point the sweeper's session factory at the per-test session so its
    queries and commits run inside the test's rolled-back transaction."""
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def _ctx():
        yield db_session

    monkeypatch.setattr(
        "app.tasks.billing_sweeper.get_session_factory",
        lambda: _ctx,
    )


class TestBillingSweeperComps:
    async def test_comp_with_stale_period_is_not_swept(
        self,
        db_session: AsyncSession,
        created_user,
        monkeypatch,
    ):
        """A Pro comp (no stripe_subscription_id) with a stale current_period_end
        must NOT be downgraded by the sweeper."""
        from app.tasks.billing_sweeper import sweep_expired_subscriptions

        past = datetime.now(UTC) - timedelta(days=40)
        pro_limits = TIER_LIMITS[SubscriptionTier.PRO]
        comp = Subscription(
            user_id=created_user.id,
            tier=SubscriptionTier.PRO,
            status=SubscriptionStatus.ACTIVE,
            stripe_subscription_id=None,  # comp — no Stripe backing
            properties_limit=pro_limits["properties_limit"],
            searches_per_month=pro_limits["searches_per_month"],
            api_calls_per_month=pro_limits["api_calls_per_month"],
            current_period_end=past,  # stale, but irrelevant for a comp
            updated_at=past,  # older than the recent-update gate
            usage_reset_date=past,
        )
        db_session.add(comp)
        await db_session.flush()

        _bind_sweeper_to_test_session(monkeypatch, db_session)
        counts = await sweep_expired_subscriptions()

        assert counts["paid_swept"] == 0
        await db_session.refresh(comp)
        assert comp.tier == SubscriptionTier.PRO
        assert comp.status == SubscriptionStatus.ACTIVE

    async def test_stripe_backed_stale_paid_is_still_swept(
        self,
        db_session: AsyncSession,
        created_user,
        monkeypatch,
    ):
        """Sanity: the guard must not disable legitimate sweeping of a
        Stripe-backed subscription whose paid period clearly ended."""
        from app.tasks.billing_sweeper import sweep_expired_subscriptions

        past = datetime.now(UTC) - timedelta(days=40)
        pro_limits = TIER_LIMITS[SubscriptionTier.PRO]
        paid = Subscription(
            user_id=created_user.id,
            tier=SubscriptionTier.PRO,
            status=SubscriptionStatus.ACTIVE,
            stripe_subscription_id="sub_test_stale",
            properties_limit=pro_limits["properties_limit"],
            searches_per_month=pro_limits["searches_per_month"],
            api_calls_per_month=pro_limits["api_calls_per_month"],
            current_period_end=past,
            updated_at=past,
            usage_reset_date=past,
        )
        db_session.add(paid)
        await db_session.flush()

        _bind_sweeper_to_test_session(monkeypatch, db_session)
        counts = await sweep_expired_subscriptions()

        assert counts["paid_swept"] == 1
        await db_session.refresh(paid)
        assert paid.tier == SubscriptionTier.FREE
        assert paid.status == SubscriptionStatus.CANCELED
