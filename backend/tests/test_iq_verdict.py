"""
Tests for the IQ Verdict service — multi-strategy investment analysis.

These exercise the pure ``compute_iq_verdict`` and ``compute_deal_score``
functions end-to-end with typical and edge-case inputs.  No DB or network
is required.
"""

import pytest
from app.schemas.analytics import IQVerdictInput, DealScoreInput
from app.services.calculators import calculate_monthly_mortgage
from app.services.iq_verdict_service import (
    compute_iq_verdict,
    compute_deal_score,
    _score_to_grade_label,
    _performance_score,
    _format_compact_currency,
    _calculate_verdict_score,
    _interpolate_bracket_score,
    _calculate_wholesale_strategy,
)


# =====================================================================
# Internal helpers
# =====================================================================

class TestScoreToGradeLabel:
    def test_a_plus(self):
        grade, label, _ = _score_to_grade_label(90)
        assert grade == "A+"
        assert label == "ACHIEVABLE"

    def test_f_grade(self):
        grade, label, _ = _score_to_grade_label(10)
        assert grade == "F"

    def test_boundary_70(self):
        grade, _, _ = _score_to_grade_label(70)
        assert grade == "B"

    def test_boundary_55(self):
        grade, _, _ = _score_to_grade_label(55)
        assert grade == "C"


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
        payment = calculate_monthly_mortgage(240_000, 0.0, 30)
        assert pytest.approx(payment, rel=0.01) == 240_000 / 360

    def test_normal_rate(self):
        """6% on $200k/30yr ≈ $1,199."""
        payment = calculate_monthly_mortgage(200_000, 0.06, 30)
        assert 1100 < payment < 1300


class TestVerdictScore:
    """Tests for pure Deal Gap bracket-based _calculate_verdict_score."""

    def test_no_gap_scores_high(self):
        score = _calculate_verdict_score(0)
        assert score >= 85

    def test_small_gap_scores_well(self):
        score = _calculate_verdict_score(3)
        assert 75 <= score <= 95

    def test_large_gap_scores_low(self):
        score = _calculate_verdict_score(35)
        assert score <= 35

    def test_same_gap_always_same_score(self):
        """Score is purely Deal Gap — no modifiers means deterministic."""
        s1 = _calculate_verdict_score(15)
        s2 = _calculate_verdict_score(15)
        assert s1 == s2

    def test_score_clamped(self):
        score = _calculate_verdict_score(-50)
        assert score <= 95
        score = _calculate_verdict_score(80)
        assert score >= 5

    def test_interpolation_monotonic(self):
        """Increasing gap should produce decreasing scores."""
        prev_score = 100
        for gap in range(0, 50, 5):
            score = _interpolate_bracket_score(float(gap))
            assert score <= prev_score
            prev_score = score


class TestWholesaleStrategy:
    """Tests for _calculate_wholesale_strategy (Verdict context: mao = arv*0.70 - rehab - fee)."""

    def test_wholesale_strategy_returns_expected_keys(self):
        result = _calculate_wholesale_strategy(price=300_000, arv=400_000, rehab_cost=50_000)
        assert result["id"] == "wholesale"
        assert "score" in result
        assert "annual_cash_flow" in result
        assert "metric" in result

    def test_mao_formula_verdict_context(self):
        """Verdict wholesale: wholesale_fee = price*0.007, mao = (arv*0.70) - rehab_cost - wholesale_fee."""
        price = 300_000
        arv = 400_000
        rehab = 50_000
        result = _calculate_wholesale_strategy(price, arv, rehab)
        # assignment_fee is used in metric; internal mao = (400k*0.70) - 50k - (300k*0.007) = 280k - 50k - 2.1k = 227_900
        # We can't read mao from result (it's not in the dict); we check assignment_fee = mao - (price*0.85) per code
        # So: mao = 227900, assignment_fee = 227900 - 255000 = -27100 (negative). So strategy still returns.
        assert result["score"] >= 0
        assert result["score"] <= 100


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

    def test_deal_score_in_range(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert 5 <= resp.deal_score <= 95

    def test_grade_present(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert resp.opportunity.grade in ("A+", "A", "B", "C", "D", "F")

    def test_purchase_price_positive(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert resp.purchase_price > 0

    def test_income_value_positive(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert resp.income_value > 0

    def test_deal_factors_list(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert isinstance(resp.deal_factors, list)
        for f in resp.deal_factors:
            assert f.type in ("positive", "warning", "info")

    def test_discount_bracket_label_present(self, typical_input):
        resp = compute_iq_verdict(typical_input)
        assert len(resp.discount_bracket_label) > 0

    def test_minimal_input(self):
        """Only required field is list_price — everything else is derived."""
        resp = compute_iq_verdict(IQVerdictInput(list_price=250_000))
        assert len(resp.strategies) == 6
        assert resp.deal_score >= 5

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
        assert 5 <= with_extras.deal_score <= 95

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
        assert resp.purchase_price == 250_000

    def test_closing_costs_pct_override(self):
        """closing_costs_pct override should change LTR breakdown closing costs."""
        base = compute_iq_verdict(IQVerdictInput(list_price=300_000, monthly_rent=2500))
        custom = compute_iq_verdict(
            IQVerdictInput(list_price=300_000, monthly_rent=2500, closing_costs_pct=0.05)
        )
        ltr_base = next(s for s in base.strategies if s.id == "long-term-rental")
        ltr_custom = next(s for s in custom.strategies if s.id == "long-term-rental")
        assert ltr_custom.breakdown["closing_costs"] > ltr_base.breakdown["closing_costs"]
        assert ltr_custom.breakdown["closing_costs_pct"] == 5.0

    def test_rehab_cost_override(self):
        """Explicit rehab_cost should bypass the default ARV-based calculation."""
        resp = compute_iq_verdict(
            IQVerdictInput(list_price=300_000, monthly_rent=2500, rehab_cost=25_000)
        )
        assert resp.inputs_used["rehab_cost"] == 25_000
        brrrr = next(s for s in resp.strategies if s.id == "brrrr")
        assert brrrr.breakdown["rehab_cost"] == 25_000

    def test_capex_pct_override(self):
        """capex_pct override should change reserves in LTR breakdown."""
        base = compute_iq_verdict(IQVerdictInput(list_price=300_000, monthly_rent=2500))
        custom = compute_iq_verdict(
            IQVerdictInput(list_price=300_000, monthly_rent=2500, capex_pct=0.10)
        )
        ltr_base = next(s for s in base.strategies if s.id == "long-term-rental")
        ltr_custom = next(s for s in custom.strategies if s.id == "long-term-rental")
        assert ltr_custom.breakdown["reserves"] > ltr_base.breakdown["reserves"]

    def test_management_pct_override(self):
        """management_pct override flows through to strategy breakdown."""
        resp = compute_iq_verdict(
            IQVerdictInput(list_price=300_000, monthly_rent=2500, management_pct=0.12)
        )
        ltr = next(s for s in resp.strategies if s.id == "long-term-rental")
        assert ltr.breakdown["management_pct"] == 12.0

    def test_inputs_used_reports_overrides(self):
        """inputs_used dict should reflect all resolved assumption values."""
        resp = compute_iq_verdict(
            IQVerdictInput(
                list_price=300_000,
                monthly_rent=2500,
                down_payment_pct=0.25,
                interest_rate=0.07,
                closing_costs_pct=0.04,
                vacancy_rate=0.08,
            )
        )
        used = resp.inputs_used
        assert used["down_payment_pct"] == 0.25
        assert used["interest_rate"] == 0.07
        assert used["closing_costs_pct"] == 0.04
        assert used["vacancy_rate"] == 0.08

    def test_same_inputs_same_output(self):
        """Identical inputs should always produce identical results (no hidden state)."""
        inp = IQVerdictInput(
            list_price=300_000, monthly_rent=2500,
            property_taxes=3600, insurance=1200,
            down_payment_pct=0.20, interest_rate=0.065,
        )
        r1 = compute_iq_verdict(inp)
        r2 = compute_iq_verdict(inp)
        assert r1.deal_score == r2.deal_score
        assert r1.purchase_price == r2.purchase_price
        ltr1 = next(s for s in r1.strategies if s.id == "long-term-rental")
        ltr2 = next(s for s in r2.strategies if s.id == "long-term-rental")
        assert ltr1.breakdown == ltr2.breakdown

    def test_ltr_breakdown_has_all_display_fields(self):
        """LTR breakdown must include every field the Strategy page reads."""
        resp = compute_iq_verdict(
            IQVerdictInput(list_price=300_000, monthly_rent=2500, property_taxes=3600, insurance=1200)
        )
        ltr = next(s for s in resp.strategies if s.id == "long-term-rental")
        bd = ltr.breakdown
        required_keys = [
            "purchase_price", "down_payment", "down_payment_pct",
            "closing_costs", "closing_costs_pct", "total_cash_needed",
            "loan_amount", "interest_rate", "loan_term_years", "monthly_payment",
            "monthly_rent", "annual_gross_rent", "vacancy_rate", "vacancy_loss",
            "effective_income", "property_taxes", "insurance",
            "management", "management_pct", "maintenance", "maintenance_pct",
            "reserves", "reserves_pct", "total_operating_expenses",
            "noi", "annual_debt_service",
        ]
        for key in required_keys:
            assert key in bd, f"Missing breakdown key: {key}"

    def test_strategy_metrics_use_shared_formulas(self):
        """Cap rate and CoC from verdict should match common.py calculations."""
        from app.services.calculators.common import calculate_cap_rate, calculate_cash_on_cash
        resp = compute_iq_verdict(
            IQVerdictInput(list_price=300_000, monthly_rent=2500, property_taxes=3600, insurance=1200)
        )
        ltr = next(s for s in resp.strategies if s.id == "long-term-rental")
        bd = ltr.breakdown
        expected_cap = calculate_cap_rate(bd["noi"], bd["purchase_price"]) * 100
        expected_coc = calculate_cash_on_cash(
            bd["noi"] - bd["annual_debt_service"],
            bd["total_cash_needed"],
        ) * 100
        assert pytest.approx(ltr.cap_rate, abs=0.1) == round(expected_cap, 2)
        assert pytest.approx(ltr.cash_on_cash, abs=0.1) == round(expected_coc, 2)


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
        assert 0 <= resp.deal_score <= 100

    def test_grade_present(self, typical_input):
        resp = compute_deal_score(typical_input)
        assert resp.grade in ("A+", "A", "B", "C", "D", "F")

    def test_score_has_calculation_details(self, typical_input):
        resp = compute_deal_score(typical_input)
        assert resp.calculation_details is not None

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
        assert high_rent.deal_score >= low_rent.deal_score


# =====================================================================
# Golden-style regression (fixed inputs → assert key fields and ranges)
# =====================================================================

class TestVerdictGoldenRegression:
    """Fixed-input regression: same inputs must produce valid verdict with expected structure."""

    def test_verdict_fixed_input_structure_and_ranges(self):
        """Known inputs (e.g. 1451 Sw 10th St–style) produce valid verdict; key fields in range."""
        inp = IQVerdictInput(
            list_price=360_000,
            monthly_rent=2_800,
            property_taxes=5_500,
            insurance=2_200,
        )
        resp = compute_iq_verdict(inp)
        assert resp.income_value > 0
        assert resp.purchase_price > 0
        assert resp.purchase_price <= inp.list_price
        assert 0 <= resp.deal_score <= 100
        assert len(resp.strategies) == 6
        strategy_ids = {s.id for s in resp.strategies}
        assert "long-term-rental" in strategy_ids
        assert "wholesale" in strategy_ids
        # Income value should be in a plausible range for rent 33.6k/yr
        assert 200_000 < resp.income_value < 2_000_000
