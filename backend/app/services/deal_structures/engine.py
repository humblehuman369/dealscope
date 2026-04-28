"""Engine — public entry point for the Three Paths feature."""

from app.core.defaults import STRUCTURE_TEMPLATE_FLAGS
from app.schemas.deal_structures import DealStructuresPayload
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.narrative import build_narrative
from app.services.deal_structures.selector import select_three_paths
from app.services.deal_structures.templates import (
    ALL_TEMPLATES,
    blended_plan,
    price_negotiation,
    rent_uplift,
    seller_second_zero_balloon,
)


def compute_deal_structures(ctx: StructureContext) -> DealStructuresPayload:
    """Return the Three Paths payload for a property with negative Deal Gap.

    Returns an empty payload (``has_paths=False``) when:
    - Deal Gap is non-positive (no discount needed from list to Target Buy), or
    - No template produced a feasible structure AND the blended plan also can't.
    """
    if ctx.deal_gap_amount <= 0:
        return DealStructuresPayload(paths=[], narrative_paragraphs=[], has_paths=False)

    merged_flags = {**STRUCTURE_TEMPLATE_FLAGS, **ctx.template_flags}
    enabled_templates = [t for t in ALL_TEMPLATES if merged_flags.get(getattr(t, "ID", ""), True)]

    paths = select_three_paths(ctx, templates=enabled_templates)

    # Path 4 — Blended Plan: always attempt when Deal Gap is positive (kill-switch via flag).
    if merged_flags.get("blended-plan", True):
        blended = blended_plan.solve(
            ctx,
            price_result=price_negotiation.solve(ctx),
            seller2nd_result=seller_second_zero_balloon.solve(ctx),
            rent_result=rent_uplift.solve(ctx),
        )
        if blended is not None:
            paths = [*paths, blended]

    if not paths:
        return DealStructuresPayload(paths=[], narrative_paragraphs=[], has_paths=False)

    narrative = build_narrative(paths, ctx)
    return DealStructuresPayload(paths=paths, narrative_paragraphs=narrative, has_paths=True)
