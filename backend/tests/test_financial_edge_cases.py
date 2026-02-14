"""
Edge-case tests for financial calculation functions.

These verify that the input validation and boundary guards added in
Phase 1 (Stabilization) correctly handle:
  - Zero / negative / None inputs
  - Extreme values (100% down, 0% interest, max rate)
  - Division-by-zero scenarios
  - Clamping behaviour

All functions under test are pure — no DB or network required.
"""

import pytest
from app.core.defaults import estimate_breakeven_price, calculate_buy_price, _clamp


# =====================================================================
# _clamp helper
# =====================================================================

class TestClamp:
    def test_within_range(self):
        assert _clamp(0.5, 0.0, 1.0, "test") == 0.5

    def test_below_min(self):
        assert _clamp(-0.1, 0.0, 1.0, "test") == 0.0

    def test_above_max(self):
        assert _clamp(1.5, 0.0, 1.0, "test") == 1.0

    def test_at_boundaries(self):
        assert _clamp(0.0, 0.0, 1.0, "test") == 0.0
        assert _clamp(1.0, 0.0, 1.0, "test") == 1.0


# =====================================================================
# estimate_breakeven_price
# =====================================================================

class TestBreakevenPrice:
    """Tests for estimate_breakeven_price with edge-case inputs."""

    def test_basic_positive_result(self):
        """Normal inputs should produce a positive breakeven price."""
        result = estimate_breakeven_price(
            monthly_rent=2000,
            property_taxes=3000,
            insurance=1200,
        )
        assert result > 0

    def test_zero_rent_returns_zero(self):
        """Zero rent → property can never break even."""
        result = estimate_breakeven_price(
            monthly_rent=0,
            property_taxes=3000,
            insurance=1200,
        )
        assert result == 0

    def test_none_rent_returns_zero(self):
        result = estimate_breakeven_price(
            monthly_rent=None,
            property_taxes=3000,
            insurance=1200,
        )
        assert result == 0

    def test_negative_rent_returns_zero(self):
        result = estimate_breakeven_price(
            monthly_rent=-500,
            property_taxes=3000,
            insurance=1200,
        )
        assert result == 0

    def test_none_taxes_treated_as_zero(self):
        """None taxes should not crash — treated as 0."""
        result = estimate_breakeven_price(
            monthly_rent=2000,
            property_taxes=None,
            insurance=1200,
        )
        assert result > 0

    def test_zero_interest_rate(self):
        """0% interest should still produce a valid breakeven."""
        result = estimate_breakeven_price(
            monthly_rent=2000,
            property_taxes=3000,
            insurance=1200,
            interest_rate=0.0,
        )
        assert result > 0

    def test_max_interest_rate_clamp(self):
        """Interest rate above 30% should be clamped and not crash."""
        result = estimate_breakeven_price(
            monthly_rent=2000,
            property_taxes=3000,
            insurance=1200,
            interest_rate=0.99,  # 99% — should clamp to 30%
        )
        assert isinstance(result, (int, float))

    def test_100_pct_down_payment(self):
        """100% down (cash buy) — no mortgage, use cap rate floor."""
        result = estimate_breakeven_price(
            monthly_rent=2000,
            property_taxes=3000,
            insurance=1200,
            down_payment_pct=1.0,
        )
        # Should use the cap rate fallback path (NOI / 0.05)
        assert result > 0

    def test_huge_taxes_overwhelm_rent(self):
        """When operating expenses exceed income, NOI < 0 → return 0."""
        result = estimate_breakeven_price(
            monthly_rent=500,
            property_taxes=100_000,  # absurd taxes
            insurance=50_000,
        )
        assert result == 0

    def test_all_rates_none_uses_defaults(self):
        """All optional params as None should use module-level defaults."""
        result = estimate_breakeven_price(
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
            down_payment_pct=None,
            interest_rate=None,
            loan_term_years=None,
            vacancy_rate=None,
            maintenance_pct=None,
            management_pct=None,
        )
        assert result > 0


# =====================================================================
# calculate_buy_price
# =====================================================================

class TestBuyPrice:
    """Tests for calculate_buy_price with edge-case inputs."""

    def test_basic_positive_result(self):
        result = calculate_buy_price(
            list_price=300_000,
            monthly_rent=2000,
            property_taxes=3000,
            insurance=1200,
        )
        assert 0 < result <= 300_000

    def test_buy_price_never_exceeds_list(self):
        """Buy price should never exceed the list price."""
        result = calculate_buy_price(
            list_price=100_000,
            monthly_rent=5000,  # very high rent
            property_taxes=1000,
            insurance=500,
        )
        assert result <= 100_000

    def test_zero_list_price_returns_zero(self):
        result = calculate_buy_price(
            list_price=0,
            monthly_rent=2000,
            property_taxes=3000,
            insurance=1200,
        )
        assert result == 0

    def test_negative_list_price_returns_zero(self):
        result = calculate_buy_price(
            list_price=-100_000,
            monthly_rent=2000,
            property_taxes=3000,
            insurance=1200,
        )
        assert result == 0

    def test_none_list_price_returns_zero(self):
        result = calculate_buy_price(
            list_price=None,
            monthly_rent=2000,
            property_taxes=3000,
            insurance=1200,
        )
        assert result == 0

    def test_none_rent_returns_list_price(self):
        """If rent is None we can't calculate breakeven — return list price."""
        result = calculate_buy_price(
            list_price=300_000,
            monthly_rent=None,
            property_taxes=3000,
            insurance=1200,
        )
        assert result == 300_000

    def test_negative_rent_returns_list_price(self):
        result = calculate_buy_price(
            list_price=300_000,
            monthly_rent=-500,
            property_taxes=3000,
            insurance=1200,
        )
        assert result == 300_000

    def test_discount_clamped_to_50_pct(self):
        """Discount > 50% should be clamped; result must still be positive."""
        result = calculate_buy_price(
            list_price=500_000,
            monthly_rent=3000,
            property_taxes=5000,
            insurance=2000,
            buy_discount_pct=0.90,  # 90% → clamped to 50%
        )
        assert result > 0

    def test_zero_discount(self):
        """0% discount means buy price == breakeven (capped at list)."""
        result = calculate_buy_price(
            list_price=500_000,
            monthly_rent=3000,
            property_taxes=5000,
            insurance=2000,
            buy_discount_pct=0.0,
        )
        assert result > 0
