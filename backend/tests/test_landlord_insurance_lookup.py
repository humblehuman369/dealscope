"""
Tests for county-based landlord insurance lookup (ACS dataset + state calibration).
"""

import pytest

from app.services import insurance_lookup
from app.services.property_service import PropertyService


def test_palm_beach_florida_matches_workbook_proforma() -> None:
    """Proforma_Calculator: $500k Palm Beach FL, calibrated 2026 ≈ $8,447 (±$5)."""
    v = insurance_lookup.estimate_landlord_insurance_annual(500_000, "FL", "Palm Beach")
    assert v is not None
    assert 8_440 <= v <= 8_450


def test_palm_beach_full_state_name() -> None:
    v = insurance_lookup.estimate_landlord_insurance_annual(500_000, "Florida", "Palm Beach County")
    assert v is not None
    assert 8_440 <= v <= 8_450


def test_county_normalization_variants() -> None:
    base = insurance_lookup.estimate_landlord_insurance_annual(500_000, "FL", "Palm Beach")
    for c in (
        "Palm Beach",
        "Palm Beach County",
        "PALM BEACH COUNTY",
        "palm beach",
        "Palm  Beach  County",
    ):
        v = insurance_lookup.estimate_landlord_insurance_annual(500_000, "FL", c)
        assert v == base


def test_louisiana_orleans_parish() -> None:
    v = insurance_lookup.estimate_landlord_insurance_annual(300_000, "LA", "Orleans Parish")
    assert v is not None
    assert v == round(300_000 * 0.0104210526315789 * 2.2)  # ratio × state mult


def test_unknown_county_returns_none() -> None:
    assert (
        insurance_lookup.estimate_landlord_insurance_annual(500_000, "FL", "AtlantisFictional999")
        is None
    )


def test_state_calibration_required(monkeypatch: pytest.MonkeyPatch) -> None:
    def _no_cal(
        s: str | None,
    ) -> float | None:  # noqa: ARG001
        return None

    monkeypatch.setattr(insurance_lookup, "get_state_calibration_multiplier", _no_cal)
    assert (
        insurance_lookup.estimate_landlord_insurance_annual(500_000, "FL", "Palm Beach")
        is None
    )


def test_property_service_estimate_uses_county_path() -> None:
    svc = PropertyService()
    data = {
        "value_iq_estimate": 500_000,
        "state": "FL",
        "county": "Palm Beach",
        "zip_code": "33414",
    }
    out = svc._estimate_insurance(data)  # noqa: SLF001
    assert 8_440 <= out <= 8_450


def test_property_service_falls_back_without_county() -> None:
    svc = PropertyService()
    # 33414 → South Florida (330–334) → FL_SOUTH, insurance_rate 0.018 in MARKET_ADJUSTMENTS
    data = {
        "value_iq_estimate": 500_000,
        "zip_code": "33414",
    }
    out = svc._estimate_insurance(data)  # noqa: SLF001
    assert out == round(500_000 * 0.018, 2)
