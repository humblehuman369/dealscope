"""Rent uplift (Option 1) — Target Rent must cash-flow at Market Price when applied."""

from __future__ import annotations

from app.services.deal_structures.templates import rent_uplift

from tests._deal_structures_helpers import base_ctx


def _monthly_cf_at_list(ctx, monthly_rent: float) -> float:
    annual_gross = monthly_rent * 12
    eff = annual_gross * (1 - ctx.vacancy_rate)
    opex = (
        ctx.property_taxes_annual
        + ctx.insurance_annual
        + annual_gross * ctx.maintenance_pct
        + annual_gross * ctx.management_pct
        + annual_gross * ctx.capex_pct
        + ctx.utilities_annual
        + ctx.other_annual_expenses
    )
    return (eff - opex) / 12 - ctx.baseline_monthly_pi


def test_target_rent_positive_cash_flow_at_list_even_when_bump_exceeds_20_pct():
    ctx = base_ctx(list_price=400_000, target_buy_price=360_000, monthly_rent=2800)
    result = rent_uplift.solve(ctx)
    assert result is not None
    new_rent = result.pre_loaded_record["custom_rent_estimate"]
    assert new_rent > ctx.monthly_rent * 1.20  # gap too large for old 20% cap
    cf = _monthly_cf_at_list(ctx, new_rent)
    assert cf >= 25.0 - 0.01
    assert result.pre_loaded_record["custom_purchase_price"] == ctx.list_price


def test_returns_none_when_deal_gap_closed():
    ctx = base_ctx(target_buy_price=400_000, deal_gap_pct=0)
    assert rent_uplift.solve(ctx) is None
