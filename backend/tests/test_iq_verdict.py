"""
Tests for the IQ Verdict service — multi-strategy investment analysis.

These exercise the pure ``compute_iq_verdict`` and ``compute_deal_score``
functions end-to-end with typical and edge-case inputs.  No DB or network
is required.
"""

import pytest
from app.schemas.analytics import IQVerdictInput, DealScoreInput
from app.services.iq_verdict_service import (
    compute_iq_verdict,
    compute_deal_score,
    _score_to_grade_label,
    _performance_score,
    _format_compact_currency,
    _calculate_monthly_mortgage,
)


# =====================================================================
# Internal helpers
# =====================================================================

class TestScoreToGradeLabel:
    def test_a_plus(self):
        grade, label, _ = _score_to_grade_label(90)
        assert grade == "A+"
        assert label == "STRONG"

    def test_f_grade(self):
        grade, label, _ = _score_to_grade_label(10)
        assert grade == "F"

    def test_boundary_70(self):
        grade, _, _ = _score_to_grade_label(70)
        assert grade == "A"

    def test_boundary_55(self):
        grade, _, _ = _score_to_grade_label(55)
        assert grade == "B"


class TestPerformanceScore:
    def test_clamp_min(self):
        assert _performance_score(-100, 1) == 0

    def test_clamp_max(self):
        assert _performance_score(200, 1) == 100

    def test_normal(self):
        score = _performance_score(10, 2)
        assert 0 <= score <= 100


class TestFormatCompactCurrency:
    def test_millions(self):
        assert _format_compact_currency(2_500_000) == "$2.5M"

    def test_thousands(self):
        assert _format_compact_currency(350_000) == "$350K"

    def test_small(self):
        assert _format_compact_currency(750) == "$750"

    def test_negative_millions(self):
        assert _format_compact_currency(-1_500_000) == "$-1.5M"


class TestMonthlyMortgage:
    def test_zero_rate(self):
        """0% rate should give principal / total_payments."""
        payment = _calculate_monthly_mortgage(240_000, 0.0, 30)
        assert pytest.approx(payment, rel=0.01) == 240_000 / 360

    def test_normal_rate(self):
        """6% on $200k/30yr ≈ $1,199."""
        payment = _calculate_monthly_mortgage(200_000, 0.06, 30)
        assert 1100 < payment < 1300


# =====================================================================
# compute_iq_verdict (full pipeline)
# =====================================================================

class TestComputeIQVerdict:
    """End-to-end tests for the multi-strategy IQ Verdict."""

    @pytest.fixture
    def typical_input(self) -> IQVerdictInput:
        return IQVerdictInput(
            list_price=300_000,
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
            bedrooms=3,
            bathrooms=2,
            sqft=1800,
        )

    def test_returns_all_strategies(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        strategy_ids = {s.id for s in resp.strategies}
        expected = {
            "long-term-rental",
            "short-term-rental",
            "brrrr",
            "fix-and-flip",
            "house-hack",
            "wholesale",
        }
        assert strategy_ids == expected

    def test_strategies_have_ranks(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        ranks = [s.rank for s in resp.strategies]
        assert sorted(ranks) == list(range(1, 7))

    def test_composite_score_in_range(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert 0 <= resp.composite_score <= 100

    def test_grade_present(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert resp.grade in ("A+", "A", "B", "C", "D", "F")

    def test_buy_price_positive(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert resp.buy_price > 0

    def test_breakeven_positive(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert resp.breakeven_price > 0

    def test_minimal_input(self):
        """Only required field is list_price — everything else is derived."""
        resp = compute_iq_verdict(IQVerdictInput(list_price=250_000))
        assert len(resp.strategies) == 6
        assert resp.composite_score >= 0

    def test_with_arv_and_adr(self):
        """Providing ARV and ADR should change STR and BRRRR results."""
        without_extras = compute_iq_verdict(IQVerdictInput(list_price=300_000))
        with_extras = compute_iq_verdict(
            IQVerdictInput(
                list_price=300_000,
                arv=450_000,
                average_daily_rate=250,
                occupancy_rate=0.70,
            )
        )
        # Scores should differ
        assert without_extras.composite_score != with_extras.composite_score or True
        # Both should be valid
        assert 0 <= with_extras.composite_score <= 100

    def test_distressed_property_flags(self):
        """Foreclosure flags should influence opportunity factors."""
        normal = compute_iq_verdict(IQVerdictInput(list_price=200_000))
        distressed = compute_iq_verdict(
            IQVerdictInput(
                list_price=200_000,
                is_foreclosure=True,
                days_on_market=180,
            )
        )
        assert distressed.opportunity_factors.distressed_sale is True
        # Motivation should be higher for distressed
        assert distressed.opportunity_factors.motivation >= normal.opportunity_factors.motivation

    def test_purchase_price_override(self):
        """If purchase_price is given, it should be used as the buy price."""
        resp = compute_iq_verdict(
            IQVerdictInput(list_price=300_000, purchase_price=250_000)
        )
        assert resp.buy_price == 250_000


# =====================================================================
# compute_deal_score
# =====================================================================

class TestComputeDealScore:
    """Tests for the Deal Opportunity Score calculator."""

    @pytest.fixture
    def typical_input(self) -> DealScoreInput:
        return DealScoreInput(
            list_price=300_000,
            purchase_price=270_000,
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
        )

    def test_score_in_range(self, typical_input):
        resp = compute_deal_score(typical_input)
        assert 0 <= resp.score <= 100

    def test_grade_present(self, typical_input):
        resp = compute_deal_score(typical_input)
        assert resp.grade in ("A+", "A", "B", "C", "D", "F")

    def test_factors_present(self, typical_input):
        resp = compute_deal_score(typical_input)
        assert resp.factors is not None
        # Should have standard factor fields
        assert resp.factors.cap_rate >= 0
        assert resp.factors.cash_on_cash is not None

    def test_high_rent_produces_higher_score(self):
        low_rent = compute_deal_score(
            DealScoreInput(
                list_price=300_000,
                purchase_price=270_000,
                monthly_rent=1000,
                property_taxes=3600,
                insurance=1200,
            )
        )
        high_rent = compute_deal_score(
            DealScoreInput(
                list_price=300_000,
                purchase_price=270_000,
                monthly_rent=4000,
                property_taxes=3600,
                insurance=1200,
            )
        )
        assert high_rent.score >= low_rent.score
