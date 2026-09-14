"""Plan re-solve: structures math only — no providers, no analysis meter."""

from __future__ import annotations

import inspect

from app.routers import analytics
from app.schemas.analytics import IQVerdictInput
from app.services.iq_verdict_service import compute_deal_structures_only


def test_structures_only_skips_strategy_math(monkeypatch):
    called: list[str] = []

    def _mark(*_args, **_kwargs):
        called.append("ltr")
        raise AssertionError("strategy math must not run")

    monkeypatch.setattr(
        "app.services.iq_verdict_service._calculate_ltr_strategy",
        _mark,
    )
    monkeypatch.setattr(
        "app.services.iq_verdict_service._calculate_str_strategy",
        _mark,
    )
    result = compute_deal_structures_only(
        IQVerdictInput(list_price=625_999, monthly_rent=4_385, property_taxes=8_000, insurance=4_000)
    )
    assert called == []
    assert result is not None


def test_structures_only_source_has_no_provider_calls():
    src = inspect.getsource(compute_deal_structures_only)
    assert "search_property" not in src
    assert "RentCast" not in src
    assert "AXESSO" not in src
    assert "record_analysis" not in src


def test_structures_route_does_not_meter_or_fetch_property():
    src = inspect.getsource(analytics.recompute_deal_structures)
    assert "record_analysis" not in src
    assert "search_property" not in src
    assert "property_service" not in src
    assert "compute_deal_structures_only" in src
    assert "compute_iq_verdict" not in src
