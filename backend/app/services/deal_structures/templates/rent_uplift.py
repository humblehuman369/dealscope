"""Rent uplift template — close the gap by verifying or improving rent."""

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_monthly, fmt_pct_delta

FAMILY = "income"
FAMILY_LABEL = "Income uplift"
ID = "rent-verification"

MAX_REALISTIC_BUMP_PCT = 0.20  # cap rent increase at +20% — beyond that becomes implausible


def solve(ctx: StructureContext) -> DealStructure | None:
    """Solve for the monthly rent that closes the gap, capped at +20% of current rent."""
    if ctx.deal_gap_amount <= 0:
        return None
    if ctx.monthly_rent <= 0:
        return None

    # Each $1/mo of additional rent (after vacancy/management/maint/capex haircuts)
    # adds roughly $1 * (1 - vacancy) * (1 - maint - mgmt - capex) to NOI/mo.
    haircut = (1 - ctx.vacancy_rate) - (ctx.maintenance_pct + ctx.management_pct + ctx.capex_pct)
    if haircut <= 0:
        return None

    # Monthly gap to close, plus a small cushion.
    target_savings = max(0.0, -ctx.baseline_monthly_cash_flow) + 25
    rent_bump_needed = target_savings / haircut

    max_bump = ctx.monthly_rent * MAX_REALISTIC_BUMP_PCT
    actual_bump = min(rent_bump_needed, max_bump)
    new_rent = ctx.monthly_rent + actual_bump
    monthly_savings = actual_bump * haircut

    bump_pct = (actual_bump / ctx.monthly_rent) * 100 if ctx.monthly_rent > 0 else 0

    if bump_pct <= 5:
        ranking, realism_label = 84.0, "Verify the rent"
    elif bump_pct <= 12:
        ranking, realism_label = 66.0, "Light rent uplift"
    else:
        ranking, realism_label = 44.0, "Significant uplift"

    if ctx.is_listed:
        ranking -= 4  # listed properties usually have rent already set near market

    pitch = (
        f"Pull rent comps for the immediate area. If verified market rent comes in at "
        f"${round(new_rent):,}/mo, the deal works at the asking price. "
        f"This is a verification step, not a negotiation step."
    )

    sel_reason = "Shown because a modest rent increase may be enough to clear the gap at the asking price"
    if bump_pct > 12:
        sel_reason = "Shown because the gap needs a larger rent lift — verify comps before leaning on this path"

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label=realism_label,
        headline=f"Verify or raise rent to ${round(new_rent):,}",
        summary=(
            f"Closes {fmt_monthly(monthly_savings)} of the gap. "
            f"Run rent comps in Appraiser to confirm — or plan a light rehab."
        ),
        levers=[
            StructureLever(
                label="Monthly rent",
                before_label=f"${round(ctx.monthly_rent):,}",
                after_label=f"${round(new_rent):,}",
                delta_label=fmt_pct_delta(ctx.monthly_rent, new_rent),
            ),
        ],
        monthly_savings=round(monthly_savings, 2),
        cash_required=round(ctx.baseline_cash_required, 0),
        ranking_score=min(100.0, max(0.0, ranking)),
        pitch_script=pitch,
        caveat=(
            "Always verify rent with local comps before committing. "
            "If a rehab is required to get there, model the rehab cost in Strategy."
        ),
        selection_reason=sel_reason,
        pre_loaded_record={"custom_rent_estimate": new_rent},
    )
