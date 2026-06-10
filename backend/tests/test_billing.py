"""
Tests for billing/subscription service — tier limits and subscription management.
"""

from datetime import UTC, datetime

import pytest
from app.models.subscription import (
    TIER_LIMITS,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
)
from app.services.billing_service import BillingService
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
