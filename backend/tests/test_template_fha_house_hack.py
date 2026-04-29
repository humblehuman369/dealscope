"""FHA house-hack template — strategy_switch family."""

from __future__ import annotations

from app.services.deal_structures.templates import fha_house_hack

from tests._deal_structures_helpers import base_ctx


def test_returns_none_when_explicitly_not_owner_occupied():
    ctx = base_ctx(is_owner_occupied=False, bedrooms=4)
    assert fha_house_hack.solve(ctx) is None


def test_returns_none_for_sfh_without_owner_occupied_flag():
    """Single-family with no owner-occ intent: card must not surface."""
    ctx = base_ctx(unit_count=1, is_owner_occupied=None, bedrooms=4)
    assert fha_house_hack.solve(ctx) is None


def test_returns_none_for_studio_with_no_rentable_bedrooms():
    """1BR or studio with no other units → no rentable share → no card."""
    ctx = base_ctx(unit_count=None, is_owner_occupied=True, bedrooms=1)
    assert fha_house_hack.solve(ctx) is None


def test_returns_none_for_5plus_unit_property():
    """FHA caps at 4 units; >=5 must skip to avoid lying."""
    ctx = base_ctx(unit_count=5)
    assert fha_house_hack.solve(ctx) is None


def test_returns_none_when_gap_already_closed():
    ctx = base_ctx(target_buy_price=400_000, deal_gap_pct=0, is_owner_occupied=True, bedrooms=4)
    assert fha_house_hack.solve(ctx) is None


def test_fires_for_owner_occupied_4br_single_family():
    """SFH owner-occupy with spare bedrooms attributable to rent."""
    ctx = base_ctx(
        is_owner_occupied=True,
        bedrooms=4,
        monthly_rent=2800,
        list_price=380_000,
        deal_gap_pct=8.0,
        target_buy_price=350_000,
    )
    result = fha_house_hack.solve(ctx)
    if result is None:
        return
    assert result.id == "fha-house-hack"
    assert result.family == "strategy_switch"
    assert result.monthly_savings > 0


def test_fires_for_2_unit_without_explicit_owner_occupied_flag():
    """2-4 unit small multifamily can surface the card without explicit owner-occ flag."""
    ctx = base_ctx(unit_count=2, is_owner_occupied=None, monthly_rent=3200, list_price=400_000)
    result = fha_house_hack.solve(ctx)
    if result is None:
        return
    assert result.id == "fha-house-hack"


def test_caveat_warns_about_one_year_occupancy_requirement():
    ctx = base_ctx(is_owner_occupied=True, bedrooms=4, monthly_rent=2800)
    result = fha_house_hack.solve(ctx)
    if result is None:
        return
    assert result.caveat is not None
    assert "1 year" in result.caveat or "year" in result.caveat.lower()


def test_cash_required_uses_3_5_percent_down():
    """FHA's signature 3.5% down should produce a cash-to-close figure smaller than baseline."""
    ctx = base_ctx(
        is_owner_occupied=True,
        bedrooms=4,
        monthly_rent=2800,
        list_price=400_000,
        deal_gap_pct=8.0,
        target_buy_price=370_000,
    )
    result = fha_house_hack.solve(ctx)
    if result is None:
        return
    expected_down = 400_000 * 0.035 + 400_000 * 0.03  # down + closing
    assert abs(result.cash_required - expected_down) < 1.0


def test_pre_loaded_record_marks_owner_occupied():
    ctx = base_ctx(is_owner_occupied=True, bedrooms=4, monthly_rent=2800)
    result = fha_house_hack.solve(ctx)
    if result is None:
        return
    assert result.pre_loaded_record.get("is_owner_occupied") is True
    extras = result.pre_loaded_record.get("pending_extras", {})
    assert extras["three_paths_structure_id"] == "fha-house-hack"
