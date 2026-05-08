"""Engine — public entry point for the Three Paths feature."""

from app.core.defaults import STRUCTURE_TEMPLATE_FLAGS
from app.schemas.deal_structures import DealStructure, DealStructuresPayload
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.narrative import build_narrative
from app.services.deal_structures.selector import (
    apply_downpayment_reducer_promotion,
    select_four_paths,
)
from app.services.deal_structures.templates import (
    ALL_TEMPLATES,
    blended_plan,
    headline_conventional_blend,
    price_negotiation,
    rent_uplift,
    seller_second_zero_balloon,
)


def _compute_cash_shortfall(
    headline: DealStructure | None, user_cash_available: float | None
) -> float | None:
    """Compute the cash gap between buyer's profile cash and what the headline needs.

    Returns None when either input is unset (we can't compute a meaningful
    shortfall without both). Returns 0.0 when the buyer has enough cash. Returns
    a positive float (dollars) when the buyer is short — selector then uses this
    to promote one financing-family card with downpayment-reducer copy.
    """
    if headline is None or user_cash_available is None:
        return None
    shortfall = headline.cash_required - user_cash_available
    return max(0.0, round(shortfall, 0))


def compute_deal_structures(ctx: StructureContext) -> DealStructuresPayload:
    """Return the Three Paths payload for a property with negative Deal Gap.

    Returns an empty payload (``has_paths=False``) when:
    - Deal Gap is non-positive (no discount needed from list to Target Buy), or
    - No template produced a feasible structure AND the blended plan also can't.

    Activation Arc — Phase 0: also computes a Conventional Headline Blend
    (price + rent + larger-down only) and attaches it as
    ``payload.headline_structure``. The headline runs independently of the
    four-path selector cascade. When no plausible conventional blend
    cashflows, ``headline_structure`` is None — the frontend then falls back
    to the existing motivating-tier behavior (honest gating). See
    ``docs/feature-plans/ACTIVATION_ARC.md`` §3.
    """
    if ctx.deal_gap_amount <= 0:
        return DealStructuresPayload(
            paths=[],
            narrative_paragraphs=[],
            has_paths=False,
            headline_structure=None,
            cash_shortfall=None,
        )

    merged_flags = {**STRUCTURE_TEMPLATE_FLAGS, **ctx.template_flags}
    enabled_templates = [t for t in ALL_TEMPLATES if merged_flags.get(getattr(t, "ID", ""), True)]

    paths = select_four_paths(ctx, templates=enabled_templates)

    # Path 4 — Blended Plan: always attempt when Deal Gap is positive (kill-switch via flag).
    # T17 — also suppress when the user has explicitly dismissed the 'blended' family.
    blended_dismissed = "blended" in (ctx.dismissed_families or ())
    if merged_flags.get("blended-plan", True) and not blended_dismissed:
        blended = blended_plan.solve(
            ctx,
            price_result=price_negotiation.solve(ctx),
            seller2nd_result=seller_second_zero_balloon.solve(ctx),
            rent_result=rent_uplift.solve(ctx),
        )
        if blended is not None:
            paths = [*paths, blended]

    # Phase 0 — Conventional Headline Blend. Independent of the selector
    # cascade. Kill-switch via the standard flag pattern; ID matches the
    # template's ID constant so admin defaults can disable it without redeploy.
    headline = None
    if merged_flags.get(headline_conventional_blend.ID, True):
        headline = headline_conventional_blend.solve(ctx)

    # Phase 0 (E3) — cash shortfall + downpayment-reducer promotion.
    # When the buyer's profile cash is below what the headline needs, override
    # one financing-family card's copy to frame it as "cut your down payment by
    # $X with a small seller carry." Math is unchanged; only the copy reframes.
    cash_shortfall = _compute_cash_shortfall(headline, ctx.user_cash_available)
    if cash_shortfall is not None and cash_shortfall > 0:
        paths = apply_downpayment_reducer_promotion(paths, cash_shortfall)

    if not paths:
        return DealStructuresPayload(
            paths=[],
            narrative_paragraphs=[],
            has_paths=False,
            headline_structure=headline,
            cash_shortfall=cash_shortfall,
        )

    narrative = build_narrative(paths, ctx)
    return DealStructuresPayload(
        paths=paths,
        narrative_paragraphs=narrative,
        has_paths=True,
        headline_structure=headline,
        cash_shortfall=cash_shortfall,
    )
