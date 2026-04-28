"""Golden-style tests for Three Paths engine + selector."""

import pytest

from app.core.defaults import STRUCTURE_TEMPLATE_FLAGS
from app.services.deal_structures import compute_deal_structures
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.selector import select_three_paths
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
