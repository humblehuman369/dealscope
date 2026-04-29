"""2-1 rate buydown template — seller-paid runway."""

from __future__ import annotations

from app.services.deal_structures.templates import rate_buydown

from tests._deal_structures_helpers import base_ctx


def viable_ctx(**overrides):
    """Context where the buydown actually fires.

    The default ``base_ctx`` rent ($2,800 against a $400K list) leaves Y1 cash flow
    slightly negative even with the buydown — the template gates that out. A
    higher rent threshold puts us in the realistic "the buydown closes the gap
    in year one" regime that this template was designed to model.
    """
    defaults = dict(monthly_rent=3500)
    defaults.update(overrides)
    return base_ctx(**defaults)


def test_returns_none_for_non_listed_property():
    """Rate buydown is a listed-property concession; off-market sellers don't structure these."""
    ctx = viable_ctx(is_listed=False)
    assert rate_buydown.solve(ctx) is None


def test_returns_none_when_gap_already_closed():
    ctx = viable_ctx(target_buy_price=400_000, deal_gap_pct=0)
    assert rate_buydown.solve(ctx) is None


def test_returns_none_when_y1_cash_flow_still_negative():
    """If even the year-1 buydown payment can't get cash flow above zero, skip."""
    ctx = base_ctx(monthly_rent=600, list_price=600_000)
    assert rate_buydown.solve(ctx) is None


def test_fires_with_listed_property_and_workable_gap():
    result = rate_buydown.solve(viable_ctx())
    assert result is not None
    assert result.id == "rate-buydown-2-1"
    assert result.family == "financing"
    assert result.monthly_savings > 0


def test_lever_labels_include_each_year_rate():
    """Card must surface Y1 + Y2 rates explicitly so users can sanity-check."""
    result = rate_buydown.solve(viable_ctx())
    assert result is not None
    labels = [lever.label for lever in result.levers]
    assert any("year 1" in label.lower() for label in labels)
    assert any("year 2" in label.lower() for label in labels)


def test_caveat_warns_about_year_three_reversion():
    """Honest gating: user must see the Y3 reset before they get excited."""
    result = rate_buydown.solve(viable_ctx())
    assert result is not None
    assert result.caveat is not None
    assert "year 3" in result.caveat.lower() or "y3" in result.caveat.lower()


def test_dom_30_plus_increases_ranking():
    short = rate_buydown.solve(viable_ctx(days_on_market=15))
    long = rate_buydown.solve(viable_ctx(days_on_market=60))
    assert short is not None and long is not None
    assert long.ranking_score > short.ranking_score


def test_new_construction_year_built_boosts_ranking():
    """year_built within ±2 of the eval year unlocks the new-construction bonus."""
    standard = rate_buydown.solve(viable_ctx(year_built=2010))
    new_const = rate_buydown.solve(viable_ctx(year_built=2026))
    assert standard is not None and new_const is not None
    assert new_const.ranking_score > standard.ranking_score


def test_pre_loaded_record_records_offsets():
    result = rate_buydown.solve(viable_ctx())
    assert result is not None
    extras = result.pre_loaded_record.get("pending_extras", {})
    assert extras["three_paths_structure_id"] == "rate-buydown-2-1"
    assert extras.get("rate_buydown_y1_pct_offset") == 0.02
    assert extras.get("rate_buydown_y2_pct_offset") == 0.01
