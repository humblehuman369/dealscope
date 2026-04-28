"""Engine — public entry point for the Three Paths feature."""

from app.schemas.deal_structures import DealStructuresPayload
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.narrative import build_narrative
from app.services.deal_structures.selector import select_three_paths


def compute_deal_structures(ctx: StructureContext) -> DealStructuresPayload:
    """Return the Three Paths payload for a property with negative Deal Gap.

    Returns an empty payload (``has_paths=False``) when:
    - Deal Gap is non-negative (no need for alternatives), or
    - No template produced a feasible structure that closes the gap.
    """
    if ctx.deal_gap_amount <= 0:
        return DealStructuresPayload(paths=[], narrative_paragraphs=[], has_paths=False)

    paths = select_three_paths(ctx)
    if not paths:
        return DealStructuresPayload(paths=[], narrative_paragraphs=[], has_paths=False)

    narrative = build_narrative(paths, ctx)
    return DealStructuresPayload(paths=paths, narrative_paragraphs=narrative, has_paths=True)
