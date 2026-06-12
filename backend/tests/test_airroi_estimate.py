"""
Tests for the AirROI /calculator/estimate integration:

  1. ``AirROIClient.parse_estimate`` — field extraction across both response
     spellings AirROI has shipped, occupancy unit conversion, confidence
     tiers, and null-safety on malformed payloads.
  2. ``DataNormalizer.inject_str_estimate`` — overlays AirROI data onto the
     legacy ``*_mashvisor`` STR keys after the Mashvisor None-fill, with
     provenance ``source="airroi"`` and the med/high-confidence override of
     ``occupancy_rate`` / ``average_daily_rate``.
"""

from datetime import UTC, datetime

import pytest

from app.services.api_clients import AirROIClient, DataNormalizer
from app.services.property_service import _has_plausible_provider_str_data

# ─────────────────────────────────────────────────────────────────────────────
# parse_estimate — response parsing
# ─────────────────────────────────────────────────────────────────────────────


def _tutorial_payload(**overrides):
    """Response shape from AirROI's API tutorial docs."""
    payload = {
        "revenue": 52400,
        "average_daily_rate": 195,
        "occupancy": 0.74,
        "comparable_listings": [{"listing_id": str(i)} for i in range(12)],
        "currency": "usd",
    }
    payload.update(overrides)
    return payload


def _marketing_payload(**overrides):
    """Alternate response shape from AirROI's marketing docs."""
    payload = {
        "annual_revenue": 52800,
        "adr": 211,
        "occupancy": 0.683,
        "comparables": 24,
        "confidence": "high",
    }
    payload.update(overrides)
    return payload


def test_parse_estimate_tutorial_shape():
    result = AirROIClient.parse_estimate(_tutorial_payload())
    assert result["str_adr"] == 195
    assert result["str_occupancy_pct"] == 74.0
    assert result["str_revenue_annual"] == 52400
    assert result["str_monthly_revenue"] == round(52400 / 12)
    assert result["str_sample_size"] == 12
    # 12 comps, no explicit confidence → medium tier
    assert result["str_confidence"] == "medium"


def test_parse_estimate_marketing_shape():
    result = AirROIClient.parse_estimate(_marketing_payload())
    assert result["str_adr"] == 211
    assert result["str_occupancy_pct"] == pytest.approx(68.3)
    assert result["str_revenue_annual"] == 52800
    assert result["str_sample_size"] == 24
    # Explicit provider confidence wins over the sample-size tier
    assert result["str_confidence"] == "high"


def test_parse_estimate_normalizes_stray_percent_occupancy():
    result = AirROIClient.parse_estimate(_tutorial_payload(occupancy=74))
    assert result["str_occupancy_pct"] == 74.0


def test_parse_estimate_confidence_tiers_from_comps():
    high = AirROIClient.parse_estimate(
        _tutorial_payload(comparable_listings=[{}] * 30)
    )
    medium = AirROIClient.parse_estimate(
        _tutorial_payload(comparable_listings=[{}] * 10)
    )
    low = AirROIClient.parse_estimate(
        _tutorial_payload(comparable_listings=[{}] * 3)
    )
    assert high["str_confidence"] == "high"
    assert medium["str_confidence"] == "medium"
    assert low["str_confidence"] == "low"


def test_parse_estimate_handles_malformed_payloads():
    for bad in (None, [], "x", 42, {}, {"status": "error"}):
        assert AirROIClient.parse_estimate(bad) == {}


def test_parse_estimate_partial_payload_keeps_available_fields():
    result = AirROIClient.parse_estimate({"average_daily_rate": 180})
    assert result["str_adr"] == 180
    assert result["str_occupancy_pct"] is None
    assert result["str_revenue_annual"] is None
    assert result["str_monthly_revenue"] is None
    assert result["str_confidence"] == "low"


def test_parse_estimate_preserves_zero_revenue():
    """A legitimate 0 revenue must stay 0 — annual and monthly must agree
    (data-consistency rule: never let 0 fall through truthiness checks)."""
    result = AirROIClient.parse_estimate(
        _tutorial_payload(revenue=0, average_daily_rate=0, occupancy=0)
    )
    assert result["str_revenue_annual"] == 0
    assert result["str_monthly_revenue"] == 0
    assert result["str_adr"] == 0
    assert result["str_occupancy_pct"] == 0


def test_parse_estimate_zero_primary_field_does_not_fall_through():
    """`revenue: 0` must not fall through to `annual_revenue`."""
    result = AirROIClient.parse_estimate(
        {"revenue": 0, "annual_revenue": 99999, "average_daily_rate": 0, "adr": 500}
    )
    assert result["str_revenue_annual"] == 0
    assert result["str_adr"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# inject_str_estimate — overlay onto normalized output
# ─────────────────────────────────────────────────────────────────────────────


def _normalize_then_inject(parsed, *, axesso_data=None):
    """Run the production sequence: normalize (Mashvisor None-fill included)
    then inject the AirROI estimate."""
    normalizer = DataNormalizer()
    timestamp = datetime.now(UTC)
    normalized, provenance = normalizer.normalize(
        rentcast_data=None,
        axesso_data=axesso_data,
        timestamp=timestamp,
    )
    normalizer.inject_str_estimate(normalized, provenance, parsed, timestamp)
    return normalized, provenance


def test_inject_overlays_legacy_str_keys_with_airroi_source():
    parsed = AirROIClient.parse_estimate(_marketing_payload())
    normalized, provenance = _normalize_then_inject(parsed)

    assert normalized["str_adr_mashvisor"] == 211
    assert normalized["str_occupancy_mashvisor"] == pytest.approx(68.3)
    assert normalized["str_revenue_annual"] == 52800
    assert normalized["str_monthly_revenue_mashvisor"] == round(52800 / 12)
    assert normalized["str_sample_size"] == 24
    assert normalized["str_confidence"] == "high"
    assert provenance["str_adr_mashvisor"]["source"] == "airroi"
    assert provenance["str_monthly_revenue_mashvisor"]["source"] == "airroi"


def test_inject_overrides_adr_and_occupancy_on_high_confidence():
    parsed = AirROIClient.parse_estimate(_marketing_payload())
    normalized, provenance = _normalize_then_inject(parsed)

    assert normalized["occupancy_rate"] == pytest.approx(0.683)
    assert normalized["average_daily_rate"] == 211
    assert provenance["occupancy_rate"]["source"] == "airroi"
    assert provenance["average_daily_rate"]["source"] == "airroi"


def test_inject_does_not_override_adr_on_low_confidence():
    axesso_data = {"occupancyRate": 0.7, "averageDailyRate": 200}
    parsed = AirROIClient.parse_estimate(
        _tutorial_payload(comparable_listings=[{}] * 3)  # → low confidence
    )
    normalized, _ = _normalize_then_inject(parsed, axesso_data=axesso_data)

    # AXESSO values survive a low-confidence estimate
    assert normalized["occupancy_rate"] == 0.7
    assert normalized["average_daily_rate"] == 200
    # ...but the STR market-stat keys are still populated
    assert normalized["str_adr_mashvisor"] == 195


def test_inject_noop_when_no_estimate_data():
    normalized, provenance = _normalize_then_inject(None)
    # Mashvisor None-fill remains untouched
    assert normalized["str_adr_mashvisor"] is None
    assert normalized["str_monthly_revenue_mashvisor"] is None
    assert provenance["str_adr_mashvisor"]["source"] == "missing"


def test_inject_never_touches_ltr_rent_blend():
    parsed = AirROIClient.parse_estimate(_marketing_payload())
    normalized, _ = _normalize_then_inject(parsed)
    # The retired Mashvisor traditional-rent estimate stays None — AirROI is
    # STR-only and must not leak into the IQ rent blend.
    assert normalized["rental_mashvisor_estimate"] is None
    assert normalized["rental_iq_estimate"] is None


# ─────────────────────────────────────────────────────────────────────────────
# _has_plausible_provider_str_data — provider-first cost skip
# ─────────────────────────────────────────────────────────────────────────────


def test_provider_str_data_skips_when_plausible():
    assert _has_plausible_provider_str_data({"average_daily_rate": 250, "occupancy_rate": 0.7})
    # Percent-convention occupancy is also accepted
    assert _has_plausible_provider_str_data({"average_daily_rate": 250, "occupancy_rate": 75})


def test_provider_str_data_requires_both_fields():
    assert not _has_plausible_provider_str_data({"average_daily_rate": 250})
    assert not _has_plausible_provider_str_data({"occupancy_rate": 0.7})
    assert not _has_plausible_provider_str_data({})


def test_provider_str_data_rejects_implausible_values():
    # A monthly figure in the nightly-rate field must not suppress AirROI
    assert not _has_plausible_provider_str_data(
        {"average_daily_rate": 2800, "occupancy_rate": 0.7}
    )
    assert not _has_plausible_provider_str_data({"average_daily_rate": 5, "occupancy_rate": 0.7})
    assert not _has_plausible_provider_str_data(
        {"average_daily_rate": 250, "occupancy_rate": 0}
    )
    assert not _has_plausible_provider_str_data(
        {"average_daily_rate": 250, "occupancy_rate": 150}
    )
    assert not _has_plausible_provider_str_data(
        {"average_daily_rate": "250", "occupancy_rate": 0.7}
    )
    assert not _has_plausible_provider_str_data(
        {"average_daily_rate": True, "occupancy_rate": 0.7}
    )
