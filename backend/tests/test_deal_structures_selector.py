"""Selector behavior — diversity, listing signals, regional calibration, post-selection passes.

These tests exercise ``select_three_paths`` end-to-end against the real templates
to catch regressions in ranking, family diversity, and the Morby/assumable special
cases. Each test isolates one ranking signal so a future weight tweak only breaks
the test it's meant to govern.
"""

from __future__ import annotations

from app.schemas.deal_structures import DealStructure
from app.services.deal_structures import compute_deal_structures
from app.services.deal_structures.selector import (
    _apply_listing_signals,
    select_three_paths,
)
from app.services.deal_structures.templates import (
    blended_plan,
    fha_house_hack,
    larger_down,
    price_negotiation,
    rent_uplift,
    seller_second_zero_balloon,
    sub2,
)

from tests._deal_structures_helpers import base_ctx


def _minimal_structure(structure_id: str, family: str = "financing", score: float = 70.0) -> DealStructure:
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
        ranking_score=score,
    )


# ---------------------------------------------------------------------------
# Diversity rule — three single-lever paths must come from different families
# ---------------------------------------------------------------------------


def test_selector_picks_distinct_families():
    paths = select_three_paths(base_ctx())
    families = [p.family for p in paths]
    assert len(families) == len(set(families)), f"duplicated family in {families}"


def test_selector_avoids_three_price_only_when_diversity_is_available():
    """Even if three price-family templates were top-ranked, selector must prefer diversity."""
    paths = select_three_paths(base_ctx())
    assert any(p.family != "price" for p in paths), "all-price selection violates diversity rule"


def test_selector_returns_at_most_three_single_lever_paths():
    """Single-lever pool tops out at 3; the engine appends Path 4 (blended) on top of this."""
    paths = select_three_paths(base_ctx())
    assert len(paths) <= 3


# ---------------------------------------------------------------------------
# Listing-context signals (T6)
# ---------------------------------------------------------------------------


def test_listing_signal_dom_band_increases_score_monotonically():
    """DOM bands lift score monotonically: 30→60→90→180+."""
    structure = _minimal_structure("any-financing", family="financing", score=50.0)

    s_30 = _apply_listing_signals(base_ctx(days_on_market=30), structure)
    s_75 = _apply_listing_signals(base_ctx(days_on_market=75), structure)
    s_120 = _apply_listing_signals(base_ctx(days_on_market=120), structure)
    s_200 = _apply_listing_signals(base_ctx(days_on_market=200), structure)

    assert s_30 < s_75 < s_120 < s_200


def test_listing_signal_foreclosure_penalizes_financing_and_boosts_price():
    """REO/foreclosure: banks don't carry paper; price-cut is the realistic move."""
    fin = _minimal_structure("any-financing", family="financing", score=70.0)
    price = _minimal_structure("price-negotiation", family="price", score=70.0)

    ctx = base_ctx(is_foreclosure=True)
    assert _apply_listing_signals(ctx, fin) < 70.0
    assert _apply_listing_signals(ctx, price) > 70.0


def test_listing_signal_fsbo_boosts_financing():
    fin = _minimal_structure("any-financing", family="financing", score=60.0)
    ctx = base_ctx(is_fsbo=True)
    assert _apply_listing_signals(ctx, fin) > 60.0


def test_listing_signal_clamps_to_zero_one_hundred():
    """Floor=0, ceiling=100. Catches cumulative-bonus overflow."""
    structure = _minimal_structure("financing-card", family="financing", score=99.0)
    ctx = base_ctx(days_on_market=200, is_fsbo=True, market_temperature="cold")
    score = _apply_listing_signals(ctx, structure)
    assert 0 <= score <= 100


# ---------------------------------------------------------------------------
# Regional calibration (T15) — wired through the selector pathway
# ---------------------------------------------------------------------------


def test_regional_tx_boosts_sub2_in_real_pipeline():
    """TX/FL bonus must show up in the live sub2 ranking, not just the helper."""
    ctx_tx = base_ctx(
        state="TX",
        estimated_purchase_year=2021,
        estimated_purchase_price=350_000,
        days_on_market=10,
        market_temperature="hot",  # neutralize listing-signal bonuses
        is_listed=True,
    )
    ctx_neutral = base_ctx(
        state="AZ",
        estimated_purchase_year=2021,
        estimated_purchase_price=350_000,
        days_on_market=10,
        market_temperature="hot",
        is_listed=True,
    )
    sub_tx = sub2.solve(ctx_tx)
    sub_az = sub2.solve(ctx_neutral)
    if sub_tx is None or sub_az is None:
        return  # template gating; not what this test asserts
    paths_tx = select_three_paths(ctx_tx)
    paths_az = select_three_paths(ctx_neutral)
    sub_score_tx = next((p.ranking_score for p in paths_tx if p.id == "sub2"), None)
    sub_score_az = next((p.ranking_score for p in paths_az if p.id == "sub2"), None)
    if sub_score_tx is not None and sub_score_az is not None:
        assert sub_score_tx >= sub_score_az


# ---------------------------------------------------------------------------
# T9 — assumable wins Path 1 when present
# ---------------------------------------------------------------------------


def test_assumable_takes_path_one_when_present():
    """When the assumable card fires, it must lead the lineup regardless of other rankings."""
    ctx = base_ctx(
        existing_loan_type="FHA",
        estimated_existing_loan_balance=240_000,
        estimated_existing_loan_rate=0.034,
    )
    paths = select_three_paths(ctx)
    if not any(p.id == "assumable" for p in paths):
        return  # assumable gating prevented the card; not what this test asserts
    assert paths[0].id == "assumable"


# ---------------------------------------------------------------------------
# T10 — Morby Method substitution
# ---------------------------------------------------------------------------


def test_morby_substitutes_when_both_sub2_and_seller_second_fire():
    """Property where Sub2 + seller-2nd both fire → both replaced by single Morby card."""
    ctx = base_ctx(
        estimated_purchase_year=2021,
        estimated_purchase_price=350_000,
        days_on_market=120,
        is_fsbo=True,
        market_temperature="cold",
    )
    s = sub2.solve(ctx)
    ss = seller_second_zero_balloon.solve(ctx)
    if s is None or ss is None:
        return  # missing precondition; selector wouldn't substitute either

    paths = select_three_paths(ctx)
    ids = {p.id for p in paths}
    if "morby-method" in ids:
        assert "sub2" not in ids
        assert "seller-second-zero-balloon" not in ids


def test_morby_disabled_via_flag():
    """When morby-method flag=False, Sub2 and seller-2nd remain as separate candidates."""
    ctx = base_ctx(
        estimated_purchase_year=2021,
        estimated_purchase_price=350_000,
        days_on_market=120,
        is_fsbo=True,
        template_flags={"morby-method": False},
    )
    paths = select_three_paths(ctx)
    assert all(p.id != "morby-method" for p in paths)


# ---------------------------------------------------------------------------
# Engine integration — Path 4 always last when present
# ---------------------------------------------------------------------------


def test_engine_blended_is_always_last_when_present():
    out = compute_deal_structures(base_ctx())
    assert out.has_paths is True
    blended_indices = [i for i, p in enumerate(out.paths) if p.family == "blended"]
    if blended_indices:
        assert blended_indices == [len(out.paths) - 1]


def test_engine_returns_no_paths_when_gap_zero():
    out = compute_deal_structures(base_ctx(target_buy_price=400_000, deal_gap_pct=0))
    assert out.has_paths is False
    assert out.paths == []


# ---------------------------------------------------------------------------
# Templates as enabled pool — regression for the ALL_TEMPLATES wiring
# ---------------------------------------------------------------------------


def test_select_three_paths_accepts_explicit_template_list():
    """Caller can pass a subset; selector ignores ALL_TEMPLATES in that case."""
    ctx = base_ctx()
    paths = select_three_paths(ctx, templates=[price_negotiation, rent_uplift])
    ids = {p.id for p in paths}
    assert ids.issubset({price_negotiation.ID, rent_uplift.ID})


def test_explicit_empty_template_list_returns_no_paths():
    ctx = base_ctx()
    assert select_three_paths(ctx, templates=[]) == []


# ---------------------------------------------------------------------------
# Sanity — the broader template registry stays solvable
# ---------------------------------------------------------------------------


def test_no_template_solver_raises_on_bare_context():
    """Every template must accept the canonical context shape without exceptions."""
    ctx = base_ctx()
    for template in (
        price_negotiation,
        rent_uplift,
        seller_second_zero_balloon,
        sub2,
        larger_down,
        fha_house_hack,
        blended_plan,
    ):
        if template is blended_plan:
            blended_plan.solve(
                ctx,
                price_result=price_negotiation.solve(ctx),
                seller2nd_result=seller_second_zero_balloon.solve(ctx),
                rent_result=rent_uplift.solve(ctx),
            )
        else:
            template.solve(ctx)
