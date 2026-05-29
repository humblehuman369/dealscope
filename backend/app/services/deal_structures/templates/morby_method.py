"""Morby Method — Sub2 + seller 0% 2nd when both structures are independently feasible.

Not in ``ALL_TEMPLATES``; the selector injects this when both ``sub2`` and
``seller-second-zero-balloon`` return non-null.
"""

from __future__ import annotations

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money, fmt_money_precise
from app.services.deal_structures.templates.seller_second_zero_balloon import DEFAULT_BALLOON_YEARS

FAMILY = "financing"
FAMILY_LABEL = "Creative finance"
ID = "morby-method"


def combine(sub2_result: DealStructure, seller_second_result: DealStructure, _ctx: StructureContext) -> DealStructure:
    """Merge two financing structures into one named card."""
    ranking = min(100.0, max(sub2_result.ranking_score, seller_second_result.ranking_score) + 4.0)
    monthly_savings = max(sub2_result.monthly_savings, seller_second_result.monthly_savings)
    cash_required = max(sub2_result.cash_required, seller_second_result.cash_required)

    sub_extras = (sub2_result.pre_loaded_record or {}).get("pending_extras") or {}
    ss_extras = (seller_second_result.pre_loaded_record or {}).get("pending_extras") or {}
    merged_extras: dict = {**dict(sub_extras), **dict(ss_extras)}
    merged_extras["three_paths_structure_id"] = ID

    sub2_rate = sub_extras.get("sub2_heuristic_rate") or 0.0
    seller_carry = ss_extras.get("seller_carry_amount") or 0.0
    list_price = _ctx.list_price

    pitch = (
        "WHO TO CALL\n"
        "The seller direct. The Morby Method combines two creative structures — both are hard to "
        "pitch through a traditional listing agent. If FSBO or off-market, this is your "
        "highest-leverage play.\n\n"
        "WHY THIS COMBO IS POWERFUL (Pace Morby's signature structure)\n"
        "You're pulling two levers at once:\n"
        f"\u2022 Sub2: take over the seller's existing low-rate (~{sub2_rate * 100:.1f}%) loan — "
        "lower payment than originating new debt today.\n"
        f"\u2022 Seller second: the seller carries the remaining equity gap as a 0% second mortgage "
        f"with a {DEFAULT_BALLOON_YEARS}-year balloon.\n"
        "Net effect: the seller gets full price (or close to it), keeps their note paid on time, "
        "and walks away with a clean exit plus a secured note. You get the deal at terms that "
        "actually cash-flow.\n\n"
        "STAGED PITCH — don't dump both in the first sentence\n"
        "Stage 1 — Discovery: \"Before I put a number on the table, can you walk me through what's "
        "driving the sale and what your ideal closing day looks like? Are you trying to clear the "
        'mortgage, free up cash, relocate, or something else?"\n\n'
        'Stage 2 — The frame: "I have a creative structure that lets you walk away clean and gets '
        "you very close to your full asking price. It has two parts and I'd like to walk you "
        'through both."\n\n'
        "Stage 3 — Sub2 leg: \"First, I'd take over the existing mortgage — your bank keeps "
        "getting paid on time, every month, but you're no longer responsible. The deed comes to "
        'me and the loan stays in your name with full legal protections for you."\n\n'
        'Stage 4 — Seller-second leg: "Second, the equity above the loan balance — roughly the '
        f"difference between your asking price and the loan payoff — I'd ask you to carry as a 0% "
        f"second mortgage for {DEFAULT_BALLOON_YEARS} years. At the end of that term I refinance, "
        'and you receive a single check for the full amount."\n\n'
        f'Stage 5 — The number: "All in, my offer is {fmt_money_precise(list_price)} — full ask. '
        f"You walk away with a clean exit on the first mortgage and "
        f'{fmt_money_precise(seller_carry)} secured against the property as your second."\n\n'
        "WHAT'S IN IT FOR THE SELLER\n"
        "1. Full asking price (or very close) — preserves comps, ego, and tax basis story.\n"
        "2. The existing mortgage gets paid every month, on time, by me. Their credit stays clean.\n"
        f"3. {fmt_money(seller_carry)} secured against the property as a recorded note — better "
        "than cash sitting in a savings account.\n"
        "4. Fast close (no new lender to underwrite the first), single payoff check at end.\n"
        "5. If they have capital-gains tax concerns, the installment-sale spread can help — talk to a CPA.\n\n"
        "ADDRESS BOTH FEARS UPFRONT (don't wait for objections)\n"
        '\u2022 "Due-on-sale clause on the existing loan" \u2192 "Banks rarely call performing '
        "loans. We use a land trust to keep the bank from seeing the title transfer, and a "
        "third-party servicer to document every payment. If I miss one, you can take the property "
        'back through the trust."\n'
        '\u2022 "What if you don\'t refinance the second in time?" \u2192 "You\'re in second '
        "position behind the bank. If I default, you can foreclose and reclaim the property — and "
        "all the equity I've built sitting on top of you protects your principal.\"\n"
        '\u2022 "Why both at once?" \u2192 "Because the existing loan covers the bulk of the '
        'price, and your second covers your equity. Two pieces, no new bank loan, full price to you."\n\n'
        "TRIAL CLOSE\n"
        '"Would you be open to seeing this on paper? My creative-finance attorney drafts the '
        "trust and the second-mortgage note, and your attorney reviews everything. No commitment "
        "from you until you've seen the structure and your attorney has signed off.\"\n\n"
        "TACTICS\n"
        "\u2022 NEVER pitch this in the first 60 seconds. Build rapport, hear the seller's pain, then offer the solution.\n"
        '\u2022 Soft yes/no asks: "Would you be open to..." — Pace Morby\'s go-to opener.\n'
        "\u2022 Always reference attorneys on both sides — sellers trust paper that looks professional.\n"
        "\u2022 Use a third-party loan servicer (e.g., Note Servicing Center) — documentation is your protection AND the seller's.\n"
        "\u2022 If they balk at 0% on the second, counter with 2-3% — still cheaper than a HELOC.\n"
        f"\u2022 The {DEFAULT_BALLOON_YEARS}-year balloon is non-negotiable on your end — shorter and you can't refi cleanly, longer and the seller balks.\n"
        "\u2022 Pace Morby's rule: \"If they hesitate, ask 'what part doesn't sit right?' — then handle THAT specific objection.\""
    )

    headline = "The Morby Method — Sub2 + seller carry"
    summary = (
        "Combine taking over the seller's existing loan with a 0% seller second for the equity gap—"
        "both legs lower your payment versus a single new bank loan at today's rates."
    )

    levers: list[StructureLever] = []
    for lv in sub2_result.levers[:4]:
        levers.append(
            StructureLever(
                label=f"Sub2 — {lv.label}",
                before_label=lv.before_label,
                after_label=lv.after_label,
                delta_label=lv.delta_label,
            )
        )
    for lv in seller_second_result.levers[:4]:
        levers.append(
            StructureLever(
                label=f"Seller 2nd — {lv.label}",
                before_label=lv.before_label,
                after_label=lv.after_label,
                delta_label=lv.delta_label,
            )
        )

    caveat = f"{sub2_result.caveat or ''} {seller_second_result.caveat or ''}".strip()

    sel_reason = (
        "Shown because both taking over the seller's loan and a 0% seller second can work here—"
        "this bundles the pattern investors call the Morby Method."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="Named pattern",
        headline=headline,
        bullets=[
            "Take over the seller's existing loan",
            "Add a 0% seller second for the equity gap",
        ],
        summary=summary,
        levers=levers[:8],
        monthly_savings=round(monthly_savings, 2),
        cash_required=float(cash_required),
        ranking_score=ranking,
        pitch_script=pitch[:4000],
        caveat=caveat[:1500] or None,
        selection_reason=sel_reason,
        pre_loaded_record={
            "custom_purchase_price": list_price,
            "pending_extras": merged_extras,
            "seller_carry_amount": ss_extras.get("seller_carry_amount"),
            "seller_carry_rate": ss_extras.get("seller_carry_rate", 0.0),
            "seller_carry_term_years": ss_extras.get("seller_carry_term_years", DEFAULT_BALLOON_YEARS),
            "seller_carry_balloon_years": DEFAULT_BALLOON_YEARS,
            # Deferred 0% balloon note: $0/mo until the balloon (not amortized).
            "seller_carry_interest_only": ss_extras.get("seller_carry_interest_only", True),
        },
    )
