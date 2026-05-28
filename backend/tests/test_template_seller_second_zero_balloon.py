"""Seller-Second 0% Balloon — preserves full asking price in exchange for terms."""

from __future__ import annotations

from app.services.deal_structures.templates import seller_second_zero_balloon

from tests._deal_structures_helpers import base_ctx


def test_template_fires_for_property_with_deal_gap():
    """Sanity: viable context produces a structure card."""
    result = seller_second_zero_balloon.solve(base_ctx())
    assert result is not None
    assert result.id == "seller-second-zero-balloon"
    assert result.family == "financing"


def test_returns_none_when_no_deal_gap():
    """Pre-cleared deal gap → no card."""
    ctx = base_ctx(target_buy_price=400_000, deal_gap_pct=0)
    assert seller_second_zero_balloon.solve(ctx) is None


def test_pre_loaded_record_carries_seller_carry_terms():
    """Lever values used by the worksheet must surface in pending_extras."""
    result = seller_second_zero_balloon.solve(base_ctx())
    assert result is not None
    extras = result.pre_loaded_record.get("pending_extras", {})
    assert extras.get("seller_carry_amount", 0) > 0
    assert extras.get("seller_carry_rate") == 0.0
    assert extras.get("seller_carry_term_years") == 5


def test_pre_loaded_record_never_exceeds_list_price():
    """Worksheet buy price must stay at or below asking."""
    ctx = base_ctx()
    result = seller_second_zero_balloon.solve(ctx)
    assert result is not None
    assert 0 < result.pre_loaded_record["custom_purchase_price"] <= ctx.list_price
