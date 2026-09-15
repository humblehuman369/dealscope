"""Regression tests for the Sept 14 walk bugs on Option 3 ($0 second) and Option 4 ($0 CF).

Fails on 680d240: Mcconnell ships a $0 seller-second card; Option 4 solves to break-even.
"""

from __future__ import annotations

from pathlib import Path

from app.core.defaults import FINANCING, OPERATING
from app.core.valuation.income_value import calculate_buy_price, estimate_income_value
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.cashflow import TARGET_MONTHLY_CASH_FLOW
from app.services.deal_structures.templates import (
    ALL_TEMPLATES,
    blended_plan,
    larger_down,
    price_negotiation,
    rent_uplift,
    seller_second_zero_balloon,
)
from tests._deal_structures_helpers import base_ctx

# Spec value from the walk fix. Imported live only in the constant-pin test so
# the Mcconnell / Option 4 cases can fail on 680d240, which has no such symbol.
MIN_SECOND_AS_PCT_OF_PRICE = 0.02


def _standard_terms_ctx(*, list_price: float, monthly_rent: float, property_taxes_annual: float):
    """Walk-style fixture: production financing + operating defaults, insurance at 1% of list."""
    insurance = list_price * OPERATING.insurance_pct
    utilities = OPERATING.utilities_monthly * 12
    other = OPERATING.landscaping_annual + OPERATING.pest_control_annual
    iv = estimate_income_value(
        monthly_rent=monthly_rent,
        property_taxes=property_taxes_annual,
        insurance=insurance,
        down_payment_pct=FINANCING.down_payment_pct,
        interest_rate=FINANCING.interest_rate,
        loan_term_years=FINANCING.loan_term_years,
        vacancy_rate=OPERATING.vacancy_rate,
        maintenance_pct=OPERATING.maintenance_pct,
        management_pct=OPERATING.property_management_pct,
        capex_pct=OPERATING.capex_pct,
        utilities_annual=utilities,
        other_annual_expenses=other,
        reference_purchase_price=list_price,
    )
    tb = calculate_buy_price(
        market_price=list_price,
        monthly_rent=monthly_rent,
        property_taxes=property_taxes_annual,
        insurance=insurance,
        down_payment_pct=FINANCING.down_payment_pct,
        interest_rate=FINANCING.interest_rate,
        loan_term_years=FINANCING.loan_term_years,
        vacancy_rate=OPERATING.vacancy_rate,
        maintenance_pct=OPERATING.maintenance_pct,
        management_pct=OPERATING.property_management_pct,
        capex_pct=OPERATING.capex_pct,
        utilities_annual=utilities,
        other_annual_expenses=other,
    )
    return base_ctx(
        list_price=list_price,
        target_buy_price=tb,
        income_value=iv,
        deal_gap_pct=(list_price - tb) / list_price * 100 if list_price else 0,
        monthly_rent=monthly_rent,
        property_taxes_annual=property_taxes_annual,
        insurance_annual=insurance,
        down_payment_pct=FINANCING.down_payment_pct,
        interest_rate=FINANCING.interest_rate,
        loan_term_years=FINANCING.loan_term_years,
        closing_costs_pct=FINANCING.closing_costs_pct,
        vacancy_rate=OPERATING.vacancy_rate,
        maintenance_pct=OPERATING.maintenance_pct,
        management_pct=OPERATING.property_management_pct,
        capex_pct=OPERATING.capex_pct,
        utilities_annual=utilities,
        other_annual_expenses=other,
    )


def _mcconnell_ctx():
    # 4944 Mcconnell Street: list $499,999, Income Value near $367,467, Target Buy near $349,094.
    return _standard_terms_ctx(
        list_price=499_999, monthly_rent=3_050, property_taxes_annual=5_000
    )


def _loxahatchee_ctx():
    # 1766 Wandering Willow Way: list $625,999, second about $122,805 at the full ask.
    return _standard_terms_ctx(
        list_price=625_999, monthly_rent=4_331, property_taxes_annual=11_100
    )


def _seller_carry(structure) -> float | None:
    if structure is None:
        return None
    extras = (structure.pre_loaded_record or {}).get("pending_extras") or {}
    carry = extras.get("seller_carry_amount")
    return None if carry is None else float(carry)


def test_option_3_does_not_ship_zero_seller_second_on_mcconnell():
    ctx = _mcconnell_ctx()
    assert abs(ctx.income_value - 367_467) < 2_000
    assert abs(ctx.target_buy_price - 349_094) < 2_000
    assert seller_second_zero_balloon.solve(ctx) is None


def test_loxahatchee_seller_second_is_about_122805():
    ctx = _loxahatchee_ctx()
    result = seller_second_zero_balloon.solve(ctx)
    assert result is not None
    carry = _seller_carry(result)
    assert carry is not None
    assert abs(carry - 122_805) < 2_000


def test_no_returned_structure_has_seller_carry_below_minimum():
    contexts = (_mcconnell_ctx(), _loxahatchee_ctx(), base_ctx())
    for ctx in contexts:
        for template in ALL_TEMPLATES:
            _assert_carry_meets_minimum(template.solve(ctx), ctx)
        blend = blended_plan.solve(
            ctx,
            price_result=price_negotiation.solve(ctx),
            seller2nd_result=seller_second_zero_balloon.solve(ctx),
            rent_result=rent_uplift.solve(ctx),
        )
        _assert_carry_meets_minimum(blend, ctx)


def _assert_carry_meets_minimum(structure, ctx) -> None:
    carry = _seller_carry(structure)
    if structure is None or carry is None:
        return
    if carry <= 0:
        visible = " ".join(
            [structure.headline, *(structure.bullets or []), structure.summary or ""]
        ).lower()
        assert "seller 2nd" not in visible
        assert "$0" not in structure.headline
        return
    price = float((structure.pre_loaded_record or {}).get("custom_purchase_price") or ctx.list_price)
    assert carry >= price * MIN_SECOND_AS_PCT_OF_PRICE, (
        f"{structure.id} seller_carry_amount={carry} below {price * MIN_SECOND_AS_PCT_OF_PRICE}"
    )


def test_option_4_loxahatchee_cash_flow_meets_cushion():
    ctx = _loxahatchee_ctx()
    result = larger_down.solve(ctx)
    assert result is not None
    extras = (result.pre_loaded_record or {}).get("pending_extras") or {}
    down = float(extras["down_payment_pct_override"])
    new_loan = ctx.list_price * (1 - down)
    new_pi = calculate_monthly_mortgage(new_loan, ctx.interest_rate, ctx.loan_term_years)
    cf = ctx.baseline_monthly_cash_flow + ctx.baseline_monthly_pi - new_pi
    assert cf >= TARGET_MONTHLY_CASH_FLOW - 0.05


def test_mcconnell_blend_does_not_describe_a_zero_seller_second():
    ctx = _mcconnell_ctx()
    blend = blended_plan.solve(
        ctx,
        price_result=price_negotiation.solve(ctx),
        seller2nd_result=seller_second_zero_balloon.solve(ctx),
        rent_result=rent_uplift.solve(ctx),
    )
    if blend is None:
        return
    carry = _seller_carry(blend) or 0.0
    assert carry == 0.0 or carry >= ctx.list_price * MIN_SECOND_AS_PCT_OF_PRICE
    if carry == 0.0:
        assert "seller 2nd" not in blend.headline.lower()
        assert "$0" not in blend.headline
        assert not any("seller 2nd" in bullet.lower() for bullet in blend.bullets)


def test_templates_have_no_literal_25_cash_flow_target():
    root = (
        Path(__file__).resolve().parents[1]
        / "app"
        / "services"
        / "deal_structures"
        / "templates"
    )
    offenders = [path.name for path in sorted(root.glob("*.py")) if "25.0" in path.read_text()]
    assert offenders == []


def test_min_second_constant_matches_spec():
    assert seller_second_zero_balloon.MIN_SECOND_AS_PCT_OF_PRICE == MIN_SECOND_AS_PCT_OF_PRICE
