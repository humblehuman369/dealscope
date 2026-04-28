"""Price negotiation template — the simplest path: get the seller down to Target Buy."""

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import (
    fmt_money,
    fmt_money_precise,
    fmt_pct_delta,
)

FAMILY = "price"
FAMILY_LABEL = "Price negotiation"
ID = "price-negotiation"


def solve(ctx: StructureContext) -> DealStructure | None:
    """Negotiate to Target Buy price. Always feasible, but only realistic at modest gaps."""
    if ctx.deal_gap_amount <= 0:
        return None

    new_price = ctx.target_buy_price
    new_loan = new_price * (1 - ctx.down_payment_pct)
    new_monthly_pi = calculate_monthly_mortgage(new_loan, ctx.interest_rate, ctx.loan_term_years)
    monthly_savings = ctx.baseline_monthly_pi - new_monthly_pi
    new_cash_required = new_price * (ctx.down_payment_pct + ctx.closing_costs_pct)

    gap_pct = ctx.deal_gap_pct
    # Realism: small price cuts are easy; deeper cuts are harder. Score decays with gap depth.
    if gap_pct <= 5:
        ranking, realism_label = 92.0, "Most realistic"
    elif gap_pct <= 10:
        ranking, realism_label = 78.0, "Realistic ask"
    elif gap_pct <= 20:
        ranking, realism_label = 58.0, "Bigger ask"
    elif gap_pct <= 30:
        ranking, realism_label = 38.0, "Aggressive ask"
    else:
        ranking, realism_label = 22.0, "Long-shot ask"

    # FSBO / long DOM / cold market push the realism up.
    if ctx.is_fsbo:
        ranking += 4
    if ctx.days_on_market and ctx.days_on_market > 60:
        ranking += 6
    if ctx.market_temperature and ctx.market_temperature.lower() == "cold":
        ranking += 4

    pitch = (
        f"Based on the rent and expenses, my number is {fmt_money_precise(new_price)}. "
        f"That's where the math works for me as an investor. "
        f"I can close fast and clean — would the seller meet me there?"
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label=realism_label,
        headline=f"Negotiate to {fmt_money(new_price)}",
        summary=(
            f"Closes the gap at the lower price. "
            f"Cash to close drops to {fmt_money(new_cash_required)} "
            f"(from {fmt_money(ctx.baseline_cash_required)})."
        ),
        levers=[
            StructureLever(
                label="Purchase price",
                before_label=fmt_money(ctx.list_price),
                after_label=fmt_money(new_price),
                delta_label=fmt_pct_delta(ctx.list_price, new_price),
            ),
            StructureLever(
                label="Monthly P&I",
                before_label=f"${round(ctx.baseline_monthly_pi):,}",
                after_label=f"${round(new_monthly_pi):,}",
                delta_label=None,
            ),
        ],
        monthly_savings=round(monthly_savings, 2),
        cash_required=round(new_cash_required, 0),
        ranking_score=min(100.0, max(0.0, ranking)),
        pitch_script=pitch,
        caveat=None,
    )
