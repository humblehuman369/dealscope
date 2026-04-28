"""Larger down payment — reduce P&I by increasing equity at close."""

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money, fmt_pct_delta

FAMILY = "capital_stack"
FAMILY_LABEL = "More equity"
ID = "larger-down"


def _monthly_cf_at_down_pct(ctx: StructureContext, down_pct: float) -> float:
    loan = ctx.list_price * (1 - down_pct)
    pi = calculate_monthly_mortgage(loan, ctx.interest_rate, ctx.loan_term_years)
    return ctx.baseline_monthly_cash_flow + ctx.baseline_monthly_pi - pi


def solve(ctx: StructureContext) -> DealStructure | None:
    if ctx.deal_gap_amount <= 0:
        return None
    if ctx.list_price <= 0:
        return None

    target_cf = 0.0
    if _monthly_cf_at_down_pct(ctx, ctx.down_payment_pct) >= target_cf:
        return None
    if _monthly_cf_at_down_pct(ctx, 0.50) < target_cf:
        return None

    lo_bound = max(0.20, ctx.down_payment_pct + 0.002)
    if lo_bound >= 0.50:
        return None

    lo, hi = lo_bound, 0.50
    best_down = None
    for _ in range(28):
        mid = (lo + hi) / 2
        cf = _monthly_cf_at_down_pct(ctx, mid)
        if cf >= target_cf:
            best_down = mid
            hi = mid
        else:
            lo = mid

    if best_down is None or best_down <= ctx.down_payment_pct + 1e-6:
        return None

    new_down = min(0.50, max(0.20, best_down))
    new_loan = ctx.list_price * (1 - new_down)
    new_pi = calculate_monthly_mortgage(new_loan, ctx.interest_rate, ctx.loan_term_years)
    monthly_savings = ctx.baseline_monthly_pi - new_pi
    if monthly_savings <= 0:
        return None

    new_cash = ctx.list_price * (new_down + ctx.closing_costs_pct)
    delta_cash = new_cash - ctx.baseline_cash_required

    gap_pct = ctx.deal_gap_pct
    ranking = 58.0
    if gap_pct < 8:
        ranking += 14  # CALIBRATION PLACEHOLDER — small gaps
    elif gap_pct > 20:
        ranking -= 18  # CALIBRATION PLACEHOLDER — large gaps need unrealistic cash

    sel_reason = "Shown because putting more cash down is often the fastest way to clear a modest gap"
    if gap_pct < 10:
        sel_reason = f"Shown because the gap is under {gap_pct:.0f}% — extra equity may be enough without renegotiating price"

    pitch = (
        f"If you can bring {new_down * 100:.0f}% down instead of {ctx.down_payment_pct * 100:.0f}%, "
        f"your P&I drops by about {fmt_money(monthly_savings)} a month. "
        f"That's the trade: more cash today for better monthly cash flow."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="Capital-heavy path",
        headline=f"Put {new_down * 100:.0f}% down ({fmt_money(new_cash)})",
        summary=(
            f"Adds about {fmt_money(delta_cash)} cash vs baseline closing but saves "
            f"{fmt_money(monthly_savings)}/mo on the mortgage."
        ),
        levers=[
            StructureLever(
                label="Down payment",
                before_label=f"{ctx.down_payment_pct * 100:.0f}%",
                after_label=f"{new_down * 100:.0f}%",
                delta_label=fmt_pct_delta(ctx.down_payment_pct * ctx.list_price, new_down * ctx.list_price),
            ),
            StructureLever(
                label="Monthly P&I",
                before_label=f"${round(ctx.baseline_monthly_pi):,}",
                after_label=f"${round(new_pi):,}",
                delta_label=None,
            ),
        ],
        monthly_savings=round(monthly_savings, 2),
        cash_required=round(new_cash, 0),
        ranking_score=min(100.0, max(0.0, ranking)),
        pitch_script=pitch,
        caveat="Higher cash outlay reduces cash-on-cash return — model both scenarios in Strategy.",
        selection_reason=sel_reason,
        pre_loaded_record={
            "pending_extras": {
                "three_paths_structure_id": ID,
                "down_payment_pct_override": new_down,
            }
        },
    )
