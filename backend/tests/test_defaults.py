"""
Tests for backend/app/core/defaults.py — Income Value and Target Buy.

These formulas are the single source of truth for price targets; all clients must use API values.
"""
import pytest
from app.core.defaults import (
    estimate_income_value,
    calculate_buy_price,
    compute_market_price,
    DEFAULT_BUY_DISCOUNT_PCT,
)


class TestEstimateIncomeValue:
    """Tests for estimate_income_value (breakeven price where cash flow = 0)."""

    def test_basic_income_value(self):
        """Income value = NOI / (LTV × mortgage_constant)."""
        # monthly_rent 2500, taxes 3600, insurance 1200 → NOI positive
        iv = estimate_income_value(
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
        )
        assert iv > 0
        # Sanity: with 20% down, 6%, 30yr, income value should be in a plausible range for rent 30k/yr
        assert 100_000 < iv < 2_000_000

    def test_zero_rent_returns_zero(self):
        assert estimate_income_value(0, 3600, 1200) == 0

    def test_negative_noi_returns_zero(self):
        # Very low rent, high expenses → NOI <= 0
        iv = estimate_income_value(
            monthly_rent=100,
            property_taxes=50_000,
            insurance=10_000,
        )
        assert iv == 0

    def test_custom_down_payment_and_rate(self):
        iv_default = estimate_income_value(
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
        )
        iv_low_down = estimate_income_value(
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
            down_payment_pct=0.10,
        )
        # Lower down → more debt → lower income value (higher payment)
        assert iv_low_down < iv_default

    def test_deterministic_for_fixed_inputs(self):
        a = estimate_income_value(3000, 4000, 1500)
        b = estimate_income_value(3000, 4000, 1500)
        assert a == b


class TestCalculateBuyPrice:
    """Tests for calculate_buy_price = income_value * (1 - buy_discount_pct), capped at list_price."""

    def test_buy_price_below_list(self):
        """Target buy should be at or below list price."""
        list_price = 400_000
        buy = calculate_buy_price(
            list_price=list_price,
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
        )
        assert buy <= list_price
        assert buy > 0

    def test_buy_price_uses_default_discount(self):
        """Default buy_discount_pct is 0.05 → buy = income_value * 0.95."""
        list_price = 1_000_000
        buy = calculate_buy_price(
            list_price=list_price,
            monthly_rent=3500,
            property_taxes=5000,
            insurance=2000,
        )
        iv = estimate_income_value(3500, 5000, 2000)
        expected = round(iv * (1 - DEFAULT_BUY_DISCOUNT_PCT))
        assert buy == min(expected, list_price)

    def test_buy_price_capped_at_list(self):
        """When income value is above list, return list_price."""
        list_price = 200_000
        buy = calculate_buy_price(
            list_price=list_price,
            monthly_rent=5000,  # High rent → high income value
            property_taxes=2000,
            insurance=1000,
        )
        assert buy == list_price

    def test_zero_list_price_returns_zero(self):
        assert calculate_buy_price(0, 2500, 3600, 1200) == 0

    def test_custom_buy_discount(self):
        list_price = 500_000
        buy_5 = calculate_buy_price(
            list_price=list_price,
            monthly_rent=3000,
            property_taxes=4000,
            insurance=1200,
            buy_discount_pct=0.05,
        )
        buy_10 = calculate_buy_price(
            list_price=list_price,
            monthly_rent=3000,
            property_taxes=4000,
            insurance=1200,
            buy_discount_pct=0.10,
        )
        assert buy_10 < buy_5


class TestComputeMarketPrice:
    """Tests for compute_market_price (listed = list price; off-market = Zestimate)."""

    def test_listed_returns_list_price(self):
        """When is_listed and list_price > 0, return list_price."""
        out = compute_market_price(
            is_listed=True,
            list_price=400_000,
            zestimate=350_000,
        )
        assert out == 400_000

    def test_off_market_returns_zestimate(self):
        """Off-market: Zestimate is the single source of truth."""
        out = compute_market_price(
            is_listed=False,
            list_price=None,
            zestimate=600_000,
        )
        assert out == 600_000

    def test_off_market_zestimate_only_ignores_avm(self):
        """Off-market with both Zestimate and AVM: returns Zestimate (no blending)."""
        out = compute_market_price(
            is_listed=False,
            list_price=None,
            zestimate=600_000,
            current_value_avm=700_000,
        )
        assert out == 600_000

    def test_off_market_no_zestimate_returns_none(self):
        """Off-market with no Zestimate returns None regardless of other values."""
        out = compute_market_price(
            is_listed=False,
            list_price=None,
            zestimate=None,
            current_value_avm=700_000,
            income_value=500_000,
            tax_assessed_value=400_000,
        )
        assert out is None

    def test_off_market_all_none_returns_none(self):
        """When off-market and no valuations at all, return None."""
        out = compute_market_price(
            is_listed=False,
            list_price=None,
            zestimate=None,
        )
        assert out is None

    def test_listed_zero_list_price_falls_to_zestimate(self):
        """When is_listed but list_price is 0, fall through to Zestimate."""
        out = compute_market_price(
            is_listed=True,
            list_price=0,
            zestimate=500_000,
        )
        assert out == 500_000

    def test_off_market_zero_zestimate_returns_none(self):
        """Zestimate of 0 is treated as unavailable."""
        out = compute_market_price(
            is_listed=False,
            list_price=None,
            zestimate=0,
        )
        assert out is None
