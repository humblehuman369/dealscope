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
        "WHO TO CALL\n"
        "Listing agent first. If they don't understand creative finance (most don't), ask if you "
        "can speak with the seller direct. If FSBO, the seller direct.\n\n"
        "THE FRAME — PRICE FOR TERMS (Pace Morby's three pillars: Price, Terms, Trust)\n"
        "You're trading the seller something they want (their full asking price) for something you "
        "need (terms that make the cash flow work). This is the most powerful frame in creative "
        "finance because both sides win.\n\n"
        "OPEN — discover before you pitch\n"
        "\"Before I send a number, I want to understand the seller's situation. What's pushing the "
        "sale, and what would a perfect closing look like for them? Are they buying another "
        'property, paying off debt, or is this more about timing?"\n\n'
        "THE PITCH — full price, creative terms\n"
        f'"I can pay full asking — {fmt_money_precise(ctx.list_price)}, no haircut — if the '
        f"seller is open to carrying {fmt_money_precise(chosen_second)} of that as a second "
        f"mortgage at 0% interest with a {DEFAULT_BALLOON_YEARS}-year balloon. Bank takes the "
        "first, seller takes the second, and in "
        f"{DEFAULT_BALLOON_YEARS} years I refinance and the seller gets a single check for "
        f'{fmt_money_precise(chosen_second)}."\n\n'
        "WHAT'S IN IT FOR THE SELLER (lead with this if there's hesitation)\n"
        "1. They get their number. The headline price is preserved — important for ego, taxes, "
        "and the comp record in the neighborhood.\n"
        f"2. They keep ~{fmt_money_precise(chosen_second)} of equity working as a secured note — "
        "better than cash sitting in a savings account at 0.5%.\n"
        f"3. In {DEFAULT_BALLOON_YEARS} years they get a single payoff check, refinanced into them "
        "by my new lender.\n"
        "4. If they're worried about a big tax hit on a single-year sale, an installment sale spreads "
        "the capital gain over multiple years (talk to a CPA — but it's a real benefit).\n\n"
        "WHY YOU NEED IT (be honest)\n"
        "\"At full asking with a single bank loan, the property doesn't cash-flow. Your "
        "willingness to carry a portion is what makes this deal possible. Without it, my best "
        'offer drops 10-15% below ask and I close in cash — which one nets you more?"\n\n'
        "ANTICIPATE OBJECTIONS\n"
        '\u2022 "Why 0%?" \u2192 "0% keeps the structure simple and stays inside IRS imputed-'
        "interest safe harbor for owner-financed sales. I'm open to a small rate if it makes you "
        "more comfortable — let's discuss.\"\n"
        f'\u2022 "What if you don\'t refinance in {DEFAULT_BALLOON_YEARS} years?" \u2192 "Then '
        "I sell or pay you off from another source. Your note is recorded against the property in "
        "second position, behind the bank — meaning if I default, you can foreclose just like the "
        'bank could. Equity in the property protects you."\n'
        '\u2022 "Why would I carry?" \u2192 "Because you get your full price. A typical '
        "investor offer is 10-20% below ask in cash. Yours is full ask, and you become a secured "
        'lender on a property you know inside and out."\n'
        '\u2022 "What if I want all cash?" \u2192 "Then this isn\'t your deal. But if a portion '
        'as a secured note works, we both get what we want."\n\n'
        "TRIAL CLOSE — soft, optional\n"
        "\"Would the seller be open to a creative offer like this? I'll have a creative-finance "
        "attorney draft the note so we're both protected — clean paper, recorded properly.\"\n\n"
        "TACTICS\n"
        "\u2022 Always offer FULL PRICE when asking for terms. Never ask for both at once.\n"
        '\u2022 Use the words "creative offer" early — they signal an unusual structure is coming so the agent isn\'t blindsided.\n'
        '\u2022 Have a creative-finance attorney lined up before you pitch. "My attorney will paper this" instantly raises trust.\n'
        f"\u2022 The {DEFAULT_BALLOON_YEARS}-year balloon is non-negotiable on your side — shorter and you can't refi cleanly, longer and the seller balks.\n"
        "\u2022 If they say no to 0%, counter with 2-3% — still cheaper than a HELOC and gives the seller something to feel good about."
    )

    caveat = (
        f"The {fmt_money(chosen_second)} 2nd mortgage balloons in {DEFAULT_BALLOON_YEARS} years — "
        f"plan to refinance or sell by then."
    )

    dom = ctx.days_on_market or 0
    if dom > 60:
        sel_reason = f"The property has been listed {dom} days. Seller's price flexibility is more likely."
    else:
        sel_reason = "The seller's personal and financial situation will indicate if price flexibility is more likely."

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label=realism_label,
        headline=f"Seller Financing {fmt_money(chosen_second)}",
        # Math-carrying bullets — full breakdown in three lines so the card
        # tells the whole story without a separate lever block.
        bullets=[
            f"Offer price:\u00a0{fmt_money(ctx.list_price)} → {fmt_money(new_price)}",
            f"1st mortgage:\u00a0{fmt_money(bank_loan)} → {fmt_money(new_bank_loan)} @ {ctx.interest_rate * 100:.1f}%",
            f"Seller 2nd:\u00a0{fmt_money(chosen_second)} (0%, {DEFAULT_BALLOON_YEARS}yr balloon)",
        ],
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
                label="Seller 2nd",
                # No "before" value — this is a brand-new note. The grid renderer
                # hides the arrow when before is empty, so the row reads cleanly:
                #   Seller 2nd        $94,000 (0%, 5yr balloon)
                before_label="",
                after_label=f"{fmt_money(chosen_second)} (0%, {DEFAULT_BALLOON_YEARS}yr balloon)",
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
