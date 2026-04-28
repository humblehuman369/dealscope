"""Selector — picks up to three structures with diversity across families."""

from app.schemas.deal_structures import DealStructure
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.templates import ALL_TEMPLATES


def select_three_paths(ctx: StructureContext) -> list[DealStructure]:
    """Run every template, then pick up to 3 with these rules:

    1. No two structures from the same family.
    2. Order by ranking_score desc.
    3. Always include at least one non-price-reduction option when possible.
    """
    candidates: list[DealStructure] = []
    for template in ALL_TEMPLATES:
        result = template.solve(ctx)
        if result is not None and result.monthly_savings > 0:
            candidates.append(result)

    if not candidates:
        return []

    # Sort by ranking, descending.
    candidates.sort(key=lambda s: s.ranking_score, reverse=True)

    selected: list[DealStructure] = []
    seen_families: set[str] = set()
    for cand in candidates:
        if cand.family in seen_families:
            continue
        selected.append(cand)
        seen_families.add(cand.family)
        if len(selected) >= 3:
            break

    # Diversity guarantee — if everything we picked is "price", swap in the next
    # non-price candidate (avoid 3 cards that all say "lower the price").
    non_price_avail = [c for c in candidates if c.family != "price" and c not in selected]
    if non_price_avail and all(s.family == "price" for s in selected):
        selected[-1] = non_price_avail[0]

    return selected
