"""Golden tests for valuation snapshot SSOT."""

import pytest

from app.core.valuation import ValuationInputs, build_valuation_snapshot, estimate_income_value
from app.core.valuation.snapshot import VALUATION_FORMULA_VERSION


def _ltr_inputs(**overrides) -> ValuationInputs:
    base = dict(
        monthly_rent=2500,
        property_taxes=3600,
        insurance=1200,
        list_price=555_000,
        purchase_price=555_000,
        down_payment_pct=0.20,
        interest_rate=0.06,
        loan_term_years=30,
        vacancy_rate=0.05,
        maintenance_pct=0.05,
        management_pct=0.08,
        capex_pct=0.05,
        utilities_annual=1200,
        other_annual_expenses=200,
        buy_discount_pct=0.05,
    )
    base.update(overrides)
    return ValuationInputs(**base)


class TestValuationSnapshot:
    def test_formula_version(self):
        snap = build_valuation_snapshot(_ltr_inputs())
        assert snap["formula_version"] == VALUATION_FORMULA_VERSION

    def test_noi_expense_basis_gross(self):
        snap = build_valuation_snapshot(_ltr_inputs())
        assert snap["noi_expense_basis"] == "gross"

    def test_breakeven_cash_flow_at_income_value(self):
        """At income_value, monthly cash flow should be near zero from same snapshot."""
        inputs = _ltr_inputs()
        snap_iv = build_valuation_snapshot(inputs)
        iv = snap_iv["income_value"]
        assert iv is not None and iv > 0

        at_iv = build_valuation_snapshot(
            ValuationInputs(**{**inputs.__dict__, "purchase_price": iv})
        )
        assert abs(at_iv["monthly_cash_flow"]) < 50

    def test_cash_buyer_cap_rate_floor(self):
        iv = estimate_income_value(
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
            down_payment_pct=1.0,
        )
        assert iv > 0

    def test_seller_carry_changes_income_value(self):
        base = estimate_income_value(
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
            reference_purchase_price=500_000,
        )
        with_seller = estimate_income_value(
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
            seller_carry_amount=50_000,
            seller_carry_rate=0.0,
            seller_carry_term_years=30,
            reference_purchase_price=500_000,
        )
        assert with_seller != base

    def test_zero_rent_income_value_zero(self):
        snap = build_valuation_snapshot(_ltr_inputs(monthly_rent=0))
        assert snap["income_value"] is None or snap["income_value"] == 0

    def test_zero_interest_rate_uses_default_not_inflated_iv(self):
        """interest_rate=0 must not imply 0% mortgage (which inflates Income Value ~2x list)."""
        inputs = _ltr_inputs(
            monthly_rent=8132,
            property_taxes=15125,
            insurance=8132,
            list_price=813_177,
            purchase_price=813_177,
            down_payment_pct=0.30,
            interest_rate=0.0,
            other_annual_expenses=200 + 24_000,
        )
        snap = build_valuation_snapshot(inputs)
        assert snap["income_value"] is not None
        assert snap["income_value"] < inputs.list_price * 1.2

    def test_percent_interest_rate_normalized(self):
        iv = estimate_income_value(
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
            interest_rate=8,
            down_payment_pct=0.20,
        )
        iv_decimal = estimate_income_value(
            monthly_rent=2500,
            property_taxes=3600,
            insurance=1200,
            interest_rate=0.08,
            down_payment_pct=0.20,
        )
        assert iv == iv_decimal

    def test_price_gap_fields(self):
        snap = build_valuation_snapshot(_ltr_inputs())
        assert snap["price_gap_to_income_pct"] is not None
        iv = snap["income_value"]
        assert iv is not None
        expected = (iv - 555_000) / 555_000
        assert snap["price_gap_to_income_pct"] == pytest.approx(expected, rel=1e-4)
