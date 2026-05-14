"""2-1 seller-paid rate buydown — lower effective rate years 1–2."""  # noqa: RUF002 — en dash is deliberate range typography

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money, fmt_money_precise

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
        sel_reason = (
            f"Shown because the listing has been active {ctx.days_on_market} days — sellers often help with financing"
        )

    is_new_construction = ctx.year_built is not None and abs(ctx.year_built - 2026) <= 2
    audience_line = (
        "Builder's sales agent — new-construction sellers love this structure because it preserves "
        "the headline price (which protects future comps in the development).\n"
        if is_new_construction
        else "Listing agent. Loop in your lender so they can quote the exact concession amount.\n"
    )

    pitch = (
        "WHO TO CALL\n"
        f"{audience_line}\n"
        "WHY THIS WORKS — AND WHY SELLERS ACCEPT IT\n"
        f"A seller-paid 2-1 buydown costs the seller a one-time concession at closing of "
        f"~{fmt_money(approx_cost)}. In exchange, your loan rate effectively drops to "
        f"{y1_rate * 100:.1f}% in year one and {y2_rate * 100:.1f}% in year two before returning "
        f"to the note rate of {note * 100:.1f}%. You pocket {fmt_money(monthly_savings_y1)}/mo in "
        "year one — the runway you need to stabilize tenants, complete light improvements, or "
        "raise rents.\n\n"
        "Why sellers say yes: the headline price stays whole. A $10K price cut shows up forever "
        f"in comps. A {fmt_money(approx_cost)} concession does not.\n\n"
        "OPEN — frame it as price-preserving (not a discount)\n"
        f"\"We've underwritten this carefully. At {fmt_money_precise(ctx.list_price)}, the year-one "
        "cash flow is too tight to commit. Rather than ask the seller to cut price — which hurts "
        'their comps and their net — would they consider a 2-1 rate buydown instead?"\n\n'
        "ASK — be specific so they can say yes\n"
        f'"My ask is a seller-paid 2-1 temporary buydown. First year at {y1_rate * 100:.1f}%, '
        f"second year at {y2_rate * 100:.1f}%, then the note rate of {note * 100:.1f}% kicks in. "
        f"My lender estimates the concession at roughly {fmt_money(approx_cost)} — they can write "
        "the exact figure into the offer. The seller's headline price stays at "
        f'{fmt_money_precise(ctx.list_price)}."\n\n'
        "ANTICIPATE OBJECTIONS\n"
        f'\u2022 "Why should we pay for the buyer\'s rate?" \u2192 "Because at '
        f"{fmt_money(approx_cost)} of concessions, the seller nets more than they would after a "
        '$10-15K price cut. Their comps stay strong and the deal closes."\n'
        '\u2022 "What happens in year three?" \u2192 "By then I\'ve stabilized rents and refi\'d '
        "into a better long-term loan, or the property carries the note rate cleanly. Your concern "
        'ends at closing."\n'
        '\u2022 "Why not just lower price?" \u2192 "A buydown gives me the same monthly relief '
        "without dropping the closing comp. Net to seller is similar — but the next listing in this "
        'neighborhood prices off your sale."\n\n'
        "TRIAL CLOSE\n"
        f'"If the seller is open to roughly {fmt_money(approx_cost)} in closing-cost concessions, '
        "I can have a clean offer at full price signed by end of week. Want me to put my lender on "
        "a quick call with the seller's lender to confirm the structure?\"\n\n"
        "TACTICS\n"
        "\u2022 Don't combine buydown asks with major price asks — pick one or the other. Sellers say no to both.\n"
        "\u2022 Builders accept 2-1 buydowns ~70% of the time on aging inventory — always ask.\n"
        "\u2022 Ask your lender to compare a 2-1 buydown vs. a permanent 1-point buydown — sometimes the permanent is better long term.\n"
        "\u2022 Plan your refinance trigger BEFORE close — typically when rates drop 0.75% or in 24 months, whichever comes first."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="New construction friendly",
        headline=f"Seller pays a 2-1 rate buydown ({fmt_money(approx_cost)})",
        bullets=[
            "Seller funds a 2-1 rate buydown",
            f"Year 1 rate drops to {y1_rate * 100:.1f}%",
        ],
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
