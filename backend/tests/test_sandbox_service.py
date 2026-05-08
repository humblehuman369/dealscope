"""Activation Arc Phase 0 (B2) — Build Your Deal sandbox recompute service.

Tests cover the locked behavior: pure recompute, motivating-tier mapping,
seller-carry math, and that adjustments override base inputs cleanly.
"""

from __future__ import annotations

from app.schemas.sandbox import SandboxAdjustments, SandboxBaseInputs, SandboxRequest
from app.services.sandbox import _motivating_label_for, recompute_gap


def _base(**overrides) -> SandboxBaseInputs:
    """Realistic property — modest gap at default 20% / 6.5% / 30-yr."""
    defaults = dict(
        list_price=410_000,
        monthly_rent=2400,
        property_taxes_annual=4800,
        insurance_annual=1500,
        down_payment_pct=0.20,
        interest_rate=0.065,
        loan_term_years=30,
        closing_costs_pct=0.03,
        vacancy_rate=0.05,
        maintenance_pct=0.05,
        management_pct=0.08,
        capex_pct=0.05,
        utilities_annual=0,
        other_annual_expenses=0,
        buy_discount_pct=0.05,
        is_listed=True,
    )
    defaults.update(overrides)
    return SandboxBaseInputs(**defaults)


def _request(adjustments: SandboxAdjustments | None = None, **base_overrides) -> SandboxRequest:
    return SandboxRequest(
        base=_base(**base_overrides),
        adjustments=adjustments or SandboxAdjustments(),
    )


# ---------------------------------------------------------------------------
# Motivating label tier mapping — mirror of frontend getDealGapTier
# ---------------------------------------------------------------------------


def test_motivating_label_cash_flow_when_gap_zero_or_negative():
    assert _motivating_label_for(0.0) == "Cash-Flow Deal"
    assert _motivating_label_for(-3.5) == "Cash-Flow Deal"
    assert _motivating_label_for(-25.0) == "Cash-Flow Deal"


def test_motivating_label_negotiable_at_5_pct_or_below():
    assert _motivating_label_for(0.5) == "Negotiable Deal"
    assert _motivating_label_for(5.0) == "Negotiable Deal"


def test_motivating_label_near_at_5_to_10_pct():
    assert _motivating_label_for(7.5) == "Near Deal"
    assert _motivating_label_for(10.0) == "Near Deal"


def test_motivating_label_potential_at_10_to_20_pct():
    assert _motivating_label_for(12.0) == "Potential Deal"
    assert _motivating_label_for(20.0) == "Potential Deal"


def test_motivating_label_structured_at_20_to_30_pct():
    assert _motivating_label_for(25.0) == "Structured Deal"
    assert _motivating_label_for(30.0) == "Structured Deal"


def test_motivating_label_reset_above_30_pct():
    assert _motivating_label_for(35.0) == "Reset Deal"
    assert _motivating_label_for(80.0) == "Reset Deal"


# ---------------------------------------------------------------------------
# No-adjustment path — sandbox with empty adjustments matches base inputs
# ---------------------------------------------------------------------------


def test_no_adjustments_returns_baseline_recompute():
    """With no adjustments, the response reflects the base inputs cleanly."""
    response = recompute_gap(_request())
    assert response.cash_required > 0
    assert response.monthly_pi > 0
    assert response.income_value >= 0
    assert response.target_buy_price >= 0
    assert response.deal_gap_pct == round(
        ((410_000 - response.target_buy_price) / 410_000) * 100, 2
    )


def test_no_adjustments_label_matches_gap():
    """The motivating_label field must always match _motivating_label_for(deal_gap_pct)."""
    response = recompute_gap(_request())
    assert response.motivating_label == _motivating_label_for(response.deal_gap_pct)


# ---------------------------------------------------------------------------
# Adjustments override base inputs
# ---------------------------------------------------------------------------


def test_price_adjustment_changes_gap():
    """Lower price → smaller gap (closer to 0)."""
    base_response = recompute_gap(_request())
    lowered = recompute_gap(_request(SandboxAdjustments(price=380_000)))
    # Smaller price + same target buy → narrower gap pct.
    assert lowered.deal_gap_pct < base_response.deal_gap_pct


def test_rent_adjustment_lifts_target_buy_price():
    """Higher rent → higher Income Value → higher Target Buy → smaller gap."""
    base_response = recompute_gap(_request())
    rent_up = recompute_gap(_request(SandboxAdjustments(monthly_rent=2900)))
    assert rent_up.income_value > base_response.income_value
    assert rent_up.target_buy_price > base_response.target_buy_price
    assert rent_up.deal_gap_pct < base_response.deal_gap_pct


def test_dp_adjustment_reduces_monthly_pi():
    """Larger down payment → smaller bank loan → lower monthly P&I."""
    base_response = recompute_gap(_request())
    dp_up = recompute_gap(_request(SandboxAdjustments(down_payment_pct=0.40)))
    assert dp_up.monthly_pi < base_response.monthly_pi
    # Cash-to-close goes UP because more equity is required.
    assert dp_up.cash_required > base_response.cash_required


def test_seller_carry_reduces_cash_to_close_one_for_one():
    """Seller carry is 0% interest in v1 — reduces buyer cash without changing P&I."""
    base_response = recompute_gap(_request())
    carry = recompute_gap(_request(SandboxAdjustments(seller_carry_amount=20_000)))
    assert carry.cash_required == base_response.cash_required - 20_000
    # Bank loan also reduces (carry sits behind it), so monthly P&I drops.
    assert carry.monthly_pi < base_response.monthly_pi


def test_seller_carry_clamped_to_price():
    """Defensive: carry exceeding price is clamped to price (cash_required floored at 0).

    Schema enforces an upper bound of 100M on seller_carry_amount (matches list_price);
    we test the within-bounds clamp by using a carry larger than the listing price
    (which is well under the schema bound).
    """
    response = recompute_gap(
        _request(SandboxAdjustments(seller_carry_amount=600_000), list_price=410_000)
    )
    assert response.cash_required == 0


# ---------------------------------------------------------------------------
# Combined adjustments — sandbox solves end-to-end
# ---------------------------------------------------------------------------


def test_combined_adjustments_close_gap():
    """Realistic scenario: small price cut + rent uplift closes the gap."""
    response = recompute_gap(
        _request(
            SandboxAdjustments(
                price=395_000,
                monthly_rent=2750,
                down_payment_pct=0.25,
            )
        )
    )
    # Combined adjustments should produce a tighter gap than baseline.
    base = recompute_gap(_request())
    assert response.deal_gap_pct < base.deal_gap_pct


def test_pure_function_no_side_effects():
    """The same input yields the same output across multiple calls."""
    req = _request(
        SandboxAdjustments(price=395_000, monthly_rent=2750, seller_carry_amount=15_000)
    )
    a = recompute_gap(req)
    b = recompute_gap(req)
    assert a.model_dump() == b.model_dump()


# ---------------------------------------------------------------------------
# Camel-case API serialization for the frontend
# ---------------------------------------------------------------------------


def test_response_serializes_camel_case_for_frontend():
    """Frontend consumes camelCase. Verify alias generator covers all fields."""
    response = recompute_gap(_request())
    serialized = response.model_dump(by_alias=True)
    expected = {
        "dealGapPct",
        "motivatingLabel",
        "monthlyCashFlow",
        "monthlyPi",
        "cashRequired",
        "incomeValue",
        "targetBuyPrice",
    }
    assert expected.issubset(serialized.keys())
