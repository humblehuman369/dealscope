"""Selector — picks up to three structures with diversity across families."""

from app.core.regions import resolve_investor_probability_region
from app.schemas.deal_structures import DealStructure
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.templates import ALL_TEMPLATES
from app.services.deal_structures.templates import morby_method as morby_template

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


def _substitute_morby_method(
    candidates: list[DealStructure],
    ctx: StructureContext,
) -> list[DealStructure]:
    """When both Sub2 and seller-2nd are feasible, replace with one Morby Method card (T10)."""
    flags = ctx.template_flags or {}
    if not flags.get("morby-method", True):
        return candidates
    by_id = {c.id: c for c in candidates}
    sub = by_id.get("sub2")
    ss = by_id.get("seller-second-zero-balloon")
    if sub is None or ss is None:
        return candidates
    # sub/ss scores already include listing signals; combine() adds a small Morby bonus on top.
    merged = morby_template.combine(sub, ss, ctx)
    out = [c for c in candidates if c.id not in ("sub2", "seller-second-zero-balloon")]
    out.append(merged)
    return out


def _prioritize_assumable(selected: list[DealStructure]) -> list[DealStructure]:
    """T9: when the assumable card is selected, it wins Path 1."""
    if not any(s.id == "assumable" for s in selected):
        return selected
    first = next(s for s in selected if s.id == "assumable")
    rest = [s for s in selected if s.id != "assumable"]
    return [first, *rest]


def select_four_paths(
    ctx: StructureContext,
    templates: list | None = None,
) -> list[DealStructure]:
    """Run each enabled template, adjust scores, then pick up to 3 single-lever cards
    with these rules (the engine appends the Blended Plan as Path 4 separately):

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
            adjusted = _apply_regional_calibration(ctx, result, adjusted)
            adjusted = _apply_dismissed_penalty(ctx, result, adjusted)
            candidates.append(result.model_copy(update={"ranking_score": adjusted}))

    if not candidates:
        return []

    candidates = _substitute_morby_method(candidates, ctx)

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

    return _prioritize_assumable(selected)


# Deprecated alias — kept for one release so external callers don't break mid-migration.
# Remove in the next release cycle. (The function only ever returned the 3 single-lever
# cards; the engine appends the Blended Plan as Path 4 — hence the rename.)
select_three_paths = select_four_paths


# ---------------------------------------------------------------------------
# Activation Arc Phase 0 (E3) — Downpayment-reducer promotion
# ---------------------------------------------------------------------------


def _format_money_short(value: float) -> str:
    """Compact currency for the override headline (e.g. '$40K', '$7,500').

    Duplicates ``formatting.fmt_money`` deliberately — selector.py shouldn't
    import from formatting.py for one helper; the doctrine is each module owns
    its own copy logic. Matches fmt_money's output exactly.
    """
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.2f}M"
    if abs(value) >= 10_000:
        return f"${round(value / 1000)}K"
    return f"${round(value):,}"


def apply_downpayment_reducer_promotion(
    paths: list[DealStructure],
    cash_shortfall: float,
) -> list[DealStructure]:
    """Promote one financing-family card with downpayment-reducer copy.

    When the buyer's profile cash is below what the conventional headline
    requires, find the highest-ranked financing-family card already in
    ``paths`` and override its ``headline`` and ``selection_reason`` to frame
    it as "cut your down payment by $X with a small seller carry." The card's
    math (cash_required, monthly_savings, levers, pre_loaded_record) is left
    untouched — only the copy reframes.

    Honest-fallback: if no financing-family card was selected for this
    property, the function returns ``paths`` unchanged. We don't fabricate a
    new card; the engine's diversity rules already concluded that financing
    structures aren't viable here.

    Args:
        paths: Selected paths from ``select_four_paths`` (or with Blended
            appended). May be empty.
        cash_shortfall: Dollars short. Caller is responsible for ensuring this
            is > 0 — this function does not validate.

    Returns:
        New list with at most one card replaced. Original list is not mutated.
    """
    if cash_shortfall <= 0 or not paths:
        return paths

    financing_indices = [
        i for i, p in enumerate(paths) if p.family == "financing"
    ]
    if not financing_indices:
        return paths

    # Pick the highest-ranked financing card. The selector already ordered
    # candidates by ranking_score before diversity selection, so among the
    # picked paths the financing card with the largest ranking_score is the
    # most plausible for this property.
    best_idx = max(financing_indices, key=lambda i: paths[i].ranking_score)
    best = paths[best_idx]

    # Uniform override copy in v1 — all financing-family templates share this
    # framing. Future iteration could specialize per template (Sub2 talks about
    # the existing low-rate loan; seller-second talks about a carryback note;
    # Morby method combines both). For v1 the uniform message lands the
    # downpayment-reducer reframe without per-template branching.
    shortfall_label = _format_money_short(cash_shortfall)
    new_headline = f"Cut your down payment by {shortfall_label} with a small seller carry"
    new_reason = (
        f"Promoted because the recommended conventional structure needs more "
        f"cash than your profile shows. This option can reduce your cash to "
        f"close by about {shortfall_label}."
    )

    promoted = best.model_copy(
        update={
            "headline": new_headline,
            "selection_reason": new_reason,
        }
    )

    new_paths = list(paths)
    new_paths[best_idx] = promoted
    return new_paths
