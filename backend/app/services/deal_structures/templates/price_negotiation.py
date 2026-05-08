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
FAMILY_LABEL = "Negotiate price"
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

    monthly_pi_now = round(ctx.baseline_monthly_pi)
    monthly_pi_new = round(new_monthly_pi)
    dom_phrase = (
        f"on the market for {ctx.days_on_market} days"
        if ctx.days_on_market and ctx.days_on_market > 30
        else "active right now"
    )

    pitch = (
        "WHO TO CALL\n"
        "Listing agent first. If FSBO, the seller direct.\n\n"
        "OPEN — discover before you ask\n"
        "\"Thanks for taking the call. Before I send a number over, can you walk me through what's "
        f"driving the sale and where the seller would ideally land? I see the property has been "
        f"{dom_phrase} — what's the seller's read on the activity so far?\"\n\n"
        "ANCHOR — lead with math, not opinion\n"
        f"\"Based on what this property can rent for and standard operating costs in the area, my "
        f"number is {fmt_money_precise(new_price)}. That's not a lowball — that's the price where "
        f"the monthly payment ({fmt_money_precise(monthly_pi_new)}/mo P&I) actually pencils for an "
        f"investor who'd close in cash and on time. At {fmt_money_precise(ctx.list_price)} the "
        f"payment is {fmt_money_precise(monthly_pi_now)}/mo and the deal loses money every single "
        "month from day one.\"\n\n"
        "ASK — one number, then go silent\n"
        f"\"My offer is {fmt_money_precise(new_price)}. Cash, fast close, no financing contingency, "
        "and I'm flexible on the seller's preferred close date. Would they meet me there?\"\n\n"
        "(Stop talking. The next person to speak loses leverage.)\n\n"
        "HANDLE PUSHBACK — Chris Voss calibrated question\n"
        "If they push back on the number, don't argue or split the difference. Instead:\n"
        f"\"I hear you. How am I supposed to make this work at {fmt_money_precise(ctx.list_price)} "
        "when the rents won't cover the mortgage? Help me understand the seller's thinking on "
        "price — what comps are they looking at?\"\n\n"
        "TRADE A CONCESSION FOR A CONCESSION\n"
        "If they need a higher number, ask for something in return:\n"
        "\u2022 Faster close (cash certainty is worth real dollars)\n"
        "\u2022 Free rent-back / leaseback after close\n"
        "\u2022 Seller-paid closing costs\n"
        "\u2022 Appliances, repair credits, or as-is sale with no inspection ask\n\n"
        "TRIAL CLOSE\n"
        "\"If we can agree on price, I can have a clean offer and proof of funds in your inbox "
        "today. What would it take to get this signed by end of week?\"\n\n"
        "TACTICS\n"
        "\u2022 State your number once, then stay quiet. Sellers fill silence with concessions.\n"
        "\u2022 Never explain your math unless asked. \"My number\" is more powerful than a spreadsheet.\n"
        "\u2022 Always reference the seller's situation, never your own. \"My number is...\" not \"I need...\".\n"
        "\u2022 If the listing has been stale, mention it gently — it's leverage. If it's fresh, don't.\n"
        "\u2022 Walk away once. Sellers often call back within 48 hours."
    )

    if ctx.days_on_market and ctx.days_on_market > 60:
        sel_reason = (
            f"The property has been listed {ctx.days_on_market} days. "
            "Seller's price flexibility is more likely."
        )
    else:
        sel_reason = (
            "The seller's personal and financial situation will indicate "
            "if price flexibility is more likely."
        )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label=realism_label,
        headline=f"Negotiate to {fmt_money(new_price)}",
        bullets=[
            f"Price reduction: {gap_pct:.1f}% price cut",
            f"Target price: {fmt_money(new_price)}",
        ],
        summary=(
            f"A lower price reduces monthly P&I. "
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
        selection_reason=sel_reason,
        pre_loaded_record={"custom_purchase_price": new_price},
    )
