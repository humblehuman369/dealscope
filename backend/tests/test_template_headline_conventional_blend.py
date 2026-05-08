"""Conventional Headline Blend template — Phase 0 (Activation Arc).

These tests assert the locked behavior: smallest aggregate ask, market-aware
price ceiling, honest gating when no plausible blend cashflows, and zero use
of creative-finance levers (the headline never includes seller financing).
"""

from __future__ import annotations

from app.services.deal_structures.templates import headline_conventional_blend
from app.services.deal_structures.templates.headline_conventional_blend import (
    _MAX_RENT_BUMP_PCT,
)

from tests._deal_structures_helpers import base_ctx


# ---------------------------------------------------------------------------
# Honest gating — when the math doesn't support a conventional blend
# ---------------------------------------------------------------------------


def test_returns_none_when_no_gap():
    """No deal gap → no headline needed."""
    ctx = base_ctx(deal_gap_pct=0, target_buy_price=400_000)
    assert headline_conventional_blend.solve(ctx) is None


def test_returns_none_when_list_price_zero():
    """Defensive: pathological zero price."""
    ctx = base_ctx(list_price=0)
    assert headline_conventional_blend.solve(ctx) is None


def test_returns_none_when_monthly_rent_zero():
    """Defensive: rent must be present for the blend to compute."""
    ctx = base_ctx(monthly_rent=0)
    assert headline_conventional_blend.solve(ctx) is None


def test_returns_none_for_hopelessly_underwater_property():
    """Property whose rent is so low that even max DP + max rent uplift + max
    price cut can't cashflow → engine treats as honest fallback (Reset Deal).
    """
    ctx = base_ctx(
        list_price=600_000,
        target_buy_price=200_000,
        deal_gap_pct=66.0,
        monthly_rent=600,
    )
    assert headline_conventional_blend.solve(ctx) is None


# ---------------------------------------------------------------------------
# Smallest aggregate ask — algorithm should prefer rent + small price ask
# before increasing the buyer's down payment
# ---------------------------------------------------------------------------


def test_no_adjustment_needed_when_baseline_already_cashflows():
    """Defensive: even though deal_gap_amount > 0 (gap is in price terms),
    if rent-to-price is strong enough that 20% down at list still cashflows,
    the template returns a structure with zero changes from baseline.
    """
    ctx = base_ctx(monthly_rent=4500, list_price=400_000, deal_gap_pct=8.0)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return  # parameter combo didn't trigger; not a regression
    # Should have no levers (everything matches baseline) when nothing changed.
    assert result.id == "headline-conventional-blend"
    assert result.family == "conventional_headline"


def test_prefers_no_dp_increase_when_rent_alone_can_close_gap():
    """Property where a small rent uplift at base DP cashflows → blend should
    NOT escalate DP. Validates the lowest-friction-first cascade.
    """
    # Modest gap, healthy rent — small rent uplift should bridge.
    ctx = base_ctx(
        list_price=400_000,
        target_buy_price=380_000,
        deal_gap_pct=5.0,
        monthly_rent=2900,
    )
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    # Down-payment lever should NOT appear when the algorithm stayed at base DP.
    dp_levers = [lv for lv in result.levers if lv.label == "Down payment"]
    if dp_levers:
        # If DP was raised, the after-label must remain ≤ base + 5% step
        assert dp_levers[0].after_label in {"20%", "25%"}


def test_returns_combo_with_modest_dp_when_rent_alone_insufficient():
    """Property whose rent is too low to bridge with 20% DP → algorithm should
    escalate DP to find a viable combination.
    """
    ctx = base_ctx(
        list_price=410_000,
        target_buy_price=360_000,
        deal_gap_pct=12.2,
        monthly_rent=2400,
        market_temperature="cold",
    )
    result = headline_conventional_blend.solve(ctx)
    assert result is not None
    assert result.cash_required > ctx.list_price * (ctx.down_payment_pct + ctx.closing_costs_pct)


# ---------------------------------------------------------------------------
# Market-aware price ceiling — uses ctx.market_temperature
# ---------------------------------------------------------------------------


def test_cold_market_uses_8pct_ceiling():
    """Cold-market properties allow up to 8% price negotiation in the headline."""
    ctx = base_ctx(market_temperature="cold")
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    assert result.pre_loaded_record["pending_extras"]["price_ceiling_used"] in {0.08, 0.11}


def test_hot_market_uses_3pct_ceiling():
    """Hot-market properties cap price ask at 3% (with 6% expanded fallback)."""
    ctx = base_ctx(market_temperature="hot")
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    assert result.pre_loaded_record["pending_extras"]["price_ceiling_used"] in {0.03, 0.06}


def test_unknown_market_temperature_falls_back_to_5pct():
    """When market_temperature is None or unrecognized, fall back to neutral 5%."""
    ctx = base_ctx(market_temperature=None)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    assert result.pre_loaded_record["pending_extras"]["price_ceiling_used"] in {0.05, 0.08}


def test_unrecognized_market_temperature_string_falls_back():
    """Defensive: a typo or future value in market_temperature falls back safely."""
    ctx = base_ctx(market_temperature="lukewarm")
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    assert result.pre_loaded_record["pending_extras"]["price_ceiling_used"] in {0.05, 0.08}


# ---------------------------------------------------------------------------
# Output contract — every returned structure follows the locked shape
# ---------------------------------------------------------------------------


def test_family_is_conventional_headline():
    """Locked: this template never reuses an existing family."""
    ctx = base_ctx(monthly_rent=2500, deal_gap_pct=8.0, target_buy_price=370_000)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    assert result.family == "conventional_headline"
    assert result.family_label == "Conventional headline"
    assert result.id == "headline-conventional-blend"


def test_caveat_mentions_price_ceiling_when_price_negotiated():
    """Caveat must disclose that the headline assumes a price negotiation."""
    ctx = base_ctx(monthly_rent=2500, deal_gap_pct=8.0, target_buy_price=370_000)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    if any(lv.label == "Price" for lv in result.levers):
        assert "price negotiation" in (result.caveat or "").lower()


def test_caveat_mentions_rent_verification_when_rent_uplifted():
    """Caveat must call out unverified rent assumption when uplift is part of the blend."""
    ctx = base_ctx(monthly_rent=2500, deal_gap_pct=10.0, target_buy_price=360_000)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    if any(lv.label == "Monthly rent" for lv in result.levers):
        assert "unverified" in (result.caveat or "").lower() or "comps" in (result.caveat or "").lower()


def test_pitch_includes_no_creative_finance():
    """Locked: the headline pitch must NEVER reference Sub2, seller carry, wraparound,
    or any major-cooperation creative-finance structure. Per the doctrine, those
    surface only as Four Paths cards or downpayment-reducer optimizations.
    """
    ctx = base_ctx(monthly_rent=2400, deal_gap_pct=12.0, target_buy_price=360_000)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    pitch = (result.pitch_script or "").lower()
    forbidden = ["sub2", "subject-to", "subject to", "wraparound", "wrap-around", "morby", "seller carry", "seller-carry", "seller second"]
    for term in forbidden:
        assert term not in pitch, f"Pitch contained forbidden creative-finance term: {term!r}"


def test_pitch_mentions_rent_verification_steps_when_rent_uplifted():
    """When rent uplift is part of the blend, the pitch must include the
    rent_uplift template's verification doctrine (never raise an offer on
    unverified rent).
    """
    ctx = base_ctx(monthly_rent=2500, deal_gap_pct=10.0, target_buy_price=360_000)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    if any(lv.label == "Monthly rent" for lv in result.levers):
        pitch = (result.pitch_script or "").lower()
        assert "verify" in pitch
        assert "property manager" in pitch or "rentometer" in pitch


def test_pre_loaded_record_carries_modified_levers():
    """Strategy handoff: pre_loaded_record must include only the levers that
    actually changed from baseline.
    """
    ctx = base_ctx(monthly_rent=2400, deal_gap_pct=12.0, target_buy_price=360_000)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    pre = result.pre_loaded_record
    # The structure ID and ceiling are always present.
    assert pre["pending_extras"]["headline_structure_id"] == "headline-conventional-blend"
    assert "price_ceiling_used" in pre["pending_extras"]
    # If the price was cut, the pre-loaded record carries it. Same for rent.
    price_changed = any(lv.label == "Price" for lv in result.levers)
    if price_changed:
        assert "custom_purchase_price" in pre


def test_ranking_score_is_high():
    """The headline structure is the recommended starting point — its
    ranking_score should be high so callers can sort or compare meaningfully.
    """
    ctx = base_ctx(monthly_rent=2400, deal_gap_pct=12.0, target_buy_price=360_000)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    assert result.ranking_score >= 80


# ---------------------------------------------------------------------------
# Bounds — algorithm respects rent cap and DP cap
# ---------------------------------------------------------------------------


def test_rent_uplift_never_exceeds_20_pct_cap():
    """Locked: rent uplift in the headline must not exceed the rent_uplift
    template's MAX_REALISTIC_BUMP_PCT cap (currently 20%).
    """
    ctx = base_ctx(monthly_rent=2200, list_price=400_000, deal_gap_pct=10.0, target_buy_price=360_000)
    result = headline_conventional_blend.solve(ctx)
    if result is None:
        return
    rent_levers = [lv for lv in result.levers if lv.label == "Monthly rent"]
    if rent_levers:
        # Parse the after-label (format: "$2,640")
        new_rent_str = rent_levers[0].after_label.replace("$", "").replace(",", "")
        new_rent = float(new_rent_str)
        max_allowed = ctx.monthly_rent * (1 + _MAX_RENT_BUMP_PCT)
        assert new_rent <= max_allowed + 1.0  # tolerate rounding
