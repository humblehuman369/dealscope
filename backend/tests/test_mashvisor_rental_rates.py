"""
Tests for the Mashvisor /rental-rates integration:

  1. ``MashvisorClient.parse_rental_rates`` — bedroom-matching, sample-size
     confidence tiering, and graceful handling of malformed responses.
  2. ``DataNormalizer._compute_iq_estimates`` rent-blend now includes the
     Mashvisor estimate (a 4th source after RentCast / Zillow / Redfin).
  3. ``DataNormalizer._inject_mashvisor_data`` correctly parses raw
     ``/rental-rates`` payloads and writes both ``rental_mashvisor_estimate``
     and ``str_monthly_revenue_mashvisor`` based on ``normalized["bedrooms"]``.
"""

from datetime import UTC, datetime

import pytest

from app.services.api_clients import DataNormalizer, MashvisorClient


# ─────────────────────────────────────────────────────────────────────────────
# parse_rental_rates — bedroom matching + confidence tiering
# ─────────────────────────────────────────────────────────────────────────────


def _rates_payload(
    *,
    zero=None,
    one=None,
    two=None,
    three=None,
    four=None,
    sample_count=50,
    detailed_counts: dict[int, int] | None = None,
) -> dict:
    """Build a Mashvisor /rental-rates response. Note the ``retnal_rates``
    misspelling — it matches the live API."""
    detailed = []
    if detailed_counts:
        for beds, count in detailed_counts.items():
            detailed.append({
                "beds": str(beds),
                "count": count,
                "min": 1000,
                "max": 5000,
                "avg": 2500,
                "median": 2500,
                "adjusted_rental_income": 2400,
            })
    return {
        "status": "success",
        "content": {
            "retnal_rates": {
                "studio_value": zero,
                "zero_room_value": zero,
                "one_room_value": one,
                "two_room_value": two,
                "three_room_value": three,
                "four_room_value": four,
            },
            "sample_count": sample_count,
            "detailed": detailed,
        },
    }


@pytest.mark.parametrize(
    "bedrooms,expected_value,expected_match",
    [
        (0, 1500, 0),
        (1, 2075, 1),
        (2, 3600, 2),
        (3, 5350, 3),
        (4, 9990, 4),
        (5, 9990, 4),  # caps at four_room_value
        (10, 9990, 4),  # still caps
    ],
)
def test_bedroom_matching_picks_correct_bucket(bedrooms, expected_value, expected_match):
    payload = _rates_payload(
        zero=1500, one=2075, two=3600, three=5350, four=9990,
        sample_count=200,
    )
    result = MashvisorClient.parse_rental_rates(payload, bedrooms)
    assert result["monthly_rate"] == expected_value
    assert result["matched_bedrooms"] == expected_match


def test_bedrooms_none_defaults_to_3br_and_floors_confidence_at_medium():
    # Even with a high sample count, the bedrooms=None default-to-3BR
    # rule should floor confidence at "medium" so callers can distinguish
    # a true 3BR match from a fallback 3BR match.
    payload = _rates_payload(
        three=5350,
        sample_count=200,
        detailed_counts={3: 200},
    )
    result = MashvisorClient.parse_rental_rates(payload, None)
    assert result["monthly_rate"] == 5350
    assert result["matched_bedrooms"] == 3
    assert result["confidence"] == "medium"  # floored


def test_confidence_tiers_match_sample_size_thresholds():
    # 30+ → high
    high = MashvisorClient.parse_rental_rates(
        _rates_payload(three=5000, detailed_counts={3: 30}),
        bedrooms=3,
    )
    assert high["confidence"] == "high"
    # 10–29 → medium
    medium = MashvisorClient.parse_rental_rates(
        _rates_payload(three=5000, detailed_counts={3: 10}),
        bedrooms=3,
    )
    assert medium["confidence"] == "medium"
    # < 10 → low
    low = MashvisorClient.parse_rental_rates(
        _rates_payload(three=5000, detailed_counts={3: 9}),
        bedrooms=3,
    )
    assert low["confidence"] == "low"


def test_missing_monthly_rate_returns_low_confidence():
    payload = _rates_payload(three=None, sample_count=200, detailed_counts={3: 200})
    result = MashvisorClient.parse_rental_rates(payload, bedrooms=3)
    assert result["monthly_rate"] is None
    assert result["confidence"] == "low"


def test_falls_back_to_top_level_sample_count_when_detailed_missing():
    # Small markets often only return a rolled-up sample_count without a
    # per-bedroom detailed[] array.
    payload = _rates_payload(three=4200, sample_count=42)
    result = MashvisorClient.parse_rental_rates(payload, bedrooms=3)
    assert result["monthly_rate"] == 4200
    assert result["sample_count"] == 42
    assert result["confidence"] == "high"


def test_handles_misspelled_rental_rates_key():
    # Mashvisor's payload spells it "retnal_rates" — ensure we tolerate
    # both spellings.
    payload = {
        "status": "success",
        "content": {
            "rental_rates": {"three_room_value": 4200},  # corrected spelling
            "detailed": [{"beds": "3", "count": 50}],
        },
    }
    result = MashvisorClient.parse_rental_rates(payload, bedrooms=3)
    assert result["monthly_rate"] == 4200
    assert result["confidence"] == "high"


def test_malformed_response_returns_safe_defaults():
    for bad in [None, {}, {"content": None}, {"content": {"retnal_rates": "oops"}}]:
        result = MashvisorClient.parse_rental_rates(bad, bedrooms=3)
        assert result["monthly_rate"] is None
        assert result["confidence"] == "low"


def test_non_numeric_value_coerces_to_none():
    payload = _rates_payload(three="not a number", sample_count=50, detailed_counts={3: 50})
    result = MashvisorClient.parse_rental_rates(payload, bedrooms=3)
    assert result["monthly_rate"] is None
    assert result["confidence"] == "low"


# ─────────────────────────────────────────────────────────────────────────────
# _compute_iq_estimates — rent blend includes Mashvisor as a 4th source
# ─────────────────────────────────────────────────────────────────────────────


def _normalize_with_rent_sources(
    *,
    rentcast=None,
    zillow=None,
    redfin=None,
    mashvisor=None,
) -> tuple[dict, dict]:
    """Run normalize() with synthetic per-source rent estimates."""
    normalizer = DataNormalizer()
    timestamp = datetime.now(UTC)

    # The simplest path: fake mashvisor_data so the rental fields land
    # in normalized via _inject_mashvisor_data. RentCast/Zillow/Redfin
    # rent fields go through different injection paths so we set them
    # directly via raw provider data.
    rentcast_data = {"rent": rentcast} if rentcast is not None else None
    axesso_data = {"rentZestimate": zillow} if zillow is not None else None
    redfin_data = {"redfin_rental_estimate": redfin} if redfin is not None else None
    mashvisor_data = {"rental_mashvisor_estimate": mashvisor} if mashvisor is not None else None

    return normalizer.normalize(
        rentcast_data=rentcast_data,
        axesso_data=axesso_data,
        timestamp=timestamp,
        redfin_data=redfin_data,
        mashvisor_data=mashvisor_data,
    )


def test_iq_rent_blend_averages_all_four_sources():
    normalized, _ = _normalize_with_rent_sources(
        rentcast=4000, zillow=4200, redfin=3800, mashvisor=4100,
    )
    # Mean of [4000, 4200, 3800, 4100] = 4025
    assert normalized["rental_iq_estimate"] == 4025


def test_iq_rent_blend_with_only_mashvisor_uses_single_source():
    normalized, _ = _normalize_with_rent_sources(mashvisor=3500)
    assert normalized["rental_iq_estimate"] == 3500


def test_iq_rent_blend_drops_outliers_when_3plus_sources_present():
    # median=4000 → ±20% band = [3200, 4800]. The 8000 outlier should drop.
    normalized, _ = _normalize_with_rent_sources(
        rentcast=4000, zillow=3900, redfin=4100, mashvisor=8000,
    )
    # Mean of [4000, 3900, 4100] = 4000
    assert normalized["rental_iq_estimate"] == 4000


def test_iq_rent_blend_returns_none_when_no_sources():
    normalized, _ = _normalize_with_rent_sources()
    assert normalized["rental_iq_estimate"] is None


# ─────────────────────────────────────────────────────────────────────────────
# _inject_mashvisor_data — bedroom-matched parsing of raw rental-rates
# ─────────────────────────────────────────────────────────────────────────────


def test_inject_mashvisor_data_parses_raw_rental_rates_with_bedrooms():
    """When mashvisor_data carries the raw /rental-rates payload, the
    injector should bedroom-match using normalized["bedrooms"]."""
    normalizer = DataNormalizer()
    timestamp = datetime.now(UTC)

    trad_raw = _rates_payload(
        zero=1500, one=2075, two=3600, three=5350, four=9990,
        sample_count=200, detailed_counts={3: 200},
    )
    airbnb_raw = _rates_payload(
        zero=2200, one=2800, two=4500, three=6800, four=12500,
        sample_count=150, detailed_counts={3: 150},
    )

    rentcast_data = {"bedrooms": 3}  # drives normalized["bedrooms"]
    mashvisor_data = {
        "_rental_rates_traditional_raw": trad_raw,
        "_rental_rates_airbnb_raw": airbnb_raw,
    }

    normalized, _ = normalizer.normalize(
        rentcast_data=rentcast_data,
        axesso_data=None,
        timestamp=timestamp,
        mashvisor_data=mashvisor_data,
    )

    assert normalized["rental_mashvisor_estimate"] == 5350
    assert normalized["rental_mashvisor_bedrooms"] == 3
    assert normalized["rental_mashvisor_confidence"] == "high"
    assert normalized["str_monthly_revenue_mashvisor"] == 6800
    assert normalized["str_monthly_revenue_bedrooms"] == 3
    assert normalized["str_monthly_revenue_confidence"] == "high"


def test_inject_mashvisor_data_caps_at_4br_for_5br_property():
    normalizer = DataNormalizer()
    timestamp = datetime.now(UTC)

    trad_raw = _rates_payload(four=9990, sample_count=50, detailed_counts={4: 50})
    rentcast_data = {"bedrooms": 5}  # 5BR caps to four_room_value
    mashvisor_data = {"_rental_rates_traditional_raw": trad_raw}

    normalized, _ = normalizer.normalize(
        rentcast_data=rentcast_data,
        axesso_data=None,
        timestamp=timestamp,
        mashvisor_data=mashvisor_data,
    )
    assert normalized["rental_mashvisor_estimate"] == 9990
    assert normalized["rental_mashvisor_bedrooms"] == 4


def test_inject_mashvisor_data_handles_missing_bedrooms():
    """When bedrooms isn't in the response, parser uses 3BR default with
    confidence floored at medium."""
    normalizer = DataNormalizer()
    timestamp = datetime.now(UTC)

    trad_raw = _rates_payload(three=5350, sample_count=200, detailed_counts={3: 200})
    mashvisor_data = {"_rental_rates_traditional_raw": trad_raw}

    normalized, _ = normalizer.normalize(
        rentcast_data=None,
        axesso_data=None,
        timestamp=timestamp,
        mashvisor_data=mashvisor_data,
    )
    assert normalized["rental_mashvisor_estimate"] == 5350
    assert normalized["rental_mashvisor_bedrooms"] == 3
    # Confidence floored at medium because bedrooms was unknown
    assert normalized["rental_mashvisor_confidence"] == "medium"
