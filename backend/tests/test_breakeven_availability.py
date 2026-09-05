"""A lever with no structure must say whether that is reassurance or a warning."""

from __future__ import annotations

from app.services.deal_structures.availability import diagnose_missing
from app.services.deal_structures.context import StructureContext

from tests._deal_structures_helpers import base_ctx


def _ctx(**overrides) -> StructureContext:
    fields = dict(
        list_price=459_000,
        target_buy_price=307_000,
        income_value=323_000,
        deal_gap_pct=33.0,
        monthly_rent=2_940,
        property_taxes_annual=6_000,
        insurance_annual=4_590,
    )
    fields.update(overrides)
    return base_ctx(**fields)


def test_missing_lever_reports_a_reason_for_every_family():
    out = diagnose_missing(_ctx(), present_families=set())
    assert {w.family for w in out} == {"income", "financing", "capital_stack"}
    # Price is always solvable when there is a price and a rent, so it stays quiet.
    assert all(w.family != "price" for w in out)
    assert all(w.message for w in out)


def test_present_families_are_not_diagnosed():
    out = diagnose_missing(_ctx(), present_families={"income", "financing", "capital_stack"})
    assert out == []


def test_no_rent_data_is_not_reported_as_a_failed_lever():
    out = {w.family: w for w in diagnose_missing(_ctx(monthly_rent=0), present_families=set())}
    assert out["income"].reason == "no_data"
    assert "No rent estimate" in out["income"].message
    assert out["price"].reason == "no_data"


def test_a_deal_that_already_cash_flows_reads_as_reassurance():
    """The good-news case: the rent covers the price, so the lever is unnecessary."""
    ctx = _ctx(monthly_rent=8_000)
    out = {w.family: w for w in diagnose_missing(ctx, present_families=set())}

    assert out["capital_stack"].reason == "not_needed"
    assert "Don't put more cash in" in out["capital_stack"].message
    assert out["income"].reason == "not_needed"
    assert "Don't chase a bump" in out["income"].message


def test_an_unsalvageable_deal_names_the_actual_constraint():
    """The bad-news case, which must never share copy with the good-news case."""
    ctx = _ctx(monthly_rent=600)
    out = {w.family: w for w in diagnose_missing(ctx, present_families=set())}

    assert out["income"].reason == "insufficient"
    assert "20% rent lift" in out["income"].message
    assert "short" in out["income"].message

    assert out["capital_stack"].reason == "insufficient"
    # Rent this low does not even cover taxes and insurance, so debt is not the problem.
    assert "all cash" in out["capital_stack"].message

    assert out["financing"].reason == "insufficient"
    assert "seller-carried second" in out["financing"].message


def test_equity_shortfall_distinguishes_too_much_down_from_hopeless():
    """Between the two extremes: debt is the problem, but 50% down won't fix it."""
    ctx = _ctx(monthly_rent=2_050)
    out = {w.family: w for w in diagnose_missing(ctx, present_families=set())}

    equity = out["capital_stack"]
    assert equity.reason == "insufficient"
    assert "50% down" in equity.message
    assert "all cash" not in equity.message
