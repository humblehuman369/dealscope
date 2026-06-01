"""Tests for property cache staleness rules."""

from __future__ import annotations

from app.services.property.cache import (
    _PROPERTY_CACHE_FORMULA_VERSION,
    _should_invalidate_cache,
)


def _base_good_payload() -> dict:
    """A healthy cached payload that should NOT be invalidated."""
    return {
        "valuation_formula_version": _PROPERTY_CACHE_FORMULA_VERSION,
        "zpid": "46491558",
        "fetched_at": "2099-01-01T00:00:00+00:00",
        "valuations": {"zestimate": 506900, "current_value_avm": 500000},
        "listing": {"listing_status": "FOR_SALE"},
        "rentals": {"monthly_rent_ltr": 2500, "rental_stats": {"zillow_estimate": 2500}},
        "market": {"insurance_annual": 5000, "hoa_fees_monthly": 0},
        "details": {"property_type": "Single Family"},
    }


def test_good_payload_not_invalidated() -> None:
    should, _ = _should_invalidate_cache(_base_good_payload(), redfin_enabled=False)
    assert should is False


def test_degraded_listing_is_invalidated() -> None:
    """zpid present but listing_status + zestimate missing → re-fetch."""
    payload = _base_good_payload()
    payload["listing"] = {"listing_status": None}
    payload["valuations"] = {"zestimate": None, "current_value_avm": 480000}
    should, reason = _should_invalidate_cache(payload, redfin_enabled=False)
    assert should is True
    assert "degraded listing" in (reason or "")


def test_listed_property_with_zestimate_not_degraded() -> None:
    """A property-v2-sourced entry (status + zestimate) must not loop."""
    payload = _base_good_payload()
    payload["listing"] = {"listing_status": "FOR_SALE"}
    payload["valuations"] = {"zestimate": 506900}
    should, _ = _should_invalidate_cache(payload, redfin_enabled=False)
    assert should is False
