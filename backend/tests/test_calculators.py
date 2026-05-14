"""Comprehensive unit tests for all 6 strategy calculators + scoring.

Covers: happy path, edge cases (zeros, negatives, boundaries), and
regression tests for previous bug fixes (LTR equity, flip profit).

Each calculator's `_BASE` dict mirrors the values an `assumption_resolver`
caller would pass in production, sourced from `app.core.defaults` so the
tests track the same defaults the rest of the app uses.
"""

import pytest
from app.core.defaults import BRRRR, FLIP, GROWTH, HOUSE_HACK, OPERATING, REHAB, STR, WHOLESALE
from app.services.calculators import (
    CalculationInputError,
    calculate_brrrr,
    calculate_flip,
    calculate_house_hack,
    calculate_ltr,
    calculate_monthly_mortgage,
    calculate_seller_motivation,
    calculate_str,
    calculate_wholesale,
)

# =====================================================
# LTR
# =====================================================


class TestLTRCalculator:
    _BASE = dict(
        purchase_price=300_000,
        monthly_rent=2500,
        property_taxes_annual=3600,
        down_payment_pct=0.20,
        interest_rate=0.06,
        loan_term_years=30,
        closing_costs_pct=0.03,
        vacancy_rate=0.05,
        property_management_pct=0.10,
        maintenance_pct=0.05,
        insurance_annual=1200,
        utilities_monthly=OPERATING.utilities_monthly,
        landscaping_annual=OPERATING.landscaping_annual,
        pest_control_annual=OPERATING.pest_control_annual,
        appreciation_rate=GROWTH.appreciation_rate,
        rent_growth_rate=GROWTH.rent_growth_rate,
        expense_growth_rate=GROWTH.expense_growth_rate,
    )

    def test_required_keys_present(self):
        result = calculate_ltr(**self._BASE)
        for key in (
            "monthly_cash_flow",
            "annual_cash_flow",
            "cash_on_cash_return",
            "cap_rate",
            "total_cash_required",
            "ten_year_projection",
        ):
            assert key in result

    def test_positive_cash_flow(self):
        result = calculate_ltr(**{**self._BASE, "purchase_price": 200_000, "monthly_rent": 2500})
        assert result["monthly_cash_flow"] > 0
        assert result["cash_on_cash_return"] > 0

    def test_zero_vacancy_improves_cash_flow(self):
        base = calculate_ltr(**self._BASE)
        zero_vac = calculate_ltr(**{**self._BASE, "vacancy_rate": 0.0})
        assert zero_vac["monthly_cash_flow"] > base["monthly_cash_flow"]

    def test_equity_projection_uses_amortization(self):
        """Regression: year-1 equity must use the proper remaining-balance formula."""
        result = calculate_ltr(**self._BASE)
        proj = result["ten_year_projection"]
        assert len(proj) > 0
        year1 = next(p for p in proj if p["year"] == 1)
        down = 300_000 * 0.20
        # Year-1 equity is purchase price * (1 + appreciation) - remaining loan balance.
        # Should exceed the down payment by appreciation + small principal paydown.
        assert year1["equity"] > down

    def test_zero_interest_rate(self):
        result = calculate_ltr(**{**self._BASE, "interest_rate": 0.0})
        assert result["monthly_cash_flow"] is not None

    def test_zero_purchase_price_raises(self):
        with pytest.raises(CalculationInputError):
            calculate_ltr(**{**self._BASE, "purchase_price": 0})


# =====================================================
# STR
# =====================================================


class TestSTRCalculator:
    _BASE = dict(
        purchase_price=350_000,
        average_daily_rate=200,
        occupancy_rate=0.75,
        property_taxes_annual=4200,
        down_payment_pct=0.20,
        interest_rate=0.06,
        loan_term_years=30,
        closing_costs_pct=0.03,
        furniture_setup_cost=STR.furniture_setup_cost,
        platform_fees_pct=STR.platform_fees_pct,
        str_management_pct=STR.str_management_pct,
        cleaning_cost_per_turnover=STR.cleaning_cost_per_turnover,
        cleaning_fee_revenue=STR.cleaning_fee_revenue,
        avg_length_of_stay_days=STR.avg_length_of_stay_days,
        supplies_monthly=STR.supplies_monthly,
        additional_utilities_monthly=STR.additional_utilities_monthly,
        insurance_annual=3500,  # ~1% of $350k purchase price
        maintenance_annual=2500,
        landscaping_annual=OPERATING.landscaping_annual,
        pest_control_annual=OPERATING.pest_control_annual,
    )

    def test_required_keys_present(self):
        result = calculate_str(**self._BASE)
        for key in (
            "total_gross_revenue",
            "noi",
            "monthly_cash_flow",
            "cap_rate",
            "cash_on_cash_return",
            "seasonality_analysis",
        ):
            assert key in result

    def test_higher_occupancy_improves_revenue(self):
        low = calculate_str(**{**self._BASE, "occupancy_rate": 0.50})
        high = calculate_str(**{**self._BASE, "occupancy_rate": 0.90})
        assert high["total_gross_revenue"] > low["total_gross_revenue"]

    def test_custom_seasonality(self):
        custom = [
            {"name": "High", "months": 6, "occupancy_multiplier": 0.95, "adr_multiplier": 1.3},
            {"name": "Low", "months": 6, "occupancy_multiplier": 0.55, "adr_multiplier": 0.7},
        ]
        result = calculate_str(**self._BASE, seasonality=custom)
        assert len(result["seasonality_analysis"]) == 2
        assert result["seasonality_analysis"][0]["season"] == "High"

    def test_break_even_occupancy_valid(self):
        result = calculate_str(**self._BASE)
        assert 0 < result["break_even_occupancy"] < 1


# =====================================================
# BRRRR
# =====================================================


class TestBRRRRCalculator:
    _BASE = dict(
        market_value=200_000,
        arv=300_000,
        monthly_rent_post_rehab=2200,
        property_taxes_annual=3000,
        purchase_discount_pct=0.15,
        down_payment_pct=0.20,
        interest_rate=0.06,
        loan_term_years=30,
        closing_costs_pct=0.03,
        renovation_budget=40_000,
        contingency_pct=0.10,
        holding_period_months=4,
        monthly_holding_costs=2000,
        refinance_ltv=BRRRR.refinance_ltv,
        refinance_interest_rate=BRRRR.refinance_interest_rate,
        refinance_term_years=BRRRR.refinance_term_years,
        refinance_closing_costs=3500,
        vacancy_rate=OPERATING.vacancy_rate,
        operating_expense_pct=OPERATING.maintenance_pct + OPERATING.capex_pct,
        insurance_annual=2000,  # ~1% of $200k market value
    )

    def test_required_keys_present(self):
        result = calculate_brrrr(**self._BASE)
        for key in (
            "cash_left_in_deal",
            "post_refi_monthly_cash_flow",
            "infinite_roi_achieved",
        ):
            assert key in result

    def test_strong_arv_reduces_cash_left(self):
        """A higher ARV pulls more cash out at refi → less left in the deal."""
        base = calculate_brrrr(**self._BASE)
        strong = calculate_brrrr(**{**self._BASE, "arv": 350_000})
        assert strong["cash_left_in_deal"] < base["cash_left_in_deal"]

    def test_no_discount_still_works(self):
        result = calculate_brrrr(**{**self._BASE, "purchase_discount_pct": 0})
        assert "post_refi_monthly_cash_flow" in result


# =====================================================
# Fix & Flip
# =====================================================


class TestFlipCalculator:
    _BASE = dict(
        market_value=250_000,
        arv=350_000,
        purchase_discount_pct=0.20,
        hard_money_ltv=FLIP.hard_money_ltv,
        hard_money_rate=FLIP.hard_money_rate,
        closing_costs_pct=0.03,
        renovation_budget=50_000,
        contingency_pct=REHAB.contingency_pct,
        holding_period_months=6,
        property_taxes_annual=3000,
        insurance_annual=2500,  # ~1% of $250k market value
        utilities_monthly=OPERATING.utilities_monthly,
        selling_costs_pct=FLIP.selling_costs_pct,
        capital_gains_rate=0.15,
    )

    def test_required_keys_present(self):
        result = calculate_flip(**self._BASE)
        for key in (
            "net_profit_before_tax",
            "net_profit_after_tax",
            "roi",
            "total_cash_required",
            "total_holding_costs",
        ):
            assert key in result

    def test_profit_with_good_arv(self):
        result = calculate_flip(**{**self._BASE, "arv": 400_000})
        assert result["net_profit_before_tax"] > 0
        assert result["roi"] > 0

    def test_flip_profit_formula_correctness(self):
        """Regression: net_profit_before_tax = net_sale_proceeds - total_project_cost."""
        result = calculate_flip(**self._BASE)
        expected = result["net_sale_proceeds"] - result["total_project_cost"]
        assert abs(result["net_profit_before_tax"] - expected) < 0.01

    def test_zero_renovation_budget(self):
        result = calculate_flip(**{**self._BASE, "renovation_budget": 0})
        assert "net_profit_before_tax" in result


# =====================================================
# House Hack
# =====================================================


class TestHouseHackCalculator:
    _BASE = dict(
        purchase_price=300_000,
        monthly_rent_per_room=800,
        rooms_rented=2,
        property_taxes_annual=3600,
        owner_unit_market_rent=1500,
        down_payment_pct=HOUSE_HACK.fha_down_payment_pct,
        interest_rate=HOUSE_HACK.fha_interest_rate,
        loan_term_years=30,
        closing_costs_pct=0.03,
        fha_mip_rate=HOUSE_HACK.fha_mip_rate,
        insurance_annual=3000,  # ~1% of $300k purchase price
    )

    def test_required_keys_present(self):
        result = calculate_house_hack(**self._BASE)
        for key in (
            "savings_vs_renting_a",
            "net_housing_cost_scenario_a",
            "total_cash_required",
        ):
            assert key in result

    def test_rent_reduces_housing_cost(self):
        """Higher per-room rent should drive net housing cost lower than the
        gross PITI (i.e. tenant income offsets some of the owner's payment)."""
        result = calculate_house_hack(**{**self._BASE, "monthly_rent_per_room": 1000})
        assert result["net_housing_cost_scenario_a"] < result["monthly_piti"]

    def test_zero_rooms_rented(self):
        """No rental income → no savings vs. renting a comparable unit."""
        result = calculate_house_hack(**{**self._BASE, "rooms_rented": 0})
        assert result["savings_vs_renting_a"] <= 0


# =====================================================
# Wholesale
# =====================================================


class TestWholesaleCalculator:
    _BASE = dict(
        arv=400_000,
        estimated_rehab_costs=50_000,
        assignment_fee=15_000,
        marketing_costs=500,
        earnest_money_deposit=1000,
        arv_discount_pct=WHOLESALE.target_purchase_discount_pct,  # 0.30
        days_to_close=45,
    )

    def test_required_keys_present(self):
        result = calculate_wholesale(**self._BASE)
        for key in ("seventy_pct_max_offer", "contract_price", "net_profit", "roi"):
            assert key in result

    def test_70_percent_rule(self):
        """At 30% ARV discount, MAO = ARV * 0.70 - rehab. (a.k.a. the 70% rule.)"""
        result = calculate_wholesale(**self._BASE)
        expected_mao = 400_000 * 0.70 - 50_000
        assert result["seventy_pct_max_offer"] == expected_mao
        assert result["contract_price"] == expected_mao

    def test_high_assignment_fee(self):
        result = calculate_wholesale(**{**self._BASE, "assignment_fee": 50_000})
        assert result["net_profit"] > 0

    def test_zero_rehab_cost(self):
        result = calculate_wholesale(**{**self._BASE, "estimated_rehab_costs": 0})
        expected_mao = 400_000 * 0.70
        assert result["seventy_pct_max_offer"] == expected_mao


# =====================================================
# Seller Motivation
# =====================================================


class TestSellerMotivation:
    def test_score_in_range(self):
        result = calculate_seller_motivation(days_on_market=30, price_reduction_count=1)
        assert 0 <= result["score"] <= 100

    def test_high_dom_increases_score(self):
        short = calculate_seller_motivation(days_on_market=10, price_reduction_count=0)
        long = calculate_seller_motivation(days_on_market=180, price_reduction_count=0)
        assert long["score"] > short["score"]

    def test_price_drops_increase_score(self):
        none = calculate_seller_motivation(days_on_market=60, price_reduction_count=0)
        many = calculate_seller_motivation(days_on_market=60, price_reduction_count=3)
        assert many["score"] > none["score"]

    def test_zero_dom_valid(self):
        result = calculate_seller_motivation(days_on_market=0, price_reduction_count=0)
        assert result["score"] >= 0


# =====================================================
# Common helpers
# =====================================================


class TestCommonHelpers:
    def test_monthly_mortgage_zero_rate(self):
        pmt = calculate_monthly_mortgage(240_000, 0.0, 30)
        assert abs(pmt - 240_000 / 360) < 0.01

    def test_monthly_mortgage_standard(self):
        pmt = calculate_monthly_mortgage(240_000, 0.06, 30)
        assert 1400 < pmt < 1500  # ~$1,438.92
