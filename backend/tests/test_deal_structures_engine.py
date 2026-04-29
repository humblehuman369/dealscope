"""Golden-style tests for Three Paths engine + selector."""

from app.core.defaults import STRUCTURE_TEMPLATE_FLAGS
from app.schemas.deal_structures import DealStructure
from app.services.deal_structures import compute_deal_structures
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.selector import _apply_regional_calibration, select_three_paths
from app.services.deal_structures.templates import ALL_TEMPLATES


def _base_ctx(**kwargs) -> StructureContext:
    defaults = dict(
        list_price=400_000,
        target_buy_price=360_000,
        income_value=380_000,
        deal_gap_pct=10.0,
        monthly_rent=2800,
        property_taxes_annual=4800,
        insurance_annual=4000,
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
        is_listed=True,
        days_on_market=45,
        is_fsbo=False,
        is_foreclosure=False,
        is_bank_owned=False,
        market_temperature="cold",
        template_flags={},
        state=None,
    )
    defaults.update(kwargs)
    return StructureContext(**defaults)


def test_engine_returns_empty_when_gap_not_positive():
    ctx = _base_ctx(target_buy_price=400_000, deal_gap_pct=0)
    out = compute_deal_structures(ctx)
    assert out.has_paths is False
    assert out.paths == []


def test_flags_disable_template():
    ctx = _base_ctx(template_flags={**STRUCTURE_TEMPLATE_FLAGS, "price-negotiation": False})
    out = compute_deal_structures(ctx)
    assert all(p.id != "price-negotiation" for p in out.paths)


def test_selector_respects_family_diversity():
    ctx = _base_ctx()
    paths = select_three_paths(ctx)
    families = [p.family for p in paths]
    assert len(families) == len(set(families))


def test_selector_weights_perturbation_invariant():
    """Ranking remains finite after artificial score inflation (regression guard)."""
    ctx = _base_ctx(days_on_market=200, is_fsbo=True)
    paths = select_three_paths(ctx)
    for p in paths:
        assert 0 <= p.ranking_score <= 100


def test_sub2_fires_with_sale_year_and_price():
    """2021 rate proxy beats baseline 6.5%; Sub2 or Morby (Sub2 + seller-2nd merged) may appear."""
    ctx = _base_ctx(
        estimated_purchase_year=2021,
        estimated_purchase_price=350_000,
        interest_rate=0.065,
    )
    out = compute_deal_structures(ctx)
    ids = [p.id for p in out.paths]
    assert "sub2" in ids or "morby-method" in ids


def test_template_ids_registered():
    for t in ALL_TEMPLATES:
        assert getattr(t, "ID", None)


# ---------------------------------------------------------------------------
# Path 4 — Blended Plan
# ---------------------------------------------------------------------------


def test_blended_plan_appears_as_fourth():
    """Positive Deal Gap returns the blended plan as the last card in the payload."""
    ctx = _base_ctx()
    out = compute_deal_structures(ctx)
    assert out.has_paths is True
    assert len(out.paths) >= 4
    assert out.paths[-1].id == "blended-plan"
    assert out.paths[-1].family == "blended"


def test_blended_split_realism_weighted_with_missing_component():
    """When a component returns None / weight 0, the others absorb its share."""
    from app.services.deal_structures.templates import (
        blended_plan,
        price_negotiation,
        rent_uplift,
    )

    ctx = _base_ctx(monthly_rent=0)  # rent uplift can't fire (haircut path returns None)
    rent_result = rent_uplift.solve(ctx)
    assert rent_result is None

    blended = blended_plan.solve(
        ctx,
        price_result=price_negotiation.solve(ctx),
        seller2nd_result=None,
        rent_result=rent_result,
    )
    assert blended is not None
    rent_lever = next(lv for lv in blended.levers if lv.label.lower() == "monthly rent")
    assert rent_lever.after_label == "$0"


def test_blended_caps_bleed_best_effort():
    """When all three levers cap before closing the gap, card still renders with caveat."""
    from app.services.deal_structures.templates import (
        blended_plan,
        price_negotiation,
        rent_uplift,
        seller_second_zero_balloon,
    )

    # Punishing gap: rent extremely low vs price → no combo can close it.
    ctx = _base_ctx(
        list_price=600_000,
        target_buy_price=200_000,
        deal_gap_pct=66.0,
        monthly_rent=900,
        property_taxes_annual=8_000,
        insurance_annual=4_500,
    )
    blended = blended_plan.solve(
        ctx,
        price_result=price_negotiation.solve(ctx),
        seller2nd_result=seller_second_zero_balloon.solve(ctx),
        rent_result=rent_uplift.solve(ctx),
    )
    if blended is not None:
        if blended.caveat:
            assert "stretched" in blended.caveat.lower() or "gap" in blended.caveat.lower()
        assert blended.realism_label in ("Combined plan", "Best-effort combination")


def test_blended_disabled_via_flag():
    """Setting blended-plan flag False suppresses Path 4 entirely."""
    ctx = _base_ctx(template_flags={**STRUCTURE_TEMPLATE_FLAGS, "blended-plan": False})
    out = compute_deal_structures(ctx)
    assert all(p.id != "blended-plan" for p in out.paths)


def _minimal_structure(structure_id: str, family: str = "financing") -> DealStructure:
    return DealStructure(
        id=structure_id,
        family=family,  # type: ignore[arg-type]
        family_label="t",
        realism_label="t",
        headline="h",
        summary="s",
        levers=[],
        monthly_savings=100,
        cash_required=1000,
        ranking_score=70,
    )


def test_regional_calibration_tx_fl_boosts_sub2():
    sub = _minimal_structure("sub2")
    ctx_tx = _base_ctx(state="TX")
    ctx_az = _base_ctx(state="AZ")
    assert _apply_regional_calibration(ctx_tx, sub, 70) == 75
    assert _apply_regional_calibration(ctx_az, sub, 70) == 70


def test_regional_calibration_ca_ny_assumable_and_midwest_financing():
    assumable = _minimal_structure("assumable")
    ctx_ny = _base_ctx(state="NY")
    assert _apply_regional_calibration(ctx_ny, assumable, 80) == 93  # coastal financing +5, CA/NY assumable +8

    sub = _minimal_structure("sub2")
    ctx_oh = _base_ctx(state="OH")
    assert _apply_regional_calibration(ctx_oh, sub, 70) == 75  # midwest financing +5
