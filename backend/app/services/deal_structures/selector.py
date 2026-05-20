"""Selector — fills three fixed slots (Rent Increase, More Equity, Creative Finance).

The engine appends the Blended Plan as a fourth slot separately. The Four Paths
lineup is intentionally a fixed-order taxonomy rather than a ranked feed so the
user always reads the options in the same order across properties:

    Option 1 — Rent Increase      (rent-verification)
    Option 2 — More Equity        (price-negotiation)
    Option 3 — Creative Finance   (seller-second-zero-balloon)
    Option 4 — Blended Plan       (engine-appended)

Templates whose math isn't feasible for a given property (e.g. monthly_rent = 0
makes rent-verification infeasible) are silently skipped; the remaining cards
retain their relative order.

Scoring helpers (``_apply_listing_signals``, ``_apply_regional_calibration``,
``_apply_dismissed_penalty``) still run against each selected card so the
``ranking_score`` field stays meaningful for downstream consumers (analytics,
future ranking experiments), but no longer affects slot order.
"""

from app.core.regions import resolve_investor_probability_region
from app.schemas.deal_structures import DealStructure
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.templates import (
    price_negotiation,
    rent_uplift,
    seller_second_zero_balloon,
)

# Fixed slot taxonomy. Order matters — this is the displayed order on the Four
# Paths panel. Adding/removing entries here changes the card lineup directly.
_FIXED_SLOTS = (
    rent_uplift,
    price_negotiation,
    seller_second_zero_balloon,
)

# T15 — hand-tuned regional boosts (CALIBRATION PLACEHOLDER — refine with data / T14 telemetry).
_TX_FL_SUB2_BONUS = 5.0
_COHORT_FINANCING_BONUS = 5.0  # coastal_northeast + midwest_affordability
_CA_NY_ASSUMABLE_BONUS = 8.0

# T17 — large enough to drop a family out of the top 3 unless it's the only viable
# option, but not so large it removes it entirely (user might change their mind).
_DISMISSED_FAMILY_PENALTY = 25.0


def _apply_regional_calibration(ctx: StructureContext, structure: DealStructure, score: float) -> float:
    """Adjust realism score by U.S. state cohort (reuses ``resolve_investor_probability_region``)."""
    st = ctx.state
    if not st or not str(st).strip():
        return score
    code = str(st).strip().upper()
    if len(code) != 2:
        return score

    region_key, _ = resolve_investor_probability_region(code)

    # TX / FL — creative finance / Sub2 cultural fit (wrap template not shipped).
    if code in ("TX", "FL") and structure.id in ("sub2", "morby-method"):
        score += _TX_FL_SUB2_BONUS

    # "Cold-market" proxy: coastal_northeast + midwest cohorts — seller financing family lift.
    if region_key in ("coastal_northeast", "midwest_affordability") and structure.family == "financing":
        score += _COHORT_FINANCING_BONUS

    # CA / NY — assumable PV story resonates where rate-lock disparity is largest.
    if code in ("CA", "NY") and structure.id == "assumable":
        score += _CA_NY_ASSUMABLE_BONUS

    return min(100.0, max(0.0, score))


def _apply_dismissed_penalty(ctx: StructureContext, structure: DealStructure, score: float) -> float:
    """T17 — penalize structures whose family the user has dismissed.

    Single-lever cards lose ``_DISMISSED_FAMILY_PENALTY`` directly. The Blended
    Plan (``family == 'blended'``) is its own family — only penalized when the
    user explicitly dismisses ``'blended'``, not when they dismiss a constituent
    family. This matches the honest-gating doctrine: do exactly what the user
    asked for, no more.
    """
    if not ctx.dismissed_families:
        return score
    if structure.family in ctx.dismissed_families:
        score -= _DISMISSED_FAMILY_PENALTY
    return min(100.0, max(0.0, score))


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


def select_four_paths(
    ctx: StructureContext,
    templates: list | None = None,
) -> list[DealStructure]:
    """Fill the three single-lever slots in fixed order, skipping infeasible ones.

    Slot order (the engine appends the Blended Plan as Path 4 separately):

        1. Rent Increase     — ``rent_uplift``
        2. More Equity       — ``price_negotiation``
        3. Creative Finance  — ``seller_second_zero_balloon``

    ``templates`` is an optional whitelist (used by tests and the engine when a
    feature flag disables a template). Only slots whose template appears in the
    whitelist will fire. Passing ``[]`` returns an empty list.

    A slot is silently skipped when its template returns ``None`` or produces
    ``monthly_savings <= 0`` (i.e. the math isn't viable for this property);
    remaining slots keep their relative order so users always read them in the
    same taxonomy.
    """
    # ``None`` = use the fixed slot list; an explicit list (incl. ``[]``) acts
    # as a whitelist filter against the fixed slots.
    if templates is None:
        active_slots = _FIXED_SLOTS
    else:
        allowed_ids = {getattr(t, "ID", None) for t in templates}
        active_slots = tuple(s for s in _FIXED_SLOTS if s.ID in allowed_ids)

    selected: list[DealStructure] = []
    for template in active_slots:
        result = template.solve(ctx)
        if result is None or result.monthly_savings <= 0:
            continue
        adjusted = _apply_listing_signals(ctx, result)
        adjusted = _apply_regional_calibration(ctx, result, adjusted)
        adjusted = _apply_dismissed_penalty(ctx, result, adjusted)
        selected.append(result.model_copy(update={"ranking_score": adjusted}))

    return selected


# Deprecated alias — kept for one release so external callers don't break mid-migration.
# Remove in the next release cycle. (The function only ever returned the 3 single-lever
# cards; the engine appends the Blended Plan as Path 4 — hence the rename.)
select_three_paths = select_four_paths
