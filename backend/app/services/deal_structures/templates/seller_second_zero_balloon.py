"""Seller-Held 2nd at 0% with 2-5yr balloon.

Buyer offers the seller's full asking price (or slightly above) in exchange
for the seller carrying a 2nd mortgage at 0% with a short balloon.
This is the trending creative-finance pattern (Pace Morby, BiggerPockets).
"""

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import (
    fmt_money,
    fmt_money_precise,
    fmt_monthly,
)

FAMILY = "financing"
FAMILY_LABEL = "Creative finance"
ID = "seller-second-zero-balloon"

# Caps: keeps the structure plausible.
MAX_PRICE_PREMIUM_PCT = 0.05  # offer up to 5% above asking
MAX_SECOND_AS_PCT_OF_PRICE = 0.20  # 2nd ≤ 20% of total price
DEFAULT_BALLOON_YEARS = 5


def solve(ctx: StructureContext) -> DealStructure | None:
    """Solve for a 2nd-mortgage size that closes the buyer's monthly gap.

    Strategy: hold buyer's monthly outlay constant near baseline-cash-flow-positive
    by replacing some of the bank loan with a 0% seller-carried 2nd.
    """
    if ctx.deal_gap_amount <= 0:
        return None
    # Need positive list price to be meaningful.
    if ctx.list_price <= 0:
        return None

    # Offer the asking price (no premium for MVP — keeps math defensible).
    new_price = ctx.list_price

    # Solve for the 2nd-mortgage principal X such that:
    #   monthly P&I on (loan - X) at note_rate >= baseline P&I - target_savings
    # Where target_savings is the monthly gap to close.
    target_savings = max(0.0, -ctx.baseline_monthly_cash_flow) + 25  # closes gap + $25 cushion

    bank_loan = ctx.list_price * (1 - ctx.down_payment_pct)
    max_second = ctx.list_price * MAX_SECOND_AS_PCT_OF_PRICE

    # Binary search the 2nd size.
    lo, hi = 0.0, max_second
    chosen_second = 0.0
    for _ in range(40):
        mid = (lo + hi) / 2
        new_bank = bank_loan - mid
        if new_bank < 0:
            new_bank = 0
        new_pi = calculate_monthly_mortgage(new_bank, ctx.interest_rate, ctx.loan_term_years)
        savings = ctx.baseline_monthly_pi - new_pi  # 2nd is interest-only at 0% → $0/mo
        if savings >= target_savings:
            chosen_second = mid
            hi = mid
        else:
            lo = mid

    # If even the max 2nd doesn't get us to target savings, take the max as a partial close.
    if chosen_second == 0.0:
        chosen_second = max_second

    new_bank_loan = max(0.0, bank_loan - chosen_second)
    new_monthly_pi = calculate_monthly_mortgage(new_bank_loan, ctx.interest_rate, ctx.loan_term_years)
    monthly_savings = ctx.baseline_monthly_pi - new_monthly_pi
    cash_required = new_price * (ctx.down_payment_pct + ctx.closing_costs_pct)

    # Realism scoring — this structure has been getting more common.
    ranking = 70.0
    if ctx.days_on_market and ctx.days_on_market > 60:
        ranking += 8
    if ctx.is_fsbo:
        ranking += 6
    if ctx.is_foreclosure or ctx.is_bank_owned:
        ranking -= 12  # banks/REOs don't carry paper
    if ctx.market_temperature and ctx.market_temperature.lower() == "cold":
        ranking += 5

    realism_label = "Creative finance"

    pitch = (
        f"I can pay your full asking price of {fmt_money_precise(ctx.list_price)} "
        f"if you're open to carrying {fmt_money_precise(chosen_second)} of it as a 2nd mortgage "
        f"at 0% interest for {DEFAULT_BALLOON_YEARS} years. "
        f"You get your number, and I get the cash flow to make this work. "
        f"In {DEFAULT_BALLOON_YEARS} years I refinance and you get a check for {fmt_money_precise(chosen_second)}."
    )

    caveat = (
        f"The {fmt_money(chosen_second)} 2nd mortgage balloons in {DEFAULT_BALLOON_YEARS} years — "
        f"plan to refinance or sell by then."
    )

    dom = ctx.days_on_market or 0
    sel_reason = "Shown because seller financing can bridge the cash-flow gap without cutting list price"
    if dom > 60:
        sel_reason = f"Shown because the property has been listed {dom} days — sellers are more open to creative terms"

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label=realism_label,
        headline=f"Pay full asking — seller carries a {fmt_money(chosen_second)} 2nd at 0%",
        summary=(
            f"Saves {fmt_monthly(monthly_savings)}. Seller gets their price plus "
            f"{fmt_money(chosen_second)} back in {DEFAULT_BALLOON_YEARS} years."
        ),
        levers=[
            StructureLever(
                label="Offer price",
                before_label=fmt_money(ctx.list_price),
                after_label=fmt_money(new_price),
                delta_label=None,
            ),
            StructureLever(
                label="1st mortgage",
                before_label=fmt_money(bank_loan),
                after_label=f"{fmt_money(new_bank_loan)} @ {ctx.interest_rate * 100:.1f}%",
                delta_label=None,
            ),
            StructureLever(
                label=f"Seller 2nd (0%, {DEFAULT_BALLOON_YEARS}yr balloon)",
                before_label="—",
                after_label=fmt_money(chosen_second),
                delta_label=None,
            ),
        ],
        monthly_savings=round(monthly_savings, 2),
        cash_required=round(cash_required, 0),
        ranking_score=min(100.0, max(0.0, ranking)),
        pitch_script=pitch,
        caveat=caveat,
        selection_reason=sel_reason,
        pre_loaded_record={
            "pending_extras": {
                "seller_carry_amount": chosen_second,
                "seller_carry_rate": 0.0,
                "seller_carry_term_years": DEFAULT_BALLOON_YEARS,
            }
        },
    )
