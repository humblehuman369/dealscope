"""Engine — public entry point for the Three Paths feature."""

from app.core.defaults import STRUCTURE_TEMPLATE_FLAGS
from app.schemas.deal_structures import DealStructuresPayload
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.narrative import build_narrative
from app.services.deal_structures.selector import select_three_paths
from app.services.deal_structures.templates import ALL_TEMPLATES


def compute_deal_structures(ctx: StructureContext) -> DealStructuresPayload:
    """Return the Three Paths payload for a property with negative Deal Gap.

    Returns an empty payload (``has_paths=False``) when:
    - Deal Gap is non-positive (no discount needed from list to Target Buy), or
    - No template produced a feasible structure that closes the gap.
    """
    if ctx.deal_gap_amount <= 0:
        return DealStructuresPayload(paths=[], narrative_paragraphs=[], has_paths=False)

    merged_flags = {**STRUCTURE_TEMPLATE_FLAGS, **ctx.template_flags}
    enabled_templates = [t for t in ALL_TEMPLATES if merged_flags.get(getattr(t, "ID", ""), True)]

    paths = select_three_paths(ctx, templates=enabled_templates)
    if not paths:
        return DealStructuresPayload(paths=[], narrative_paragraphs=[], has_paths=False)

    narrative = build_narrative(paths, ctx)
    return DealStructuresPayload(paths=paths, narrative_paragraphs=narrative, has_paths=True)
