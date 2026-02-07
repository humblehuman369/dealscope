"""
Tests for billing/subscription service — tier limits and subscription management.
"""

import pytest
import uuid
from datetime import datetime, timezone

from app.models.subscription import SubscriptionTier, TIER_LIMITS


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

    def test_starter_tier_above_free(self):
        free = TIER_LIMITS[SubscriptionTier.FREE]
        starter = TIER_LIMITS[SubscriptionTier.STARTER]
        assert starter["properties_limit"] > free["properties_limit"]
        assert starter["searches_per_month"] > free["searches_per_month"]

    def test_pro_tier_above_starter(self):
        starter = TIER_LIMITS[SubscriptionTier.STARTER]
        pro = TIER_LIMITS[SubscriptionTier.PRO]
        assert pro["properties_limit"] > starter["properties_limit"]

    def test_all_tiers_have_required_keys(self):
        required_keys = {"properties_limit", "searches_per_month", "api_calls_per_month", "features"}
        for tier in SubscriptionTier:
            tier_config = TIER_LIMITS.get(tier)
            if tier_config is not None:
                assert required_keys.issubset(tier_config.keys()), (
                    f"Tier {tier.value} missing keys: {required_keys - tier_config.keys()}"
                )


# ------------------------------------------------------------------
# Subscription enum
# ------------------------------------------------------------------

class TestSubscriptionEnum:
    def test_tier_values(self):
        assert SubscriptionTier.FREE.value == "free"
        assert SubscriptionTier.STARTER.value == "starter"
        assert SubscriptionTier.PRO.value == "pro"
        assert SubscriptionTier.ENTERPRISE.value == "enterprise"
