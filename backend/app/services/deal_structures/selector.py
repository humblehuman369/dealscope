"""Selector — picks up to three structures with diversity across families."""

from app.schemas.deal_structures import DealStructure
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.templates import ALL_TEMPLATES


def _apply_listing_signals(ctx: StructureContext, structure: DealStructure) -> float:
    """Adjust realism score from listing context (v1 calibration placeholders)."""
    score = structure.ranking_score

    if ctx.is_foreclosure or ctx.is_bank_owned:
        if structure.id == "price-negotiation":
            score += 5  # CALIBRATION PLACEHOLDER — refine via A/B test (see T17 / T15)
        if structure.family == "financing":
            score -= 15  # CALIBRATION PLACEHOLDER

    if ctx.is_fsbo:
        if structure.family == "financing":
            score += 6  # CALIBRATION PLACEHOLDER
        if structure.id == "price-negotiation":
            score += 4  # CALIBRATION PLACEHOLDER

    dom = ctx.days_on_market
    if dom is not None:
        if 30 <= dom < 60:
            score += 3  # CALIBRATION PLACEHOLDER
        elif 60 <= dom < 90:
            score += 6
        elif 90 <= dom < 180:
            score += 9
        elif dom >= 180:
            score += 12

    if ctx.market_temperature and ctx.market_temperature.lower() == "cold":
        if structure.family == "financing":
            score += 5  # CALIBRATION PLACEHOLDER
        if structure.id == "price-negotiation":
            score += 3

    return min(100.0, max(0.0, score))


def select_three_paths(
    ctx: StructureContext,
    templates: list | None = None,
) -> list[DealStructure]:
    """Run each enabled template, adjust scores, then pick up to 3 with these rules:

    1. No two structures from the same family.
    2. Order by ranking_score desc.
    3. Always include at least one non-price-reduction option when possible.
    """
    pool = templates if templates is not None else ALL_TEMPLATES
    candidates: list[DealStructure] = []
    for template in pool:
        result = template.solve(ctx)
        if result is not None and result.monthly_savings > 0:
            adjusted = _apply_listing_signals(ctx, result)
            candidates.append(result.model_copy(update={"ranking_score": adjusted}))

    if not candidates:
        return []

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

    non_price_avail = [c for c in candidates if c.family != "price" and c not in selected]
    if non_price_avail and all(s.family == "price" for s in selected):
        selected[-1] = non_price_avail[0]

    return selected
