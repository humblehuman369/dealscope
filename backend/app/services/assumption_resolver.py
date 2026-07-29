"""AssumptionResolver — single gateway between DB defaults and calculators.

Responsibilities:
1. Layer the four assumption sources into one resolved set (see below).
2. Derive computed values (e.g. insurance_annual from insurance_pct * price).
3. Return fully-populated parameter dicts ready for each calculator function.

Resolution order, lowest precedence first:

    1. Pydantic schema defaults        — app/core/defaults.py constants
    2. Admin dashboard defaults        — admin_assumption_defaults table
    3. ZIP market adjustments          — MARKET_ADJUSTMENTS, when a ZIP is known
    4. The user's saved defaults       — user_profiles.default_assumptions
    5. Per-request overrides           — e.g. a deal maker record's own fields

A user's explicit choice outranks the regional table on purpose: they told us
what they want, and a market average is only a guess at it.

No calculator or service should ever import from `app.core.defaults` for
runtime values.  This module is the ONLY bridge.
"""

import logging
from copy import deepcopy
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.property import AllAssumptions, OperatingAssumptions
from app.services.assumptions_service import get_default_assumptions, get_market_adjustments
from app.services.user_service import user_service

logger = logging.getLogger(__name__)


def _coalesce_none(*values: Any) -> Any:
    """Return the first value that is not None, preserving legitimate zeros."""
    for value in values:
        if value is not None:
            return value
    return None


def _resolve_insurance_annual(o: OperatingAssumptions, base_price: float) -> float:
    """Annual insurance from explicit override or ``base_price × insurance_pct``.

    Uses ``is not None`` so a user-entered ``0`` is preserved.
    """
    if o.insurance_annual is not None:
        return o.insurance_annual
    return base_price * o.insurance_pct


@dataclass(frozen=True)
class AssumptionLayers:
    """A resolved assumption set plus the layers that produced it.

    The individual layers are kept so the defaults API can show a user which of
    their numbers came from where, rather than presenting one opaque blob.
    """

    assumptions: AllAssumptions
    system_defaults: dict[str, Any]
    market_adjustments: dict[str, Any] | None
    user_overrides: dict[str, Any] | None
    region: str | None


async def _load_user_overrides(db: AsyncSession, user: User | None) -> dict[str, Any] | None:
    """The user's saved defaults, or None when absent.

    Read-only on purpose: this runs on every recalculation, and creating a
    profile row as a side effect of an analysis would be a surprising write.
    """
    if user is None:
        return None
    try:
        profile = await user_service.get_profile(db, str(user.id))
    except Exception as e:
        # A missing profile must not cost the user their analysis.
        logger.warning(f"Failed to load user assumptions for {user.id}, ignoring: {e}")
        return None
    if profile is None or not profile.default_assumptions:
        return None
    return profile.default_assumptions


def _market_overrides(zip_code: str | None) -> tuple[dict[str, Any] | None, dict[str, Any] | None, str | None]:
    """Regional adjustments as (raw_table_entry, override_patch, region).

    Only vacancy and appreciation vary regionally in a way we trust enough to
    apply. `appreciation_rate` is top-level to match `AllAssumptions` — nesting
    it under a "growth" key silently drops it.
    """
    if not zip_code:
        return None, None, None

    market = get_market_adjustments(zip_code)
    if not market:
        return None, None, None

    patch: dict[str, Any] = {}
    if "vacancy_rate" in market:
        patch["operating"] = {"vacancy_rate": market["vacancy_rate"]}
    if "appreciation_rate" in market:
        patch["appreciation_rate"] = market["appreciation_rate"]

    return market, (patch or None), market.get("region")


async def resolve_assumption_layers(
    db: AsyncSession,
    *,
    user: User | None = None,
    zip_code: str | None = None,
    request_overrides: dict[str, Any] | None = None,
) -> AssumptionLayers:
    """Layer every assumption source into one resolved set.

    See the module docstring for the precedence order.
    """
    admin_defaults = await get_default_assumptions(db)
    system_defaults = admin_defaults.model_dump(by_alias=True)

    # deepcopy, not `{**system_defaults}`: the merge below mutates nested dicts
    # in place, and a shallow copy shares them. Callers report `system_defaults`
    # as the pre-user baseline, so corrupting it would make the "customised by
    # you" indicators in the defaults editor wrong.
    resolved = deepcopy(system_defaults)

    market, market_patch, region = _market_overrides(zip_code)
    if market_patch:
        _deep_merge(resolved, market_patch)

    user_overrides = await _load_user_overrides(db, user)
    if user_overrides:
        _deep_merge(resolved, user_overrides)

    if request_overrides:
        _deep_merge(resolved, request_overrides)

    return AssumptionLayers(
        assumptions=AllAssumptions.model_validate(resolved),
        system_defaults=system_defaults,
        market_adjustments=market,
        user_overrides=user_overrides,
        region=region,
    )


async def resolve_assumptions(
    db: AsyncSession,
    user_overrides: dict[str, Any] | None = None,
    *,
    user: User | None = None,
    zip_code: str | None = None,
) -> AllAssumptions:
    """Return a fully-populated AllAssumptions for this user and market.

    `user_overrides` is the per-request layer (a deal maker record's own fields);
    pass `user` to also pick up the defaults they saved in their profile.
    """
    layers = await resolve_assumption_layers(
        db,
        user=user,
        zip_code=zip_code,
        request_overrides=user_overrides,
    )
    return layers.assumptions


def finalize_assumptions_for_calculators(
    assumptions: AllAssumptions,
    purchase_price: float,
    arv: float | None = None,
    arv_flip: float | None = None,
) -> None:
    """Fill computed assumption fields before strategy calculators run (mutates in place)."""
    if purchase_price <= 0:
        return

    arv_val = arv if arv is not None and arv > 0 else purchase_price * 1.10
    arv_f = arv_flip if arv_flip is not None and arv_flip > 0 else purchase_price * 1.06

    r = assumptions.rehab
    if r.renovation_budget is None:
        r.renovation_budget = arv_val * r.renovation_budget_pct
    if r.monthly_holding_costs is None:
        r.monthly_holding_costs = (purchase_price * r.holding_costs_pct) / 12

    b = assumptions.brrrr
    if b.refinance_closing_costs is None:
        b.refinance_closing_costs = arv_val * b.refinance_closing_costs_pct

    o = assumptions.operating
    if o.insurance_annual is None:
        o.insurance_annual = _resolve_insurance_annual(o, purchase_price)

    s = assumptions.str_assumptions
    if s.str_insurance_annual is None:
        s.str_insurance_annual = _resolve_insurance_annual(o, purchase_price)


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
    insurance_annual = _resolve_insurance_annual(o, purchase_price)
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
    insurance_annual = _resolve_insurance_annual(o, purchase_price)
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
    renovation_budget = _coalesce_none(r.renovation_budget, arv * r.renovation_budget_pct)
    monthly_holding = _coalesce_none(r.monthly_holding_costs, (market_value * r.holding_costs_pct) / 12)
    refi_closing = _coalesce_none(b.refinance_closing_costs, arv * b.refinance_closing_costs_pct)
    insurance_annual = _resolve_insurance_annual(o, market_value)
    return dict(
        market_value=market_value,
        arv=arv,
        monthly_rent_post_rehab=monthly_rent_post_rehab,
        property_taxes_annual=property_taxes_annual,
        purchase_discount_pct=_coalesce_none(b.purchase_discount_pct, b.buy_discount_pct),
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
    renovation_budget = _coalesce_none(r.renovation_budget, arv * r.renovation_budget_pct)
    insurance_annual = _resolve_insurance_annual(o, market_value)
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
    insurance_annual = _resolve_insurance_annual(o, purchase_price)
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
