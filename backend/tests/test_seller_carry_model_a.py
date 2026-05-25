"""Seller-carry financing — bank loan and cash equity stack."""

import pytest

from app.services.calculators import calculate_ltr, calculate_str


LTR_KW = dict(
    purchase_price=300_000,
    monthly_rent=2_500,
    property_taxes_annual=3_600,
    down_payment_pct=0.20,
    interest_rate=0.06,
    loan_term_years=30,
    closing_costs_pct=0.03,
    vacancy_rate=0.05,
    property_management_pct=0.10,
    maintenance_pct=0.05,
    insurance_annual=1_200,
    utilities_monthly=100,
    landscaping_annual=0,
    pest_control_annual=0,
    appreciation_rate=0.03,
    rent_growth_rate=0.02,
    expense_growth_rate=0.02,
    hoa_monthly=0,
)

STR_KW = dict(
    purchase_price=350_000,
    average_daily_rate=200,
    occupancy_rate=0.75,
    property_taxes_annual=4_200,
    down_payment_pct=0.20,
    interest_rate=0.06,
    loan_term_years=30,
    closing_costs_pct=0.03,
    furniture_setup_cost=15_000,
    platform_fees_pct=0.15,
    str_management_pct=0.10,
    cleaning_cost_per_turnover=150,
    cleaning_fee_revenue=75,
    avg_length_of_stay_days=6,
    supplies_monthly=100,
    additional_utilities_monthly=0,
    insurance_annual=2_100,
    maintenance_annual=3_500,
    landscaping_annual=0,
    pest_control_annual=0,
    hoa_monthly=0,
)


class TestSellerCarryLTR:
    def test_traditional_no_seller(self):
        r = calculate_ltr(**LTR_KW, seller_carry_amount=0)
        assert r["loan_amount"] == pytest.approx(240_000, rel=1e-6)
        assert r["cash_equity_at_close"] == pytest.approx(60_000, rel=1e-6)
        # Calculator excludes rehab; cash = equity + closing only
        assert r["total_cash_required"] == pytest.approx(60_000 + 9_000, rel=1e-6)

    def test_creative_seller_covers_part_of_down(self):
        # 20% down = 60k; seller carries 45k → bank loan is reduced by the seller note.
        r = calculate_ltr(**LTR_KW, seller_carry_amount=45_000, seller_carry_rate=0.06, seller_carry_term_years=30)
        assert r["cash_equity_at_close"] == pytest.approx(15_000, rel=1e-6)
        assert r["loan_amount"] == pytest.approx(195_000, rel=1e-6)
        assert r["total_cash_required"] == pytest.approx(max(0, 60_000 + 9_000 - 45_000), rel=1e-6)

    def test_all_cash_no_financing(self):
        r = calculate_ltr(
            **{**LTR_KW, "down_payment_pct": 1.0},
            seller_carry_amount=0,
        )
        assert r["loan_amount"] == pytest.approx(0, abs=1)
        assert r["monthly_pi"] == pytest.approx(0, abs=1)

    def test_full_purchase_seller_financed(self):
        r = calculate_ltr(
            **{**LTR_KW, "down_payment_pct": 1.0},
            seller_carry_amount=300_000,
            seller_carry_rate=0.05,
            seller_carry_term_years=30,
        )
        assert r["loan_amount"] == pytest.approx(0, abs=1)
        assert r["cash_equity_at_close"] == pytest.approx(0, abs=1)
        # Cash needed = down + closing − seller (rehab 0 in calculator)
        assert r["total_cash_required"] == pytest.approx(max(0, 300_000 + 9_000 - 300_000), rel=1e-6)
        assert r["seller_monthly_pi"] > 0

    def test_zero_down_full_seller_financing(self):
        r = calculate_ltr(
            **{**LTR_KW, "down_payment_pct": 0.0},
            seller_carry_amount=300_000,
            seller_carry_rate=0.05,
            seller_carry_term_years=30,
        )
        assert r["loan_amount"] == pytest.approx(0, abs=1)
        assert r["bank_monthly_pi"] == pytest.approx(0, abs=1)
        assert r["seller_monthly_pi"] > 0
        assert r["monthly_pi"] == pytest.approx(r["seller_monthly_pi"], rel=1e-6)
        assert r["total_cash_required"] == pytest.approx(0, abs=1)


class TestSellerCarrySTR:
    def test_traditional_no_seller(self):
        r = calculate_str(**STR_KW, seller_carry_amount=0)
        exp_loan = 350_000 * 0.80
        assert r["loan_amount"] == pytest.approx(exp_loan, rel=1e-6)

    def test_seller_reduces_cash_stack(self):
        r = calculate_str(
            **STR_KW,
            seller_carry_amount=40_000,
            seller_carry_rate=0.06,
            seller_carry_term_years=30,
        )
        assert r["cash_equity_at_close"] == pytest.approx(30_000, rel=1e-6)
        # Seller note reduces the remaining bank-financed portion.
        exp_loan = 350_000 * 0.80 - 40_000
        assert r["loan_amount"] == pytest.approx(exp_loan, rel=1e-6)
