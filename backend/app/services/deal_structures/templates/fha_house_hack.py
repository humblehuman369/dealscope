"""FHA house-hack — 3.5% down + owner-occ + partial rent (small multifamily or spare bedrooms)."""

from __future__ import annotations

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money, fmt_money_precise

FAMILY = "strategy_switch"
FAMILY_LABEL = "House-hack"
ID = "fha-house-hack"

FHA_DOWN_PCT = 0.035
FHA_RATE_SPREAD = 0.005  # vs conventional baseline in context
MIP_ANNUAL_ON_LOAN = 0.0055  # ~55 bps annual on balance per plan


def _effective_gross_monthly_rent(ctx: StructureContext) -> float | None:
    """Rent attributed to non-owner units / spare bedrooms."""
    if ctx.unit_count is not None and ctx.unit_count >= 2:
        if ctx.unit_count > 4:
            return None
        return ctx.monthly_rent * (ctx.unit_count - 1) / ctx.unit_count
    if ctx.bedrooms >= 2:
        b = max(ctx.bedrooms, 1)
        return ctx.monthly_rent * (ctx.bedrooms - 1) / b
    return None


def _monthly_cf_with_pi(ctx: StructureContext, monthly_rent_gross: float, pi_plus_mip: float) -> float:
    annual_gross = monthly_rent_gross * 12
    eff = annual_gross * (1 - ctx.vacancy_rate)
    opex = (
        ctx.property_taxes_annual
        + ctx.insurance_annual
        + eff * ctx.maintenance_pct
        + eff * ctx.management_pct
        + eff * ctx.capex_pct
        + ctx.utilities_annual
        + ctx.other_annual_expenses
    )
    noi_m = (eff - opex) / 12
    return noi_m - pi_plus_mip


def solve(ctx: StructureContext) -> DealStructure | None:
    if ctx.deal_gap_amount <= 0:
        return None

    eff_rent = _effective_gross_monthly_rent(ctx)
    if eff_rent is None or eff_rent <= 0:
        return None

    if ctx.is_owner_occupied is False:
        return None
    # SFH / rent-a-room: require explicit owner-occ intent. Small multifamily (2–4) can surface without it.
    if ctx.unit_count is None or ctx.unit_count <= 1:
        if ctx.is_owner_occupied is not True:
            return None

    loan_amt = ctx.list_price * (1.0 - FHA_DOWN_PCT)
    fha_rate = min(0.12, ctx.interest_rate + FHA_RATE_SPREAD)
    pi = calculate_monthly_mortgage(loan_amt, fha_rate, 30)
    mip_m = loan_amt * MIP_ANNUAL_ON_LOAN / 12.0
    housing_debt = pi + mip_m

    new_cf = _monthly_cf_with_pi(ctx, eff_rent, housing_debt)
    if new_cf <= ctx.baseline_monthly_cash_flow:
        return None

    monthly_savings = new_cf - ctx.baseline_monthly_cash_flow
    if monthly_savings <= 0:
        return None

    cash_down = ctx.list_price * FHA_DOWN_PCT
    cash_required = round(cash_down + ctx.list_price * ctx.closing_costs_pct, 0)

    ranking = 68.0
    if ctx.unit_count and 2 <= ctx.unit_count <= 4:
        ranking += 8
    if ctx.days_on_market and ctx.days_on_market > 45:
        ranking += 4

    mode = f"{ctx.unit_count}-unit" if ctx.unit_count and ctx.unit_count >= 2 else f"{ctx.bedrooms}BR rent-a-room"
    sel_reason = (
        f"Shown because FHA allows {FHA_DOWN_PCT * 100:.1f}% down when you live in the property—"
        f"here modeled as {mode} income."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="Owner-occ path",
        headline=f"FHA {FHA_DOWN_PCT * 100:.1f}% down — live in it, rent the rest",
        summary=(
            f"Owner-occ FHA at ~{fha_rate * 100:.2f}% + MIP improves cash flow by about {fmt_money(monthly_savings)}/mo "
            f"versus your baseline investor loan—requires living there at least one year."
        ),
        levers=[
            StructureLever(
                label="Modeled gross rent (non-owner)",
                before_label=f"${round(ctx.monthly_rent):,}/mo",
                after_label=f"${round(eff_rent):,}/mo",
                delta_label=None,
            ),
            StructureLever(
                label="FHA P&I + MIP",
                before_label=f"${round(ctx.baseline_monthly_pi):,}/mo",
                after_label=f"${round(housing_debt):,}/mo",
                delta_label=None,
            ),
            StructureLever(
                label="Cash to close (est.)",
                before_label="—",
                after_label=fmt_money_precise(cash_required),
                delta_label=None,
            ),
        ],
        monthly_savings=round(monthly_savings, 2),
        cash_required=float(cash_required),
        ranking_score=min(100.0, max(0.0, ranking)),
        pitch_script=(
            f"I’m planning to owner-occupy and use FHA ({FHA_DOWN_PCT * 100:.1f}% down) while renting "
            f"the other unit(s) / rooms—modeled at about ${round(eff_rent):,}/mo toward the mortgage."
        ),
        caveat="FHA requires you to live in the property for at least 1 year.",
        selection_reason=sel_reason,
        pre_loaded_record={
            "pending_extras": {"three_paths_structure_id": ID, "fha_modeled_rent_share": eff_rent},
            "is_owner_occupied": True,
        },
    )
