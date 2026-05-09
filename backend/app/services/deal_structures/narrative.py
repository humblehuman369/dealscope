"""Narrative generator — 5th-grade-level walkthrough of the selected paths.

Copy doctrine:
- Short sentences, common words.
- Never "you should" / "you must" — say "another way is", "people do".
- End with reassurance: any one of these works.
- Concrete numbers; same source of truth as the cards.
"""

from app.schemas.deal_structures import DealStructure
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money_precise

_OPENER_TEMPLATE = (
    "Right now, this house costs more than the rent can pay for. "
    "The shortage is about {gap_amount}. "
    "That sounds bad, but it's normal. Most houses start out this way. "
    "Here are {count} ways people fix it to make the deal."
)

_CLOSER = "Any one of these makes the deal work. You don't need all of them."


_POSITION_LEAD = {
    0: "One way",
    1: "Another way",
    2: "A third way",
    3: "A fourth way",
}

# Short scannable tag rendered before each path paragraph (e.g. "RENT → One way is...").
# Frontend detects the "TAG → " pattern and styles the tag in the family accent color.
_STRUCTURE_TAG = {
    "rent-verification": "RENT",
    "seller-second-zero-balloon": "TERMS",
    "price-negotiation": "PRICE",
    "blended-plan": "BLEND",
    "sub2": "LOAN",
    "assumable": "LOAN",
    "rate-buydown-2-1": "RATE",
    "larger-down": "CASH",
    "fha-house-hack": "LIVE-IN",
    "morby-method": "COMBO",
}


def _lead(index: int) -> str:
    return _POSITION_LEAD.get(index, "Another way")


def _tag_prefix(structure_id: str) -> str:
    tag = _STRUCTURE_TAG.get(structure_id)
    return f"{tag} → " if tag else ""


def _paragraph_for(structure: DealStructure, ctx: StructureContext, index: int) -> str:
    """Return one plain-English paragraph describing this structure.

    Each paragraph is prefixed with a short scannable tag (e.g. "RENT → ") so
    readers can scan the section the same way they scan the cards. The frontend
    detects the "TAG → " pattern and styles the tag in the family accent color.
    """
    sid = structure.id
    lead = _lead(index)
    tag = _tag_prefix(sid)

    if sid == "rent-verification":
        return (
            f"{tag}{lead} is to make the house earn more. "
            f"If you can rent it for a higher rent a month instead of "
            f"${round(ctx.monthly_rent):,}, the deal also works. "
            f"This might mean fixing the place up, or just checking that the current rent matches the neighborhood."
        )

    if sid == "seller-second-zero-balloon":
        carry_label = next(
            (lever.after_label for lever in structure.levers if "2nd" in lever.label.lower()),
            "part of the price",
        )
        return (
            f"{tag}{lead} is to change how you pay. "
            f"You'd pay the seller their full asking price, but ask them to lend you "
            f"{carry_label} of it themselves at 0% interest, with the loan due in 5 years. "
            f"They get their price. You get a smaller bank loan, so your monthly payment is lower. "
            f"By year 5 you'd refinance or pay them back from the rent you've saved up. "
            f"Investors are doing this a lot right now."
        )

    if sid == "price-negotiation":
        new_price = next(
            (
                lever.after_label
                for lever in structure.levers
                if lever.label.lower() in ("purchase price", "target price")
            ),
            "a lower price",
        )
        return (
            f"{tag}{lead} is to ask the seller for a lower price. "
            f"If you can get them down from {fmt_money_precise(ctx.list_price)} to {new_price}, "
            f"the rent will cover the bills. "
            f"Houses that have been sitting for a while often go for less than asking."
        )

    if sid == "blended-plan":
        new_rent = next(
            (
                lever.after_label
                for lever in structure.levers
                if lever.label.lower() in ("monthly rent", "target rent")
            ),
            "a small bump",
        )
        carry_label = next(
            (lever.after_label for lever in structure.levers if "2nd" in lever.label.lower()),
            "a small piece",
        )
        return (
            f"{tag}{lead} is to mix all three moves together. "
            f"Ask for a smaller price cut, get the seller to carry {carry_label} of the price at 0% "
            f"for a few years, and verify rent at {new_rent} a month. "
            f"No single ask is large — together they make the math work. "
            f"This is what real deals usually look like."
        )

    if sid == "sub2":
        return (
            f"{tag}{lead} is to keep paying the seller's existing loan instead of taking out a brand-new mortgage. "
            f"When their rate is much lower than today's rates, your monthly payment can drop a lot. "
            f"Banks sometimes call loans due when a home sells, so people use title structures their attorney sets up."
        )

    if sid == "rate-buydown-2-1":
        return (
            f"{tag}{lead} is to ask the seller to pay for a rate buydown. "
            f"You still get a normal loan, but your payment is lower in year one and year two while you raise rents or line up a refinance. "
            f"Builders and motivated sellers use this a lot when a listing has been sitting."
        )

    if sid == "larger-down":
        return (
            f"{tag}{lead} is to put more money down at closing. "
            f"A bigger down payment means a smaller loan, so your monthly payment goes down. "
            f"People do this when they have cash sitting in savings and want the house to cash flow."
        )

    if sid == "morby-method":
        return (
            f"{tag}{lead} bundles two moves together: keep paying the seller's cheaper existing loan instead of "
            f"replacing it with a brand-new mortgage, and ask the seller to carry part of the price at 0% for a few years. "
            f"Investors talk about this combo by name because it fixes cash flow without cutting the seller's price."
        )

    if sid == "assumable":
        return (
            f"{tag}{lead} is to assume the seller's existing government-backed loan if the lender allows it. "
            f"When that loan's rate is far below today's rates, the monthly savings can be huge—but getting the lender's "
            f"approval usually takes longer than a brand-new loan, so people only do this when the math clearly wins."
        )

    if sid == "fha-house-hack":
        return (
            f"{tag}{lead} is to buy as an owner-occupant with a small-down FHA loan and let roommates or other units pay part of the mortgage. "
            f"You have to actually live there for a while. It's a different lifestyle trade than a straight rental, but it fixes the payment math."
        )

    return f"{tag}{lead}: {structure.headline}. {structure.summary}"


def build_narrative(structures: list[DealStructure], ctx: StructureContext) -> list[str]:
    """Return a list of paragraph strings — opener, one per path, then closer."""
    if not structures:
        return []

    gap_amount = max(0.0, -ctx.baseline_monthly_cash_flow)
    if gap_amount <= 0:
        gap_amount = ctx.deal_gap_amount / max(ctx.loan_term_years * 12, 1)

    paragraphs = [
        _OPENER_TEMPLATE.format(
            gap_amount=f"${round(gap_amount):,} a month",
            count=_words_for(len(structures)),
        )
    ]
    for index, structure in enumerate(structures):
        paragraphs.append(_paragraph_for(structure, ctx, index))
    paragraphs.append(_CLOSER)
    return paragraphs


def _words_for(n: int) -> str:
    return {1: "one", 2: "two", 3: "three", 4: "four", 5: "five"}.get(n, str(n))
