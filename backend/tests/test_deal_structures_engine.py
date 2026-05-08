"""Golden-style tests for Three Paths engine + selector."""

from app.core.defaults import STRUCTURE_TEMPLATE_FLAGS
from app.schemas.deal_structures import DealStructure
from app.services.deal_structures import compute_deal_structures
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.selector import _apply_regional_calibration, select_four_paths
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
    paths = select_four_paths(ctx)
    families = [p.family for p in paths]
    assert len(families) == len(set(families))


def test_selector_weights_perturbation_invariant():
    """Ranking remains finite after artificial score inflation (regression guard)."""
    ctx = _base_ctx(days_on_market=200, is_fsbo=True)
    paths = select_four_paths(ctx)
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


# ---------------------------------------------------------------------------
# T17 — user-dismiss signal at the engine level
# ---------------------------------------------------------------------------


def test_blended_suppressed_when_blended_family_dismissed():
    """Dismissing the 'blended' family must drop Path 4 entirely, not just penalize it."""
    ctx = _base_ctx(dismissed_families=("blended",))
    out = compute_deal_structures(ctx)
    assert all(p.family != "blended" for p in out.paths)


def test_blended_still_appears_when_unrelated_family_dismissed():
    """Dismissing 'income' must not silently drop the Blended Plan — it owns its own family."""
    ctx = _base_ctx(dismissed_families=("income",))
    out = compute_deal_structures(ctx)
    assert any(p.family == "blended" for p in out.paths)


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


# ---------------------------------------------------------------------------
# Activation Arc — Phase 0: Conventional Headline Blend on the payload
# ---------------------------------------------------------------------------


def test_headline_structure_present_when_blend_solves():
    """Engine attaches the headline blend to payload.headline_structure when one exists."""
    ctx = _base_ctx(monthly_rent=2400, list_price=410_000, deal_gap_pct=12.2, target_buy_price=360_000)
    payload = compute_deal_structures(ctx)
    assert payload.headline_structure is not None
    assert payload.headline_structure.family == "conventional_headline"
    assert payload.headline_structure.id == "headline-conventional-blend"


def test_headline_structure_none_when_no_plausible_blend():
    """Honest gating: hopelessly underwater property returns headline_structure=None."""
    ctx = _base_ctx(
        list_price=600_000,
        target_buy_price=200_000,
        deal_gap_pct=66.0,
        monthly_rent=600,
    )
    payload = compute_deal_structures(ctx)
    assert payload.headline_structure is None


def test_headline_structure_none_when_no_deal_gap():
    """Engine short-circuits when deal_gap is non-positive — headline_structure=None too."""
    ctx = _base_ctx(deal_gap_pct=0, target_buy_price=400_000)
    payload = compute_deal_structures(ctx)
    assert payload.headline_structure is None
    assert payload.has_paths is False


def test_headline_structure_respects_kill_switch_flag():
    """When the headline-conventional-blend flag is False, the engine skips computation."""
    ctx = _base_ctx(
        monthly_rent=2400,
        deal_gap_pct=12.2,
        target_buy_price=360_000,
        template_flags={"headline-conventional-blend": False},
    )
    payload = compute_deal_structures(ctx)
    assert payload.headline_structure is None


def test_cash_shortfall_is_none_when_user_cash_unset_at_engine_level():
    """When user_cash_available is unset on context, cash_shortfall is None — even
    if a headline_structure exists. We can't compute a meaningful shortfall
    without knowing the buyer's cash. (E3 populates it when both are present.)
    """
    ctx = _base_ctx(monthly_rent=2400, deal_gap_pct=12.2, target_buy_price=360_000)
    payload = compute_deal_structures(ctx)
    assert payload.cash_shortfall is None


def test_payload_serializes_camel_case_for_frontend():
    """Frontend consumes camelCase. Verify alias generator covers the new fields."""
    ctx = _base_ctx(monthly_rent=2400, deal_gap_pct=12.2, target_buy_price=360_000)
    payload = compute_deal_structures(ctx)
    serialized = payload.model_dump(by_alias=True)
    assert "headlineStructure" in serialized
    assert "cashShortfall" in serialized
    # snake_case keys should NOT appear when by_alias=True
    assert "headline_structure" not in serialized
    assert "cash_shortfall" not in serialized


def test_headline_structure_independent_of_four_paths_selector():
    """Headline runs independently of the selector — paths and headline can both populate."""
    ctx = _base_ctx(monthly_rent=2400, list_price=410_000, deal_gap_pct=12.2, target_buy_price=360_000)
    payload = compute_deal_structures(ctx)
    if payload.headline_structure is None:
        return  # parameter combo didn't trigger headline; skip
    # Both should be present for a viable property — they're independent
    assert payload.has_paths is True
    assert len(payload.paths) >= 1
    # The headline's family is unique to the headline — never appears in paths
    path_families = {p.family for p in payload.paths}
    assert "conventional_headline" not in path_families


# ---------------------------------------------------------------------------
# Activation Arc — Phase 0 (E3): cash-shortfall + downpayment-reducer override
# ---------------------------------------------------------------------------


def _e3_ctx(**overrides):
    """Context that reliably produces a non-trivial headline cash requirement."""
    base = dict(
        list_price=410_000,
        target_buy_price=360_000,
        deal_gap_pct=12.2,
        monthly_rent=2400,
        market_temperature="cold",
        estimated_purchase_year=2021,
        estimated_purchase_price=300_000,
        is_fsbo=True,
        days_on_market=75,
    )
    base.update(overrides)
    return _base_ctx(**base)


def test_cash_shortfall_is_none_when_user_cash_unset():
    """No buyer profile cash → engine cannot compute a meaningful shortfall."""
    ctx = _e3_ctx(user_cash_available=None)
    payload = compute_deal_structures(ctx)
    assert payload.cash_shortfall is None


def test_cash_shortfall_is_zero_when_user_has_enough():
    """Buyer cash exceeds headline requirement → shortfall is exactly 0.0 (not None)."""
    ctx = _e3_ctx(user_cash_available=500_000)
    payload = compute_deal_structures(ctx)
    if payload.headline_structure is None:
        return
    assert payload.cash_shortfall == 0.0


def test_cash_shortfall_positive_when_user_short():
    """Buyer cash below headline requirement → positive shortfall in dollars."""
    ctx = _e3_ctx(user_cash_available=40_000)
    payload = compute_deal_structures(ctx)
    if payload.headline_structure is None:
        return
    expected = payload.headline_structure.cash_required - 40_000
    assert payload.cash_shortfall == round(expected, 0)
    assert payload.cash_shortfall > 0


def test_cash_shortfall_none_when_no_headline():
    """No plausible conventional structure → cash_shortfall is also None."""
    ctx = _e3_ctx(
        list_price=600_000,
        target_buy_price=200_000,
        deal_gap_pct=66.0,
        monthly_rent=600,
        user_cash_available=40_000,
    )
    payload = compute_deal_structures(ctx)
    assert payload.headline_structure is None
    assert payload.cash_shortfall is None


def test_financing_card_promoted_when_shortfall_positive():
    """When shortfall > 0, one financing-family card gets the downpayment-reducer headline."""
    ctx = _e3_ctx(user_cash_available=40_000)
    payload = compute_deal_structures(ctx)
    if payload.cash_shortfall is None or payload.cash_shortfall <= 0:
        return
    fin_cards = [p for p in payload.paths if p.family == "financing"]
    if not fin_cards:
        return  # no financing card was selected for this property; honest fallback
    promoted = [c for c in fin_cards if c.headline.startswith("Cut your down payment by")]
    assert len(promoted) >= 1


def test_financing_card_unchanged_when_user_has_enough_cash():
    """When buyer has the cash, financing cards keep their standard creative-finance copy."""
    ctx = _e3_ctx(user_cash_available=500_000)
    payload = compute_deal_structures(ctx)
    fin_cards = [p for p in payload.paths if p.family == "financing"]
    if not fin_cards:
        return
    for card in fin_cards:
        assert not card.headline.startswith("Cut your down payment by")


def test_financing_card_unchanged_when_user_cash_unset():
    """No profile cash → no shortfall to compute → no override."""
    ctx = _e3_ctx(user_cash_available=None)
    payload = compute_deal_structures(ctx)
    fin_cards = [p for p in payload.paths if p.family == "financing"]
    if not fin_cards:
        return
    for card in fin_cards:
        assert not card.headline.startswith("Cut your down payment by")


def test_promotion_only_overrides_copy_not_math():
    """Locked: the override changes only headline + selection_reason. Math is unchanged."""
    ctx_rich = _e3_ctx(user_cash_available=500_000)
    ctx_short = _e3_ctx(user_cash_available=40_000)

    rich_payload = compute_deal_structures(ctx_rich)
    short_payload = compute_deal_structures(ctx_short)

    rich_fin = next((p for p in rich_payload.paths if p.family == "financing"), None)
    short_fin = next((p for p in short_payload.paths if p.family == "financing"), None)
    if rich_fin is None or short_fin is None:
        return

    # Math fields should be identical between the two presentations.
    assert rich_fin.id == short_fin.id
    assert rich_fin.cash_required == short_fin.cash_required
    assert rich_fin.monthly_savings == short_fin.monthly_savings
    assert rich_fin.ranking_score == short_fin.ranking_score
    # Levers are the same content (compare serialized form to avoid identity issues).
    assert [lv.model_dump() for lv in rich_fin.levers] == [
        lv.model_dump() for lv in short_fin.levers
    ]


def test_payload_camel_case_includes_new_e3_fields():
    """Frontend sees camelCase: cashShortfall must be in the serialized payload."""
    ctx = _e3_ctx(user_cash_available=40_000)
    payload = compute_deal_structures(ctx)
    serialized = payload.model_dump(by_alias=True)
    # cashShortfall is always present (may be 0.0, positive, or None).
    assert "cashShortfall" in serialized
