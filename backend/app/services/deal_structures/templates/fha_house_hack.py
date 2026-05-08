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
        bullets=[
            f"FHA {FHA_DOWN_PCT * 100:.1f}% down (owner-occ)",
            f"Live in it, rent the rest ({mode})",
        ],
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
            "WHO TO CALL\n"
            "Yourself first — this is a strategy switch from \"investor\" to \"owner-occupant.\" "
            "Then the listing agent, where this becomes your strongest offer-position lever.\n\n"
            "WHY YOU'RE CHANGING THE PLAY\n"
            "The deal can't work as a pure investor — but it CAN work as an owner-occupant using FHA. "
            f"By living in the property for at least 1 year, you qualify for {FHA_DOWN_PCT * 100:.1f}% "
            f"down ({fmt_money(cash_down)} cash to close), an owner-occupied rate near "
            f"{fha_rate * 100:.2f}%, and you can rent the other "
            f"{mode} for ~${round(eff_rent):,}/mo toward your housing cost. Net effect: housing "
            f"cost drops by ~{fmt_money(monthly_savings)}/mo vs. your investor baseline.\n\n"
            "THE OWNER-OCCUPANT POSITION IS A NEGOTIATION ADVANTAGE\n"
            "Sellers — especially residential sellers — often prefer to sell to a family rather "
            "than an investor. Use that. FHA also requires a stricter appraisal, which signals "
            "you're serious and can't easily walk during inspection.\n\n"
            "PITCH TO THE LISTING AGENT\n"
            f"\"My offer is FHA financing, {FHA_DOWN_PCT * 100:.1f}% down, owner-occupant. My "
            "family and I plan to live in the property and rent the other "
            f"{mode}. I'm pre-approved through an FHA-approved lender and ready to move on "
            "the inspection within a week. Could the seller's preference between an owner-occupant "
            "and an investor help us get to terms?\"\n\n"
            "OFFER COVER LETTER (when allowed by state/agent)\n"
            "\"My family and I plan to live in the [unit/upstairs] and rent the rest while we "
            "settle into the neighborhood. We've already been pre-approved for FHA financing and "
            "can close within 30 days. We love what you've done with the property and would be "
            "honored to make it our home.\"\n\n"
            "PROTECT YOURSELF — FHA APPRAISAL RED FLAGS\n"
            "FHA appraisers flag and require fixes for:\n"
            "\u2022 Peeling paint (especially on pre-1978 construction — lead paint concern)\n"
            "\u2022 Loose handrails on any staircase with 3+ steps\n"
            "\u2022 Broken windows, missing window screens (region-dependent)\n"
            "\u2022 Roof life under 2 years remaining\n"
            "\u2022 Unfunctional HVAC, water heater, electrical panel issues\n"
            "Walk the property with your agent specifically looking for these BEFORE you commit. "
            "If any are present, negotiate seller fixes or a credit at closing.\n\n"
            "TACTICS\n"
            "\u2022 You must occupy the property within 60 days of closing and live there at least 1 year — non-negotiable per FHA rules.\n"
            "\u2022 After year 1, you can move out and keep the property as a rental — this is the classic \"house-hack\" wealth ladder.\n"
            "\u2022 You can only have one FHA loan at a time (with rare exceptions). Plan accordingly.\n"
            "\u2022 FHA requires Mortgage Insurance Premium (MIP) for the life of the loan in most cases — refinance to conventional once you have 20% equity to drop it.\n"
            "\u2022 If the property is 2-4 units, your FHA loan limit is higher than for a single-family — confirm with your lender."
        ),
        caveat="FHA requires you to live in the property for at least 1 year.",
        selection_reason=sel_reason,
        pre_loaded_record={
            "pending_extras": {"three_paths_structure_id": ID, "fha_modeled_rent_share": eff_rent},
            "is_owner_occupied": True,
        },
    )
