"""2-1 seller-paid rate buydown — lower effective rate years 1–2."""

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money

FAMILY = "financing"
FAMILY_LABEL = "Buy your runway"
ID = "rate-buydown-2-1"


def solve(ctx: StructureContext) -> DealStructure | None:
    if ctx.deal_gap_amount <= 0:
        return None
    if not ctx.is_listed:
        return None

    note = ctx.interest_rate
    y1_rate = max(0.0, note - 0.02)
    y2_rate = max(0.0, note - 0.01)

    loan = ctx.baseline_loan_amount
    base_pi = ctx.baseline_monthly_pi
    y1_pi = calculate_monthly_mortgage(loan, y1_rate, ctx.loan_term_years)
    y2_pi = calculate_monthly_mortgage(loan, y2_rate, ctx.loan_term_years)

    monthly_savings_y1 = base_pi - y1_pi
    if monthly_savings_y1 <= 0:
        return None

    noi_monthly = ctx.baseline_monthly_cash_flow + base_pi
    cf_y1 = noi_monthly - y1_pi
    if cf_y1 < 0:
        return None

    # Rough seller lump-sum buydown cost display (~ PV of delta payments years 1–2).
    delta_y1 = base_pi - y1_pi
    delta_y2 = base_pi - y2_pi
    approx_cost = (delta_y1 + delta_y2) * 12
    if loan > 0:
        approx_cost = max(approx_cost, 0.015 * loan)

    ranking = 62.0
    if ctx.days_on_market and ctx.days_on_market > 30:
        ranking += 8  # CALIBRATION PLACEHOLDER
    if ctx.year_built is not None and abs(ctx.year_built - 2026) <= 2:
        ranking += 6  # CALIBRATION PLACEHOLDER — new construction friendly

    sel_reason = "Shown because a seller-paid buydown lowers year-one payments without cutting price"
    if ctx.days_on_market and ctx.days_on_market > 30:
        sel_reason = f"Shown because the listing has been active {ctx.days_on_market} days — sellers often help with financing"

    pitch = (
        f"Ask the seller to buy down your rate: about {note * 100:.1f}% note, but you pay like "
        f"{y1_rate * 100:.1f}% in year one and {y2_rate * 100:.1f}% in year two. "
        f"That's roughly {fmt_money(monthly_savings_y1)} a month back in year one."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="New construction friendly",
        headline=f"Seller pays a 2-1 rate buydown ({fmt_money(approx_cost)})",
        summary=(
            f"Year 1 P&I near ${y1_pi:,.0f}/mo vs ${base_pi:,.0f}/mo at the note rate — "
            f"often enough to land positive cash flow while the seller helps with ~{fmt_money(approx_cost)}."
        ),
        levers=[
            StructureLever(
                label="Year 1 effective rate",
                before_label=f"{note * 100:.1f}%",
                after_label=f"{y1_rate * 100:.1f}%",
                delta_label=None,
            ),
            StructureLever(
                label="Year 2 effective rate",
                before_label=f"{note * 100:.1f}%",
                after_label=f"{y2_rate * 100:.1f}%",
                delta_label=None,
            ),
            StructureLever(
                label="Approx. seller buydown cost",
                before_label="—",
                after_label=fmt_money(approx_cost),
                delta_label=None,
            ),
        ],
        monthly_savings=round(monthly_savings_y1, 2),
        cash_required=round(ctx.baseline_cash_required, 0),
        ranking_score=min(100.0, max(0.0, ranking)),
        pitch_script=pitch,
        caveat="Returns to note rate in year 3 — plan to raise rents or refi by then.",
        selection_reason=sel_reason,
        pre_loaded_record={
            "pending_extras": {
                "three_paths_structure_id": ID,
                "rate_buydown_y1_pct_offset": 0.02,
                "rate_buydown_y2_pct_offset": 0.01,
            }
        },
    )
