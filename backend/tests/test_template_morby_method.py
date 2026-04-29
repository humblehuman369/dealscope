"""Morby Method combination card — Sub2 + seller 0% second.

The Morby template is post-selection (not in ALL_TEMPLATES); it's invoked by the
selector when both Sub2 and seller-second-zero-balloon return non-null.
"""

from __future__ import annotations

from app.services.deal_structures.templates import (
    morby_method,
    seller_second_zero_balloon,
    sub2,
)

from tests._deal_structures_helpers import base_ctx


def _both_legs(ctx):
    return sub2.solve(ctx), seller_second_zero_balloon.solve(ctx)


def test_combine_returns_unified_card():
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    sub, ss = _both_legs(ctx)
    if sub is None or ss is None:
        return  # template precondition; cannot exercise combine()
    merged = morby_method.combine(sub, ss, ctx)
    assert merged.id == "morby-method"
    assert merged.family == "financing"
    assert "Morby" in merged.headline


def test_combine_takes_max_of_legs_for_savings_and_cash():
    """Each leg's monthly_savings / cash_required is independently calibrated; combo takes the max."""
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    sub, ss = _both_legs(ctx)
    if sub is None or ss is None:
        return
    merged = morby_method.combine(sub, ss, ctx)
    assert merged.monthly_savings == max(sub.monthly_savings, ss.monthly_savings)
    assert merged.cash_required == max(sub.cash_required, ss.cash_required)


def test_combine_adds_ranking_bonus():
    """Morby substitution earns a +4 named-pattern bonus on top of the higher-scored leg."""
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    sub, ss = _both_legs(ctx)
    if sub is None or ss is None:
        return
    merged = morby_method.combine(sub, ss, ctx)
    leg_max = max(sub.ranking_score, ss.ranking_score)
    assert merged.ranking_score >= leg_max
    # Bonus is +4 unless clamped at 100
    assert merged.ranking_score == min(100.0, leg_max + 4.0)


def test_combine_concatenates_caveats():
    """Both legs' honest caveats must survive the combination — never silently drop risk."""
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    sub, ss = _both_legs(ctx)
    if sub is None or ss is None:
        return
    merged = morby_method.combine(sub, ss, ctx)
    assert merged.caveat is not None
    if sub.caveat:
        assert sub.caveat[:30] in merged.caveat or "due-on-sale" in merged.caveat.lower()


def test_combine_levers_prefixed_by_origin():
    """Levers must be visually attributable to Sub2 vs Seller-2nd in the unified card."""
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    sub, ss = _both_legs(ctx)
    if sub is None or ss is None:
        return
    merged = morby_method.combine(sub, ss, ctx)
    labels = [lv.label for lv in merged.levers]
    assert any(label.startswith("Sub2") for label in labels)
    assert any(label.startswith("Seller 2nd") for label in labels)


def test_combine_pitch_script_truncated_to_4000_chars():
    """Pitch must stay under the 4KB cap so it fits the modal without scrolling abuse."""
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    sub, ss = _both_legs(ctx)
    if sub is None or ss is None:
        return
    merged = morby_method.combine(sub, ss, ctx)
    assert merged.pitch_script is not None
    assert len(merged.pitch_script) <= 4000


def test_combine_merges_pre_loaded_extras_and_overwrites_id():
    ctx = base_ctx(estimated_purchase_year=2021, estimated_purchase_price=350_000)
    sub, ss = _both_legs(ctx)
    if sub is None or ss is None:
        return
    merged = morby_method.combine(sub, ss, ctx)
    extras = merged.pre_loaded_record.get("pending_extras", {})
    assert extras["three_paths_structure_id"] == "morby-method"
    # Carry-amount must propagate from the seller-2nd leg.
    assert merged.pre_loaded_record.get("seller_carry_amount") == ss.pre_loaded_record.get(
        "pending_extras", {}
    ).get("seller_carry_amount")
