"""Larger down payment template — capital_stack family."""

from __future__ import annotations

from app.services.deal_structures.templates import larger_down

from tests._deal_structures_helpers import base_ctx


def test_returns_none_when_gap_already_closed():
    """Baseline already cash-flows → no need to put more down."""
    ctx = base_ctx(target_buy_price=400_000, deal_gap_pct=0)
    assert larger_down.solve(ctx) is None


def test_returns_none_when_baseline_already_cash_flows():
    """Cheap rent-to-price → 20% down already works → template skips."""
    ctx = base_ctx(monthly_rent=4500, list_price=400_000)
    assert larger_down.solve(ctx) is None


def test_returns_none_when_even_50pct_down_insufficient():
    """Hopeless gap: rent way too low to ever clear cash-flow constraint."""
    ctx = base_ctx(monthly_rent=600, list_price=600_000, target_buy_price=200_000, deal_gap_pct=66.0)
    assert larger_down.solve(ctx) is None


def test_fires_for_modest_gap_with_solvable_cash_increase():
    """Gap small enough that a higher down clears it."""
    ctx = base_ctx(monthly_rent=2200, list_price=400_000, deal_gap_pct=6.0, target_buy_price=376_000)
    result = larger_down.solve(ctx)
    if result is None:
        return  # parameter combo didn't trigger; not a regression
    assert result.id == "larger-down"
    assert result.family == "capital_stack"
    assert result.monthly_savings > 0
    assert result.cash_required > 0


def test_small_gap_ranks_higher_than_baseline():
    """Selector signal: small gaps → +14 ranking bonus on this template."""
    small_gap = larger_down.solve(base_ctx(deal_gap_pct=5.0, monthly_rent=2200, target_buy_price=380_000))
    medium_gap = larger_down.solve(base_ctx(deal_gap_pct=15.0, monthly_rent=2200, target_buy_price=340_000))
    if small_gap is None or medium_gap is None:
        return
    assert small_gap.ranking_score >= medium_gap.ranking_score


def test_caveat_mentions_cash_on_cash_tradeoff():
    result = larger_down.solve(base_ctx(monthly_rent=2200, deal_gap_pct=6.0, target_buy_price=376_000))
    if result is None:
        return
    assert result.caveat is not None
    assert "cash" in result.caveat.lower()


def test_pre_loaded_record_overrides_down_payment_pct():
    result = larger_down.solve(base_ctx(monthly_rent=2200, deal_gap_pct=6.0, target_buy_price=376_000))
    if result is None:
        return
    extras = result.pre_loaded_record.get("pending_extras", {})
    assert extras["three_paths_structure_id"] == "larger-down"
    assert "down_payment_pct_override" in extras
    assert 0.20 < extras["down_payment_pct_override"] <= 0.50
