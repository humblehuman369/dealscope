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
    "That sounds bad, but it's normal. Most houses on Zillow start out this way. "
    "Here are {count} ways people fix it."
)

_CLOSER = "Any one of these makes the deal work. You don't need all three."


_POSITION_LEAD = {
    0: "One way",
    1: "Another way",
    2: "A third way",
}


def _lead(index: int) -> str:
    return _POSITION_LEAD.get(index, "Another way")


def _paragraph_for(structure: DealStructure, ctx: StructureContext, index: int) -> str:
    """Return one plain-English paragraph describing this structure."""
    sid = structure.id
    lead = _lead(index)

    if sid == "price-negotiation":
        new_price = next(
            (lever.after_label for lever in structure.levers if lever.label.lower() == "purchase price"),
            "a lower price",
        )
        return (
            f"{lead} is to ask the seller for a lower price. "
            f"If you can get them down from {fmt_money_precise(ctx.list_price)} to {new_price}, "
            f"the rent will cover the bills. "
            f"Houses that have been sitting for a while often go for less than asking."
        )

    if sid == "seller-second-zero-balloon":
        carry_label = next(
            (lever.after_label for lever in structure.levers if "2nd" in lever.label.lower()),
            "part of the price",
        )
        return (
            f"{lead} is to change how you pay. "
            f"You'd pay the seller their full asking price, but ask them to lend you "
            f"{carry_label} of it themselves at 0% interest, with the loan due in 5 years. "
            f"They get their price. You get a smaller bank loan, so your monthly payment is lower. "
            f"By year 5 you'd refinance or pay them back from the rent you've saved up. "
            f"Investors are doing this a lot right now."
        )

    if sid == "rent-verification":
        new_rent = next(
            (lever.after_label for lever in structure.levers if lever.label.lower() == "monthly rent"),
            "a higher rent",
        )
        return (
            f"{lead} is to make the house earn more. "
            f"If you can rent it for {new_rent} a month instead of "
            f"${round(ctx.monthly_rent):,}, the deal also works. "
            f"This might mean fixing the place up, or just checking that the current rent matches the neighborhood."
        )

    return f"{lead}: {structure.headline}. {structure.summary}"


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
    return {1: "one", 2: "two", 3: "three"}.get(n, str(n))
