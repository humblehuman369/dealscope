"""Blended Plan (Path 4) — combines partial price + seller 2nd + rent uplift.

Engine-level integration is covered in ``test_deal_structures_engine.py``; this
file zooms in on the blended template's internals: cap-bleed allocation,
realism-weighted distribution, headline composition, and best-effort fallback.
"""

from __future__ import annotations

from app.services.deal_structures.templates import (
    blended_plan,
    price_negotiation,
    rent_uplift,
    seller_second_zero_balloon,
)

from tests._deal_structures_helpers import base_ctx


def _components(ctx):
    return (
        price_negotiation.solve(ctx),
        seller_second_zero_balloon.solve(ctx),
        rent_uplift.solve(ctx),
    )


def test_returns_none_when_gap_already_closed():
    ctx = base_ctx(target_buy_price=400_000, deal_gap_pct=0)
    p, ss, r = _components(ctx)
    assert blended_plan.solve(ctx, price_result=p, seller2nd_result=ss, rent_result=r) is None


def test_returns_none_when_list_price_zero():
    ctx = base_ctx(list_price=0, target_buy_price=0, deal_gap_pct=0)
    assert blended_plan.solve(
        ctx, price_result=None, seller2nd_result=None, rent_result=None
    ) is None


def test_fires_when_components_present():
    ctx = base_ctx()
    p, ss, r = _components(ctx)
    result = blended_plan.solve(ctx, price_result=p, seller2nd_result=ss, rent_result=r)
    assert result is not None
    assert result.id == "blended-plan"
    assert result.family == "blended"
    assert result.monthly_savings > 0


def test_renders_three_levers_in_canonical_order():
    """Card must show price + seller 2nd + rent rows so users see how the blend distributes."""
    ctx = base_ctx()
    p, ss, r = _components(ctx)
    result = blended_plan.solve(ctx, price_result=p, seller2nd_result=ss, rent_result=r)
    assert result is not None
    assert len(result.levers) == 3
    labels = [lever.label.lower() for lever in result.levers]
    assert "purchase price" in labels[0]
    assert "seller 2nd" in labels[1]
    assert "monthly rent" in labels[2]


def test_pre_loaded_record_carries_all_three_levers():
    """T2 handoff: each lever's value must round-trip into the Strategy worksheet."""
    ctx = base_ctx()
    p, ss, r = _components(ctx)
    result = blended_plan.solve(ctx, price_result=p, seller2nd_result=ss, rent_result=r)
    assert result is not None
    record = result.pre_loaded_record
    assert "custom_purchase_price" in record
    assert "custom_rent_estimate" in record
    extras = record.get("pending_extras", {})
    assert "seller_carry_amount" in extras
    assert extras.get("seller_carry_rate") == 0.0


def test_realism_label_reflects_close_status():
    """When the blend closes the gap, label is 'Combined plan'; when it falls short, it's 'Best-effort combination'."""
    ctx = base_ctx()
    p, ss, r = _components(ctx)
    result = blended_plan.solve(ctx, price_result=p, seller2nd_result=ss, rent_result=r)
    assert result is not None
    assert result.realism_label in ("Combined plan", "Best-effort combination")


def test_headline_includes_all_three_lever_signals():
    """Headline must mention price cut, seller 2nd, and rent lift so the user reads the blend at a glance."""
    ctx = base_ctx()
    p, ss, r = _components(ctx)
    result = blended_plan.solve(ctx, price_result=p, seller2nd_result=ss, rent_result=r)
    assert result is not None
    headline = result.headline.lower()
    assert "price" in headline
    assert "seller" in headline
    assert "rent" in headline


def test_selection_reason_explains_the_blend_thesis():
    """Trust-building: explain WHY a blend is shown, not just what it does."""
    ctx = base_ctx()
    p, ss, r = _components(ctx)
    result = blended_plan.solve(ctx, price_result=p, seller2nd_result=ss, rent_result=r)
    assert result is not None
    assert result.selection_reason is not None
    assert "combine" in result.selection_reason.lower() or "smaller" in result.selection_reason.lower()


def test_caveat_only_set_when_gap_remains_open():
    """If the blend fully closes the gap, no caveat — don't manufacture risk."""
    ctx = base_ctx()
    p, ss, r = _components(ctx)
    result = blended_plan.solve(ctx, price_result=p, seller2nd_result=ss, rent_result=r)
    assert result is not None
    if result.realism_label == "Combined plan":
        assert result.caveat is None
    else:
        assert result.caveat is not None


# ---------------------------------------------------------------------------
# Cap-bleed allocator — the load-bearing internal helper
# ---------------------------------------------------------------------------


def test_allocate_with_bleed_redistributes_when_one_bucket_caps():
    """When bucket 0 caps, its weight is absorbed by buckets 1 and 2."""
    a, b, c = blended_plan._allocate_with_bleed(
        gap=300, weights=(50.0, 50.0, 50.0), caps=(50.0, 200.0, 200.0)
    )
    assert a == 50.0  # capped
    # Remainder (250) split between b and c — each ~125
    assert abs(b - c) < 1e-6
    assert abs((a + b + c) - 300) < 1e-6


def test_allocate_with_bleed_returns_zero_when_gap_zero():
    a, b, c = blended_plan._allocate_with_bleed(
        gap=0, weights=(1.0, 1.0, 1.0), caps=(100.0, 100.0, 100.0)
    )
    assert (a, b, c) == (0.0, 0.0, 0.0)


def test_allocate_with_bleed_caps_at_total_cap_when_gap_unreachable():
    """Best-effort: when total caps < gap, every bucket maxes."""
    a, b, c = blended_plan._allocate_with_bleed(
        gap=1_000, weights=(1.0, 1.0, 1.0), caps=(50.0, 80.0, 100.0)
    )
    assert a == 50.0
    assert b == 80.0
    assert c == 100.0


def test_allocate_with_bleed_handles_zero_weight_via_cap_only_distribution():
    """When all weights are zero but caps exist, distribution falls back to capped buckets evenly."""
    a, b, c = blended_plan._allocate_with_bleed(
        gap=200, weights=(0.0, 0.0, 0.0), caps=(100.0, 100.0, 100.0)
    )
    # Each bucket gets equal allocation since cap-fallback distributes uniformly.
    assert a == b == c
    assert abs((a + b + c) - 200) < 1e-6
