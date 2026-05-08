"""Conventional Headline Blend — the recommended starting structure on every verdict.

Computes the smallest set of *conventional* moves (price negotiation within a
market-aware ceiling, rent verification, larger down payment) that makes the
property cashflow. Surfaces as the verdict-page headline above the Four Paths
panel; the existing accurate Deal Gap remains visible as the credibility chip.

This template is run separately from ``ALL_TEMPLATES`` — invoked directly from
``engine.py`` so the result attaches to ``DealStructuresPayload.headline_structure``
rather than to the four-path selector cards.

Design doctrine (locked):
- Headline uses ONLY buyer-controllable + minor-price levers (price within
  ceiling, validated rent, larger down). Never seller financing, Sub2, or other
  major-cooperation structures — those have low seller-acceptance probability
  and presenting them as the headline hides that friction behind math.
- Smallest aggregate ask: iterate price cuts from 0% upward, prefer rent
  verification before asking the buyer for more cash, only increase down
  payment when rent uplift alone can't bridge the gap.
- Market-aware price ceiling (uses existing ``ctx.market_temperature``):
  cold=8%, neutral=5%, hot=3%, unknown=5%. Cascade tries the base ceiling
  first, then expands by +3% before falling back to None (honest gating).
- Honest gating: returns None when no plausible blend cashflows. Engine then
  falls back to existing motivating-tier behavior (Reset Deal etc.) — we never
  fabricate a headline that the math doesn't support.
"""

from __future__ import annotations

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import (
    fmt_money,
    fmt_money_precise,
    fmt_pct_delta,
)

FAMILY = "conventional_headline"
FAMILY_LABEL = "Conventional headline"
ID = "headline-conventional-blend"

# Market-aware price ceilings. Existing templates use ``ctx.market_temperature``
# in the same way (see price_negotiation.py:46). Fallback when temperature is
# absent or unrecognized is the neutral 5% — explicitly safe per the Phase 0
# decision.
_MARKET_CEILINGS = {
    "cold": 0.08,
    "neutral": 0.05,
    "hot": 0.03,
}
_DEFAULT_CEILING = 0.05
_EXPANDED_OFFSET = 0.03  # if base ceiling fails, try base + 3% before giving up

# Rent uplift cap matches rent_uplift.MAX_REALISTIC_BUMP_PCT — keep in sync.
_MAX_RENT_BUMP_PCT = 0.20

# Price-cut iteration step (in pct of list price). 1% step gives at most ~11
# combinations to test even at the expanded ceiling — search space is tiny.
_PRICE_CUT_STEP = 0.01

# Down-payment iteration. Start at the user's baseline (already on ctx) and
# step up in 5% increments to a 50% cap.
_DP_STEP = 0.05
_DP_MAX = 0.50

# Small positive cushion above zero cashflow — matches rent_uplift's target.
_TARGET_CF_CUSHION = 25.0


def _ceiling_for(ctx: StructureContext) -> float:
    """Return the base price-cut ceiling for this property's market temperature."""
    if ctx.market_temperature is None:
        return _DEFAULT_CEILING
    return _MARKET_CEILINGS.get(ctx.market_temperature.lower(), _DEFAULT_CEILING)


def _cf_at(ctx: StructureContext, price: float, dp_pct: float, rent: float) -> float:
    """Monthly cash flow at modified (price, down-payment %, rent).

    Pure recompute — does not depend on baseline_monthly_cash_flow because we
    may be changing rent (which shifts NOI) and price (which shifts P&I).
    """
    if price <= 0 or rent <= 0:
        return 0.0
    annual_gross = rent * 12
    eff = annual_gross * (1 - ctx.vacancy_rate)
    opex = (
        ctx.property_taxes_annual
        + ctx.insurance_annual
        + annual_gross * ctx.maintenance_pct
        + annual_gross * ctx.management_pct
        + annual_gross * ctx.capex_pct
        + ctx.utilities_annual
        + ctx.other_annual_expenses
    )
    noi_monthly = (eff - opex) / 12
    new_loan = price * (1 - dp_pct)
    new_pi = calculate_monthly_mortgage(new_loan, ctx.interest_rate, ctx.loan_term_years)
    return noi_monthly - new_pi


def _rent_bump_to_close(
    ctx: StructureContext,
    cf_no_uplift: float,
    target_cf: float,
) -> float | None:
    """Compute the rent bump (in $/mo) needed to lift cf_no_uplift to target_cf.

    Returns None when the haircut math is non-positive (operating costs eat the
    full rent increase) — in that case the property can never close via rent.
    """
    haircut = (1 - ctx.vacancy_rate) - (
        ctx.maintenance_pct + ctx.management_pct + ctx.capex_pct
    )
    if haircut <= 0:
        return None
    shortfall = target_cf - cf_no_uplift
    if shortfall <= 0:
        return 0.0
    return shortfall / haircut


def _try_blend(
    ctx: StructureContext,
    max_ceiling: float,
) -> tuple[float, float, float] | None:
    """Find the smallest (price_cut_pct, dp_pct, rent_bump) blend that cashflows.

    Returns the first viable combination using the lowest-friction-first
    cascade: smallest price cut, smallest DP increase, rent uplift fills the
    remainder (within cap). Returns None if no combination within the bounds
    produces positive cashflow.
    """
    target_cf = _TARGET_CF_CUSHION
    max_rent_bump = ctx.monthly_rent * _MAX_RENT_BUMP_PCT

    # Number of price-cut steps inclusive of 0.0 and max_ceiling.
    n_price_steps = int(round(max_ceiling / _PRICE_CUT_STEP)) + 1

    # Outer loop: prefer NOT to ask buyer for more cash. Iterate DP from base
    # upward; for each DP level, exhaust price-cut options before escalating
    # DP. This biases the result toward "rent verification + small price ask"
    # before "buyer brings significantly more cash."
    base_dp = ctx.down_payment_pct
    if base_dp >= _DP_MAX:
        # User already maxed out — only price/rent levers available.
        dp_options = [base_dp]
    else:
        dp_options = []
        dp = base_dp
        while dp <= _DP_MAX + 1e-9:
            dp_options.append(min(dp, _DP_MAX))
            dp += _DP_STEP

    for dp_pct in dp_options:
        for i in range(n_price_steps):
            price_cut_pct = i * _PRICE_CUT_STEP
            if price_cut_pct > max_ceiling + 1e-9:
                break
            new_price = ctx.list_price * (1 - price_cut_pct)

            # Step A: does this price/DP combo cashflow at the current rent?
            cf_no_uplift = _cf_at(ctx, new_price, dp_pct, ctx.monthly_rent)
            if cf_no_uplift >= target_cf:
                return (price_cut_pct, dp_pct, 0.0)

            # Step B: can rent uplift (within cap) bridge the remainder?
            rent_bump = _rent_bump_to_close(ctx, cf_no_uplift, target_cf)
            if rent_bump is None:
                continue
            if 0.0 < rent_bump <= max_rent_bump:
                return (price_cut_pct, dp_pct, rent_bump)

    return None


def _build_pitch(
    ctx: StructureContext,
    new_price: float,
    new_dp_pct: float,
    new_rent: float,
    rent_bump: float,
    new_cash_required: float,
) -> str:
    """Compose a clean offer-presentation pitch for the conventional headline.

    Distinct from single-lever templates' pitches — this is the recommended
    *starting offer*, not a creative-finance ask. Tone is professional and
    direct; no jargon. Includes the rent-verification step when rent uplift is
    part of the blend (per the rent_uplift template's doctrine — never raise an
    offer based on unverified rent).
    """
    has_price_cut = new_price < ctx.list_price - 1.0
    has_dp_increase = new_dp_pct > ctx.down_payment_pct + 1e-6
    has_rent_uplift = rent_bump > 1.0

    lines: list[str] = []
    lines.append("WHO TO CALL")
    lines.append("Listing agent. This is a conventional offer — no creative finance, no unusual terms.")
    lines.append("")

    lines.append("THE OFFER")
    lines.append(
        f"• Price: {fmt_money_precise(new_price)} "
        + (
            f"({(1 - new_price / ctx.list_price) * 100:.1f}% off list)"
            if has_price_cut
            else "(at list)"
        )
    )
    lines.append(
        f"• Down payment: {new_dp_pct * 100:.0f}% ({fmt_money(new_cash_required)} cash to close)"
    )
    lines.append(f"• Financing: standard conventional, {ctx.interest_rate * 100:.2f}% / {ctx.loan_term_years}-yr")
    lines.append("• Standard contingencies: inspection, financing, appraisal")
    lines.append("• Close: 30 days")
    lines.append("")

    if has_rent_uplift:
        lines.append("BEFORE YOU SEND — VERIFY THE RENT")
        lines.append(
            f"This offer assumes market rent is closer to ${round(new_rent):,}/mo "
            f"(vs. the modeled ${round(ctx.monthly_rent):,}/mo). Verify before you submit:"
        )
        lines.append("1. Pull comps within 1 mile (Rentometer, Zillow Rental Manager) — note the median, not the high.")
        lines.append("2. Call 2 local property managers: \"If I asked you to manage it, what would you list it at?\"")
        lines.append("3. Walk 3 active rental listings nearby. Honestly assess condition gap.")
        lines.append("If verified — submit at the offer above. If not — reduce your number to fit the actual rent.")
        lines.append("")

    lines.append("WHY THIS NUMBER")
    why_parts: list[str] = []
    if has_price_cut:
        why_parts.append(f"price {(1 - new_price / ctx.list_price) * 100:.0f}% under list")
    if has_dp_increase:
        why_parts.append(f"larger down ({new_dp_pct * 100:.0f}% vs. typical {ctx.down_payment_pct * 100:.0f}%)")
    if has_rent_uplift:
        why_parts.append(f"verified market rent at ${round(new_rent):,}/mo")
    if why_parts:
        lines.append(
            "Three things make the math work on this property: " + ", ".join(why_parts) + "."
        )
    else:
        lines.append("This property cashflows at list price under standard financing — no negotiation required.")
    lines.append(
        "Each is a normal residential move. The seller signs a standard contract; nothing creative is required."
    )
    lines.append("")

    lines.append("PITCH TO THE LISTING AGENT")
    pitch_quote = (
        f"\"My offer is {fmt_money_precise(new_price)} with "
        f"{new_dp_pct * 100:.0f}% down, conventional financing, "
        "standard contingencies, 30-day close. "
    )
    if has_dp_increase:
        pitch_quote += (
            f"That's a stronger down than typical — less appraisal/financing risk for the seller. "
        )
    if has_rent_uplift:
        pitch_quote += (
            f"My numbers work because I've verified market rent at ${round(new_rent):,}/mo. "
        )
    pitch_quote += "Clean offer, no surprises. What questions do you have?\""
    lines.append(pitch_quote)
    lines.append("")

    lines.append("TACTICS")
    lines.append("• Lead with the math, not opinion. \"My number is based on comps, condition, and the closing timeline.\"")
    lines.append("• Use the precise price — round numbers feel arbitrary; specific ones feel deliberate.")
    lines.append(
        "• If the seller pushes back on price, ask: \"Is the concern the headline number, or the cash you walk with at closing?\" "
        "That distinction tells you whether to hold or pivot to a creative structure (see the Four Paths cards)."
    )
    lines.append(
        "• If you need to reduce the down payment, see the seller-financing path below — it can cut your cash to close significantly."
    )

    return "\n".join(lines)


def solve(ctx: StructureContext) -> DealStructure | None:
    """Compute the conventional headline blend for this property.

    Returns None when no plausible blend cashflows within the market-aware
    price ceiling (even after the +3% expansion). Engine treats None as the
    honest "no plausible conventional structure" signal and falls back to the
    existing motivating-tier behavior.
    """
    if ctx.deal_gap_amount <= 0:
        return None
    if ctx.list_price <= 0 or ctx.monthly_rent <= 0:
        return None

    base_ceiling = _ceiling_for(ctx)

    # Cascade: try base ceiling, then expanded. Stop at the first viable blend.
    blend: tuple[float, float, float] | None = None
    ceiling_used = base_ceiling
    for ceiling in (base_ceiling, base_ceiling + _EXPANDED_OFFSET):
        result = _try_blend(ctx, ceiling)
        if result is not None:
            blend = result
            ceiling_used = ceiling
            break

    if blend is None:
        return None

    price_cut_pct, dp_pct, rent_bump = blend
    new_price = ctx.list_price * (1 - price_cut_pct)
    new_rent = ctx.monthly_rent + rent_bump
    new_cash_required = new_price * (dp_pct + ctx.closing_costs_pct)
    new_cf = _cf_at(ctx, new_price, dp_pct, new_rent)
    monthly_savings = new_cf - ctx.baseline_monthly_cash_flow

    # Headline copy — concise enough to read in one glance. Lists the moves
    # that actually changed; skips ones equal to baseline.
    headline_parts: list[str] = []
    if price_cut_pct > 1e-6:
        headline_parts.append(f"{price_cut_pct * 100:.0f}% off")
    headline_parts.append(f"{dp_pct * 100:.0f}% down")
    if rent_bump > 1.0:
        headline_parts.append(f"${round(new_rent):,}/mo rent")
    headline = "Conventional terms — " + ", ".join(headline_parts)

    # Build levers — only show ones that actually changed from baseline. This
    # keeps the card uncluttered when (e.g.) a 5% price cut alone is enough.
    levers: list[StructureLever] = []
    if price_cut_pct > 1e-6:
        levers.append(
            StructureLever(
                label="Price",
                before_label=fmt_money(ctx.list_price),
                after_label=fmt_money(new_price),
                delta_label=fmt_pct_delta(ctx.list_price, new_price),
            )
        )
    if dp_pct > ctx.down_payment_pct + 1e-6:
        levers.append(
            StructureLever(
                label="Down payment",
                before_label=f"{ctx.down_payment_pct * 100:.0f}%",
                after_label=f"{dp_pct * 100:.0f}%",
                delta_label=fmt_pct_delta(
                    ctx.down_payment_pct * ctx.list_price, dp_pct * new_price
                ),
            )
        )
    if rent_bump > 1.0:
        levers.append(
            StructureLever(
                label="Monthly rent",
                before_label=f"${round(ctx.monthly_rent):,}",
                after_label=f"${round(new_rent):,}",
                delta_label=fmt_pct_delta(ctx.monthly_rent, new_rent),
            )
        )

    summary_parts: list[str] = []
    if price_cut_pct > 1e-6:
        summary_parts.append(f"a {price_cut_pct * 100:.0f}% price negotiation")
    if dp_pct > ctx.down_payment_pct + 1e-6:
        summary_parts.append(f"a larger down ({dp_pct * 100:.0f}%)")
    if rent_bump > 1.0:
        summary_parts.append(f"verified market rent at ${round(new_rent):,}/mo")
    if not summary_parts:
        summary = "Cashflows at list price under standard financing — no adjustments needed."
    elif len(summary_parts) == 1:
        summary = f"Cashflows with {summary_parts[0]}."
    else:
        summary = (
            "Cashflows by combining "
            + ", ".join(summary_parts[:-1])
            + f" and {summary_parts[-1]}."
        )

    selection_reason = (
        "Smallest set of conventional moves that makes this property cashflow on this listing"
    )

    caveat_parts: list[str] = []
    if price_cut_pct > 1e-6:
        caveat_parts.append(
            f"assumes the seller accepts a price negotiation within {ceiling_used * 100:.0f}% of list"
        )
    if rent_bump > 1.0:
        caveat_parts.append("rent assumption is unverified — confirm comps before pitching")
    caveat = (
        "Headline " + "; ".join(caveat_parts) + "."
        if caveat_parts
        else "Conventional terms only — no creative finance required from the seller."
    )

    pitch = _build_pitch(
        ctx,
        new_price=new_price,
        new_dp_pct=dp_pct,
        new_rent=new_rent,
        rent_bump=rent_bump,
        new_cash_required=new_cash_required,
    )

    # Pre-loaded record for "Apply in Strategy" handoff. Only carries the
    # levers that actually changed; reuses the existing scenarioPayload shape.
    pre_loaded: dict = {}
    if price_cut_pct > 1e-6:
        pre_loaded["custom_purchase_price"] = round(new_price, 0)
    if rent_bump > 1.0:
        pre_loaded["custom_rent_estimate"] = round(new_rent, 0)
    if dp_pct > ctx.down_payment_pct + 1e-6:
        pre_loaded.setdefault("pending_extras", {})
        pre_loaded["pending_extras"]["down_payment_pct_override"] = dp_pct
    pre_loaded.setdefault("pending_extras", {})
    pre_loaded["pending_extras"]["headline_structure_id"] = ID
    pre_loaded["pending_extras"]["price_ceiling_used"] = ceiling_used

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="Most likely seller-acceptable",
        headline=headline,
        summary=summary,
        levers=levers,
        monthly_savings=round(max(0.0, monthly_savings), 2),
        cash_required=round(new_cash_required, 0),
        ranking_score=92.0,  # high — this is the recommended starting structure
        pitch_script=pitch,
        caveat=caveat,
        selection_reason=selection_reason,
        pre_loaded_record=pre_loaded,
    )
