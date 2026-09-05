"""Negotiability ratings and the blend recommendation — reasons only from present signals."""

from __future__ import annotations

from app.schemas.deal_structures import BreakevenFact, DealStructure
from app.services.deal_structures import negotiability as neg
from app.services.deal_structures.engine import compute_deal_structures

from tests._deal_structures_helpers import base_ctx


def _structure(family: str, fact: BreakevenFact | None = None) -> DealStructure:
    return DealStructure(
        id=f"test-{family}",
        family=family,  # type: ignore[arg-type]
        family_label=family,
        realism_label="",
        headline="",
        summary="",
        breakeven=fact,
    )


def test_price_uses_deal_opportunity_score_when_present():
    high = neg.assess(base_ctx(deal_opportunity_score=82), _structure("price"))
    low = neg.assess(base_ctx(deal_opportunity_score=18, deal_gap_pct=33.0), _structure("price"))
    assert high is not None and high.rating == "high" and high.score == 82
    assert low is not None and low.rating == "low"
    assert any("33% cut" in r for r in low.reasons)


def test_price_falls_back_to_gap_depth_without_score():
    shallow = neg.assess(base_ctx(deal_gap_pct=4.0, deal_opportunity_score=None), _structure("price"))
    deep = neg.assess(base_ctx(deal_gap_pct=28.0, deal_opportunity_score=None), _structure("price"))
    assert shallow is not None and shallow.rating == "high"
    assert deep is not None and deep.rating == "low"


def test_reasons_only_mention_present_signals():
    quiet = base_ctx(days_on_market=10, market_temperature=None, price_reductions=0)
    reasons = neg.seller_signal_reasons(quiet)
    assert reasons == []

    loud = base_ctx(days_on_market=94, price_reductions=3, is_absentee_owner=True, market_temperature="cold")
    reasons = neg.seller_signal_reasons(loud)
    joined = " | ".join(reasons)
    assert "3 price cuts" in joined
    assert "94 days on market" in joined
    assert "Absentee owner" in joined
    assert "Buyer's market" in joined
    assert "Foreclosure" not in joined and "FSBO" not in joined.upper()


def test_financing_is_low_for_reo_and_capped_when_it_cannot_close_alone():
    reo = neg.assess(base_ctx(is_bank_owned=True), _structure("financing"))
    assert reo is not None and reo.rating == "low"
    assert any("carry paper" in r for r in reo.reasons)

    partial = BreakevenFact(
        change_pct=20.0,
        change_amount=80_000,
        result_amount=80_000,
        result_label="Seller financing",
        closes_gap_alone=False,
        terms_note="0% interest, 5-yr balloon; price to $360,000",
    )
    fin = neg.assess(
        base_ctx(is_fsbo=True, is_absentee_owner=True, days_on_market=120), _structure("financing", partial)
    )
    assert fin is not None
    assert fin.score <= 45
    assert any("does not close this gap alone" in r for r in fin.reasons)


def test_income_rating_tracks_bump_size():
    small = BreakevenFact(change_pct=3.2, change_amount=90, result_amount=2890, result_label="Target rent")
    big = BreakevenFact(change_pct=18.5, change_amount=520, result_amount=3320, result_label="Target rent")
    assert neg.assess(base_ctx(), _structure("income", small)).rating == "high"
    assert neg.assess(base_ctx(), _structure("income", big)).rating == "low"


def test_equity_is_always_your_call():
    fact = BreakevenFact(change_pct=15.0, change_amount=60_000, result_amount=140_000, result_label="Down payment")
    out = neg.assess(base_ctx(is_bank_owned=True), _structure("capital_stack", fact))
    assert out is not None and out.rating == "your_call"
    assert any("$60K" in r for r in out.reasons)


def test_unknown_family_is_not_rated():
    assert neg.assess(base_ctx(), _structure("blended")) is None


def test_blend_recommendation_reflects_distress_and_signals():
    assert neg.build_blend_recommendation(base_ctx(deal_gap_pct=4.0), []) is None

    reo = neg.build_blend_recommendation(base_ctx(is_bank_owned=True, deal_gap_pct=18.0), [])
    assert reo is not None
    assert "will not carry a note" in reo
    assert "$360K" in reo

    quiet = neg.build_blend_recommendation(base_ctx(days_on_market=10, market_temperature=None, deal_gap_pct=18.0), [])
    assert quiet is not None
    assert quiet.startswith("No distress signals")
    assert "seller-carried second" in quiet

    signalled = neg.build_blend_recommendation(base_ctx(price_reductions=2, deal_gap_pct=18.0), [])
    assert signalled is not None
    assert signalled.startswith("2 price cuts already:")


def test_engine_payload_carries_summary_and_blend_note():
    payload = compute_deal_structures(base_ctx(deal_opportunity_score=55))
    assert payload.has_paths
    assert payload.breakeven_summary is not None
    assert payload.breakeven_summary.list_price == 400_000
    assert payload.breakeven_summary.gap_amount == 40_000
    assert payload.breakeven_summary.target_buy_price == 360_000
    assert payload.breakeven_summary.income_value == 380_000
    assert payload.blend_recommendation is None  # 10% gap is a one-play ask, not a blend
    families = {p.family for p in payload.paths}
    assert {"price", "income", "financing", "capital_stack"} <= families
    for p in payload.paths:
        if p.family == "blended":
            assert p.negotiability is None
        else:
            assert p.negotiability is not None
            assert p.breakeven is not None
