"""Solvers must hit the $300/month Plan target, not $300/year.

The old cushion was $25/month. That printed as $300/year and failed the
$300/month Plan bar on every property where the cushion path succeeded.
"""

from __future__ import annotations

from app.core.valuation.income_value import calculate_buy_price, estimate_income_value
from app.services.deal_structures.cashflow import (
    TARGET_MONTHLY_CASH_FLOW_USD,
    project_monthly_cash_flow,
)
from app.services.deal_structures.templates import (
    blended_plan,
    price_negotiation,
    rent_uplift,
    seller_second_zero_balloon,
)
from tests._deal_structures_helpers import base_ctx

# P1-11 / Sept 13 Wandering Willow fixture. Opex matches the live worksheet
# that previously closed Option 3 at $25/month ($300/year).
_WILLOW = dict(
    list_price=625_999,
    monthly_rent=4_345,
    income_value=477_699,
    target_buy_price=453_814,
    deal_gap_pct=27.5,
    property_taxes_annual=11_520,
    insurance_annual=4_646.82,
    other_annual_expenses=308 * 12,
    vacancy_rate=0.04,
    management_pct=0.00,
    maintenance_pct=0.01,
    capex_pct=0.05,
    down_payment_pct=0.20,
    interest_rate=0.06,
    loan_term_years=30,
    is_listed=True,
)

# Listed checks from the units investigation (ask + zip-median rent).
_PAR_DRIVE = dict(
    list_price=359_900,
    monthly_rent=2_810,
    property_taxes_annual=6_622,
    insurance_annual=3_599,
    vacancy_rate=0.04,
    management_pct=0.00,
    maintenance_pct=0.01,
    capex_pct=0.05,
    down_payment_pct=0.20,
    interest_rate=0.06,
    loan_term_years=30,
    is_listed=True,
)
_WOODWORTH = dict(
    list_price=569_900,
    monthly_rent=4_290,
    property_taxes_annual=10_486,
    insurance_annual=5_699,
    vacancy_rate=0.04,
    management_pct=0.00,
    maintenance_pct=0.01,
    capex_pct=0.05,
    down_payment_pct=0.20,
    interest_rate=0.06,
    loan_term_years=30,
    is_listed=True,
)


def _ctx_with_gap(**overrides):
    merged = dict(
        down_payment_pct=0.20,
        interest_rate=0.06,
        loan_term_years=30,
        vacancy_rate=0.04,
        maintenance_pct=0.01,
        management_pct=0.00,
        capex_pct=0.05,
    )
    merged.update(overrides)
    price = merged["list_price"]
    rent = merged["monthly_rent"]
    tax = merged["property_taxes_annual"]
    ins = merged["insurance_annual"]
    if "income_value" not in merged:
        merged["income_value"] = estimate_income_value(
            monthly_rent=rent,
            property_taxes=tax,
            insurance=ins,
            down_payment_pct=merged["down_payment_pct"],
            interest_rate=merged["interest_rate"],
            loan_term_years=merged["loan_term_years"],
            vacancy_rate=merged["vacancy_rate"],
            maintenance_pct=merged["maintenance_pct"],
            management_pct=merged["management_pct"],
            capex_pct=merged["capex_pct"],
            other_annual_expenses=merged.get("other_annual_expenses", 0),
            reference_purchase_price=price,
        )
    if "target_buy_price" not in merged:
        merged["target_buy_price"] = calculate_buy_price(
            market_price=price,
            monthly_rent=rent,
            property_taxes=tax,
            insurance=ins,
            down_payment_pct=merged["down_payment_pct"],
            interest_rate=merged["interest_rate"],
            loan_term_years=merged["loan_term_years"],
            vacancy_rate=merged["vacancy_rate"],
            maintenance_pct=merged["maintenance_pct"],
            management_pct=merged["management_pct"],
            capex_pct=merged["capex_pct"],
            other_annual_expenses=merged.get("other_annual_expenses", 0),
        )
    if "deal_gap_pct" not in merged and price:
        merged["deal_gap_pct"] = (price - merged["target_buy_price"]) / price * 100
    return base_ctx(**merged)


def _solved_monthly_cf(ctx, result) -> float:
    rec = result.pre_loaded_record or {}
    extras = rec.get("pending_extras") or {}
    return project_monthly_cash_flow(
        ctx,
        purchase_price=float(rec.get("custom_purchase_price") or ctx.list_price),
        monthly_rent=float(rec.get("custom_rent_estimate") or ctx.monthly_rent),
        seller_carry_amount=float(extras.get("seller_carry_amount") or 0),
        seller_carry_rate=0.0,
        seller_carry_term_years=int(extras.get("seller_carry_term_years") or 5),
    )


def _blend(ctx):
    opt3 = seller_second_zero_balloon.solve(ctx)
    return blended_plan.solve(
        ctx,
        price_result=price_negotiation.solve(ctx),
        seller2nd_result=opt3,
        rent_result=rent_uplift.solve(ctx),
    ), opt3


def _assert_hits_monthly_target(monthly_cf: float, *, label: str) -> None:
    annual = monthly_cf * 12
    assert annual != 300.0, f"{label} landed on $300/year — the old $25/month cushion"
    assert monthly_cf >= TARGET_MONTHLY_CASH_FLOW_USD - 1.0, (
        f"{label} monthly CF {monthly_cf:.2f} missed ${TARGET_MONTHLY_CASH_FLOW_USD:.0f}/month"
    )


def test_constant_is_three_hundred_dollars_per_month():
    assert TARGET_MONTHLY_CASH_FLOW_USD == 300.0


def test_willow_option_3_sept13_fixture_is_not_300_a_year():
    ctx = _ctx_with_gap(**_WILLOW)
    opt3 = seller_second_zero_balloon.solve(ctx)
    assert opt3 is not None
    _assert_hits_monthly_target(_solved_monthly_cf(ctx, opt3), label="Willow Option 3")


def test_willow_blend_sept13_fixture_is_not_300_a_year():
    ctx = _ctx_with_gap(**_WILLOW)
    blend, _ = _blend(ctx)
    assert blend is not None
    _assert_hits_monthly_target(_solved_monthly_cf(ctx, blend), label="Willow blend")


def test_par_drive_option_3_and_blend_are_not_300_a_year():
    ctx = _ctx_with_gap(**_PAR_DRIVE)
    blend, opt3 = _blend(ctx)
    assert opt3 is not None
    assert blend is not None
    _assert_hits_monthly_target(_solved_monthly_cf(ctx, opt3), label="Par Drive Option 3")
    _assert_hits_monthly_target(_solved_monthly_cf(ctx, blend), label="Par Drive blend")


def test_woodworth_option_3_and_blend_are_not_300_a_year():
    ctx = _ctx_with_gap(**_WOODWORTH)
    blend, opt3 = _blend(ctx)
    assert opt3 is not None
    assert blend is not None
    _assert_hits_monthly_target(_solved_monthly_cf(ctx, opt3), label="Woodworth Option 3")
    _assert_hits_monthly_target(_solved_monthly_cf(ctx, blend), label="Woodworth blend")
