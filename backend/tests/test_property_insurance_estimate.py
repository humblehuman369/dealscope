"""Tests for PropertyService._estimate_insurance (global insurance_pct × value)."""

from app.core.defaults import OPERATING
from app.services.property_service import property_service


def test_estimate_insurance_value_iq_times_pct():
    out = property_service._estimate_insurance({"value_iq_estimate": 500_000})  # noqa: SLF001
    assert out == round(500_000 * OPERATING.insurance_pct, 2)


def test_estimate_insurance_falls_back_zestimate_list_price():
    out = property_service._estimate_insurance(  # noqa: SLF001
        {"zestimate": 400_000, "list_price": 100_000},
    )
    assert out == round(400_000 * OPERATING.insurance_pct, 2)


def test_estimate_insurance_no_value_returns_none():
    assert property_service._estimate_insurance({}) is None  # noqa: SLF001
