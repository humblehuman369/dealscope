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


# ─────────────────────────────────────────────────────────────────────────────
# AirROI STR estimate staleness
# ─────────────────────────────────────────────────────────────────────────────


def test_pre_airroi_version_is_invalidated() -> None:
    """v10 (pre-AirROI) entries are caught by the formula-version check
    regardless of STR flags — the go-live invalidation path."""
    payload = _base_good_payload()
    payload["valuation_formula_version"] = "10"
    should, reason = _should_invalidate_cache(payload, redfin_enabled=False)
    assert should is True
    assert reason == "pre-valuation-snapshot-v5"


def test_str_absent_old_entry_invalidated_when_enabled() -> None:
    """Current-version entry cached while the AirROI fetch failed: retry
    after the 4h absent window (mirrors Zillow/Redfin behavior)."""
    payload = _base_good_payload()
    payload["fetched_at"] = "2020-01-01T00:00:00+00:00"  # well past 4h
    payload["rentals"]["str_market_stats"] = None
    should, reason = _should_invalidate_cache(
        payload, redfin_enabled=False, str_estimates_enabled=True
    )
    assert should is True
    assert reason == "STR estimate data absent > 4h"


def test_str_absent_fresh_entry_not_invalidated() -> None:
    """No thrash: a fresh (<4h) entry without STR data is served as-is."""
    payload = _base_good_payload()  # fetched_at 2099 → age never exceeds
    payload["rentals"]["str_market_stats"] = None
    should, _ = _should_invalidate_cache(
        payload, redfin_enabled=False, str_estimates_enabled=True
    )
    assert should is False


def test_str_absent_ignored_when_estimates_disabled() -> None:
    """With AirROI off, missing STR data must never force a re-fetch."""
    payload = _base_good_payload()
    payload["fetched_at"] = "2020-01-01T00:00:00+00:00"
    payload["rentals"]["str_market_stats"] = None
    should, _ = _should_invalidate_cache(
        payload, redfin_enabled=False, str_estimates_enabled=False
    )
    assert should is False


def test_str_present_old_entry_not_invalidated() -> None:
    """Entries that already carry STR data are stable for the full TTL."""
    payload = _base_good_payload()
    payload["fetched_at"] = "2020-01-01T00:00:00+00:00"
    payload["rentals"]["str_market_stats"] = {"median_adr": 265.97, "monthly_revenue_per_bed": 3790}
    should, _ = _should_invalidate_cache(
        payload, redfin_enabled=False, str_estimates_enabled=True
    )
    assert should is False


def test_str_provider_skip_not_invalidated() -> None:
    """str_estimate_source == 'provider' marks a deliberate cost skip
    (AXESSO supplied ADR/occupancy) — must not churn every 4h."""
    payload = _base_good_payload()
    payload["fetched_at"] = "2020-01-01T00:00:00+00:00"
    payload["rentals"]["str_market_stats"] = None
    payload["str_estimate_source"] = "provider"
    should, _ = _should_invalidate_cache(
        payload, redfin_enabled=False, str_estimates_enabled=True
    )
    assert should is False
