"""AssumptionResolver — single gateway between DB defaults and calculators.

Responsibilities:
1. Load admin-dashboard defaults from the database (via assumptions_service).
2. Merge user-supplied overrides on top (user values always take precedence).
3. Derive computed values (e.g. insurance_annual from insurance_pct * price).
4. Return fully-populated parameter dicts ready for each calculator function.

No calculator or service should ever import from `app.core.defaults` for
runtime values.  This module is the ONLY bridge.
"""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.property import AllAssumptions
from app.services.assumptions_service import get_default_assumptions

logger = logging.getLogger(__name__)


async def resolve_assumptions(
    db: AsyncSession,
    user_overrides: dict[str, Any] | None = None,
) -> AllAssumptions:
    """Return a fully-populated AllAssumptions with DB defaults + user overrides.

    Priority order (highest wins):
        1. user_overrides (from the request / Deal Maker)
        2. DB-stored admin defaults (set via Admin Dashboard)
        3. Pydantic schema defaults (last-resort fallback)
    """
    admin_defaults = await get_default_assumptions(db)
    base = admin_defaults.model_dump(by_alias=True)

    if user_overrides:
        _deep_merge(base, user_overrides)

    return AllAssumptions.model_validate(base)


def _deep_merge(base: dict, overrides: dict) -> None:
    """Recursively merge *overrides* into *base* in-place.

    - Only non-None values from overrides are applied.
    - Nested dicts are merged recursively (e.g. financing.down_payment_pct).
    """
    for key, value in overrides.items():
        if value is None:
            continue
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value


# ──────────────────────────────────────────────────────────────────────
# Strategy-specific parameter builders
# ──────────────────────────────────────────────────────────────────────
# Each function extracts the exact kwargs that the corresponding
# calculator function requires.  Property-specific data (purchase_price,
# rent, taxes) is passed in; assumptions come from the resolved object.


def build_ltr_params(
    assumptions: AllAssumptions,
    purchase_price: float,
    monthly_rent: float,
    property_taxes_annual: float,
    hoa_monthly: float = 0,
) -> dict[str, Any]:
    f = assumptions.financing
    o = assumptions.operating
    insurance_annual = o.insurance_annual if o.insurance_annual else purchase_price * o.insurance_pct
    return dict(
        purchase_price=purchase_price,
        monthly_rent=monthly_rent,
        property_taxes_annual=property_taxes_annual,
        down_payment_pct=f.down_payment_pct,
        interest_rate=f.interest_rate,
        loan_term_years=f.loan_term_years,
        closing_costs_pct=f.closing_costs_pct,
        vacancy_rate=o.vacancy_rate,
        property_management_pct=o.property_management_pct,
        maintenance_pct=o.maintenance_pct,
        insurance_annual=insurance_annual,
        utilities_monthly=o.utilities_monthly,
        landscaping_annual=o.landscaping_annual,
        pest_control_annual=o.pest_control_annual,
        appreciation_rate=assumptions.appreciation_rate,
        rent_growth_rate=assumptions.rent_growth_rate,
        expense_growth_rate=assumptions.expense_growth_rate,
        hoa_monthly=hoa_monthly,
    )


def build_str_params(
    assumptions: AllAssumptions,
    purchase_price: float,
    average_daily_rate: float,
    occupancy_rate: float,
    property_taxes_annual: float,
    hoa_monthly: float = 0,
) -> dict[str, Any]:
    f = assumptions.financing
    o = assumptions.operating
    s = assumptions.str_assumptions
    insurance_annual = s.str_insurance_annual if s.str_insurance_annual else purchase_price * s.str_insurance_pct
    maintenance_annual = purchase_price * o.maintenance_pct
    return dict(
        purchase_price=purchase_price,
        average_daily_rate=average_daily_rate,
        occupancy_rate=occupancy_rate,
        property_taxes_annual=property_taxes_annual,
        down_payment_pct=f.down_payment_pct,
        interest_rate=f.interest_rate,
        loan_term_years=f.loan_term_years,
        closing_costs_pct=f.closing_costs_pct,
        furniture_setup_cost=s.furniture_setup_cost,
        platform_fees_pct=s.platform_fees_pct,
        str_management_pct=s.str_management_pct,
        cleaning_cost_per_turnover=s.cleaning_cost_per_turnover,
        cleaning_fee_revenue=s.cleaning_fee_revenue,
        avg_length_of_stay_days=s.avg_length_of_stay_days,
        supplies_monthly=s.supplies_monthly,
        additional_utilities_monthly=s.additional_utilities_monthly,
        insurance_annual=insurance_annual,
        maintenance_annual=maintenance_annual,
        landscaping_annual=o.landscaping_annual,
        pest_control_annual=o.pest_control_annual,
        hoa_monthly=hoa_monthly,
    )


def build_brrrr_params(
    assumptions: AllAssumptions,
    market_value: float,
    arv: float,
    monthly_rent_post_rehab: float,
    property_taxes_annual: float,
) -> dict[str, Any]:
    f = assumptions.financing
    o = assumptions.operating
    r = assumptions.rehab
    b = assumptions.brrrr
    renovation_budget = r.renovation_budget if r.renovation_budget else arv * r.renovation_budget_pct
    monthly_holding = r.monthly_holding_costs if r.monthly_holding_costs else (market_value * r.holding_costs_pct) / 12
    refi_closing = b.refinance_closing_costs if b.refinance_closing_costs else arv * b.refinance_closing_costs_pct
    insurance_annual = o.insurance_annual if o.insurance_annual else arv * o.insurance_pct
    return dict(
        market_value=market_value,
        arv=arv,
        monthly_rent_post_rehab=monthly_rent_post_rehab,
        property_taxes_annual=property_taxes_annual,
        purchase_discount_pct=b.purchase_discount_pct or b.buy_discount_pct,
        down_payment_pct=f.down_payment_pct,
        interest_rate=f.interest_rate,
        loan_term_years=f.loan_term_years,
        closing_costs_pct=f.closing_costs_pct,
        renovation_budget=renovation_budget,
        contingency_pct=r.contingency_pct,
        holding_period_months=r.holding_period_months,
        monthly_holding_costs=monthly_holding,
        refinance_ltv=b.refinance_ltv,
        refinance_interest_rate=b.refinance_interest_rate,
        refinance_term_years=b.refinance_term_years,
        refinance_closing_costs=refi_closing,
        vacancy_rate=o.vacancy_rate,
        operating_expense_pct=o.maintenance_pct + o.property_management_pct,
        insurance_annual=insurance_annual,
    )


def build_flip_params(
    assumptions: AllAssumptions,
    market_value: float,
    arv: float,
    property_taxes_annual: float,
) -> dict[str, Any]:
    f = assumptions.financing
    o = assumptions.operating
    r = assumptions.rehab
    fl = assumptions.flip
    renovation_budget = r.renovation_budget if r.renovation_budget else arv * r.renovation_budget_pct
    insurance_annual = o.insurance_annual if o.insurance_annual else market_value * o.insurance_pct
    return dict(
        market_value=market_value,
        arv=arv,
        purchase_discount_pct=fl.purchase_discount_pct,
        hard_money_ltv=fl.hard_money_ltv,
        hard_money_rate=fl.hard_money_rate,
        closing_costs_pct=f.closing_costs_pct,
        renovation_budget=renovation_budget,
        contingency_pct=r.contingency_pct,
        holding_period_months=fl.holding_period_months,
        property_taxes_annual=property_taxes_annual,
        insurance_annual=insurance_annual,
        utilities_monthly=o.utilities_monthly,
        selling_costs_pct=fl.selling_costs_pct,
        capital_gains_rate=0.15,
    )


def build_house_hack_params(
    assumptions: AllAssumptions,
    purchase_price: float,
    monthly_rent_per_room: float,
    rooms_rented: int,
    property_taxes_annual: float,
) -> dict[str, Any]:
    f = assumptions.financing
    o = assumptions.operating
    h = assumptions.house_hack
    insurance_annual = o.insurance_annual if o.insurance_annual else purchase_price * o.insurance_pct
    return dict(
        purchase_price=purchase_price,
        monthly_rent_per_room=monthly_rent_per_room,
        rooms_rented=rooms_rented,
        property_taxes_annual=property_taxes_annual,
        down_payment_pct=h.fha_down_payment_pct,
        interest_rate=h.fha_interest_rate,
        loan_term_years=f.loan_term_years,
        closing_costs_pct=f.closing_costs_pct,
        fha_mip_rate=h.fha_mip_rate,
        insurance_annual=insurance_annual,
    )


def build_wholesale_params(
    assumptions: AllAssumptions,
    arv: float,
    estimated_rehab_costs: float,
) -> dict[str, Any]:
    w = assumptions.wholesale
    return dict(
        arv=arv,
        estimated_rehab_costs=estimated_rehab_costs,
        assignment_fee=w.assignment_fee,
        marketing_costs=w.marketing_costs,
        earnest_money_deposit=w.earnest_money_deposit,
        arv_discount_pct=w.target_purchase_discount_pct,
        days_to_close=w.days_to_close,
    )


def build_valuation_params(
    assumptions: AllAssumptions,
) -> dict[str, float]:
    """Extract the financing/operating params needed by
    estimate_income_value and calculate_buy_price."""
    f = assumptions.financing
    o = assumptions.operating
    return dict(
        down_payment_pct=f.down_payment_pct,
        interest_rate=f.interest_rate,
        loan_term_years=f.loan_term_years,
        vacancy_rate=o.vacancy_rate,
        maintenance_pct=o.maintenance_pct,
        management_pct=o.property_management_pct,
    )
