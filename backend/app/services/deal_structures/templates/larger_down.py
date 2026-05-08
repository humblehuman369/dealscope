"""Larger down payment — reduce P&I by increasing equity at close."""

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money, fmt_money_precise, fmt_pct_delta

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

    extra_cash = new_cash - ctx.baseline_cash_required
    cash_tradeoff_years = (extra_cash / (monthly_savings * 12)) if monthly_savings > 0 else 0
    pitch = (
        "WHO TO CALL\n"
        "First: yourself — this is a capital decision, not a negotiation. Then the listing agent, "
        "to convert that capital strength into price flexibility.\n\n"
        "THE MATH\n"
        f"\u2022 Baseline plan: {ctx.down_payment_pct * 100:.0f}% down "
        f"({fmt_money(ctx.baseline_cash_required)} cash to close)\n"
        f"\u2022 This plan: {new_down * 100:.0f}% down "
        f"({fmt_money(new_cash)} cash to close)\n"
        f"\u2022 Extra cash up front: {fmt_money(extra_cash)}\n"
        f"\u2022 Monthly P&I drops: {fmt_money(monthly_savings)}/mo back in your pocket\n"
        f"\u2022 Payback on the extra cash: ~{cash_tradeoff_years:.1f} years from cash flow alone\n\n"
        "THE TRADE-OFF — RUN THIS BEFORE COMMITTING\n"
        "More equity = lower cash-on-cash return but higher monthly stability and faster equity "
        "build. Open this in Strategy and compare CoC at both down-payment levels — make sure the "
        "lower CoC is still acceptable to you. If you'll need this cash for the next deal in 6-12 "
        "months, the opportunity cost may be larger than the monthly savings.\n\n"
        "USE THIS AS LEVERAGE WITH THE SELLER\n"
        "Bigger down = stronger offer. Don't just bring more cash quietly — translate it into price.\n\n"
        "PITCH TO THE LISTING AGENT:\n"
        f"\"My offer is {new_down * 100:.0f}% down at {fmt_money_precise(ctx.list_price)}, fast "
        "close, no financing contingency, no appraisal contingency on the gap. That's a buyer "
        "the seller can actually count on closing. In exchange for that certainty, what's the "
        "lowest the seller would take?\"\n\n"
        "BETTER YET — STACK CASH STRENGTH WITH A PRICE ASK:\n"
        f"\"I'll bring {new_down * 100:.0f}% down — significantly more than a typical buyer — if "
        "the seller meets me on price. Less risk for them at close, real savings for me on the "
        "monthly. Let's split the upside.\"\n\n"
        "TACTICS\n"
        "\u2022 Cash buyers ALWAYS negotiate price. Your strength is certainty — make them pay for it.\n"
        "\u2022 Show proof of funds early. Sellers discount cash claims they can't verify.\n"
        "\u2022 Frame the larger down as protecting the SELLER (no appraisal risk, no financing fall-through), not as a flex.\n"
        "\u2022 Ask for a faster close (14-21 days) to amplify the cash-strength advantage."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="Capital-heavy path",
        headline=f"Put {new_down * 100:.0f}% down ({fmt_money(new_cash)})",
        bullets=[
            f"Increase down payment to {new_down * 100:.0f}%",
            f"Bring {fmt_money(new_cash)} to close",
        ],
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
