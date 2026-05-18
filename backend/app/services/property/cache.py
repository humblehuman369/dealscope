"""
Cache management and staleness rules for property data.

All functions in this module are pure (no side effects, no I/O) so they can be
unit-tested in isolation with 100% coverage.
"""

from datetime import UTC, datetime
from typing import Any

# Bumped when Income Value / Deal Gap economics change (must invalidate Redis payloads).
_PROPERTY_CACHE_FORMULA_VERSION = "6"


def _strip_property_cache_meta(payload: dict[str, Any]) -> dict[str, Any]:
    """Remove cache-only keys before ``PropertyResponse`` validation."""
    out = dict(payload)
    out.pop("valuation_formula_version", None)
    return out


def _should_invalidate_cache(
    cached_data: dict[str, Any] | None,
    *,
    redfin_enabled: bool = True,
    formula_version: str = _PROPERTY_CACHE_FORMULA_VERSION,
) -> tuple[bool, str | None]:
    """Pure, testable predicate: should we discard this cached property payload?

    Returns (should_invalidate, reason_str_or_None).
    All logic is side-effect free so we can achieve 100% coverage with unit tests.
    """
    if not cached_data:
        return True, "no_cache_entry"

    valuations = cached_data.get("valuations") or {}
    listing = cached_data.get("listing") or {}
    rentals_cached = cached_data.get("rentals") or {}
    rental_stats_cached = rentals_cached.get("rental_stats") or {}
    market_cached = cached_data.get("market") or {}
    details_cached = cached_data.get("details") or {}

    is_off_market_cached = listing.get("listing_status") in (
        None,
        "OFF_MARKET",
        "SOLD",
        "FOR_RENT",
        "OTHER",
    )
    has_source_value = (
        valuations.get("zestimate") is not None
        or valuations.get("current_value_avm") is not None
        or rentals_cached.get("monthly_rent_ltr") is not None
    )
    missing_iq_fields = has_source_value and (
        valuations.get("value_iq_estimate") is None and not rental_stats_cached
    )
    missing_insurance = market_cached.get("insurance_annual") is None

    ptype = str(details_cached.get("property_type") or "").lower()
    hoa_likely = any(tok in ptype for tok in ("condo", "town", "co-op", "coop", "multi", "apartment"))
    missing_hoa = hoa_likely and market_cached.get("hoa_fees_monthly") in (None, 0)

    legacy_valuation_formula = cached_data.get("valuation_formula_version") != formula_version

    zillow_absent = (
        cached_data.get("zpid") is None
        and valuations.get("zestimate") is None
        and not rental_stats_cached.get("zillow_estimate")
    )
    redfin_absent = (
        redfin_enabled
        and valuations.get("redfin_estimate") is None
        and not rental_stats_cached.get("redfin_estimate")
    )

    def _cache_age_exceeds(seconds: int) -> bool:
        fetched_raw = cached_data.get("fetched_at")
        if not fetched_raw:
            return True
        try:
            fetched_dt = (
                datetime.fromisoformat(str(fetched_raw)) if isinstance(fetched_raw, str) else fetched_raw
            )
            if fetched_dt.tzinfo is None:
                fetched_dt = fetched_dt.replace(tzinfo=UTC)
            return (datetime.now(UTC) - fetched_dt).total_seconds() > seconds
        except (ValueError, TypeError):
            return True

    zillow_stale = zillow_absent and _cache_age_exceeds(14400)
    redfin_stale = redfin_absent and _cache_age_exceeds(14400)

    stale = (
        (
            is_off_market_cached
            and valuations.get("zestimate") is None
            and valuations.get("market_price") in (None, 1)
        )
        or missing_iq_fields
        or missing_insurance
        or missing_hoa
        or zillow_stale
        or redfin_stale
        or legacy_valuation_formula
    )

    if not stale:
        return False, None

    reason = (
        "Zillow data absent > 4h"
        if zillow_stale
        else "Redfin data absent > 4h"
        if redfin_stale
        else "pre-valuation-snapshot-v5"
        if legacy_valuation_formula
        else "insurance_annual missing"
        if missing_insurance
        else "hoa_fees_monthly missing on HOA-likely property"
        if missing_hoa
        else "IQ estimate data missing"
    )
    return True, reason
