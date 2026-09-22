"""Zillow (AXESSO) is the priority source for property facts; RentCast fills gaps.

Decided Sept 21, 2026. Only the priority word in ``DataNormalizer.FIELD_MAPPING``
changed; the estimate sources that feed ``_compute_iq_estimates`` are untouched.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.services.api_clients import DataNormalizer

RENTCAST = {
    "propertyType": "Single Family",
    "bedrooms": 3,
    "bathrooms": 2.0,
    "squareFootage": 1800,
    "yearBuilt": 1985,
    "lastSalePrice": 250000,
    "latitude": 36.85,
    "longitude": -76.28,
}

ZILLOW = {
    "homeType": "SINGLE_FAMILY",
    "bedrooms": 4,
    "bathrooms": 2.0,
    # Under the normalizer's 15% conflict threshold on purpose; see the xfail
    # below for what happens above it.
    "livingArea": 1950,
    "yearBuilt": 1992,
    "lastSoldPrice": 265000,
    "latitude": 36.851,
    "longitude": -76.281,
}


def _normalize(rentcast: dict | None, zillow: dict | None):
    return DataNormalizer().normalize(
        rentcast_data=rentcast, axesso_data=zillow, timestamp=datetime.now(UTC)
    )


def test_zillow_wins_property_facts_when_both_providers_answer() -> None:
    normalized, provenance = _normalize(RENTCAST, ZILLOW)

    assert normalized["square_footage"] == 1950
    assert provenance["square_footage"]["source"] == "axesso"
    assert normalized["year_built"] == 1992
    assert provenance["year_built"]["source"] == "axesso"
    assert normalized["property_type"] == "SINGLE_FAMILY"
    assert provenance["property_type"]["source"] == "axesso"
    assert normalized["last_sale_price"] == 265000
    assert provenance["last_sale_price"]["source"] == "axesso"
    assert normalized["latitude"] == 36.851
    assert provenance["latitude"]["source"] == "axesso"

    # Both answers are kept for audit either way.
    assert provenance["bedrooms"]["raw_values"] == {"rentcast": 3, "axesso": 4}


@pytest.mark.xfail(
    strict=True,
    reason=(
        "Pre-existing conflict rule: numeric facts that differ by more than 15% "
        "are blended 60/40 (source 'merged'), and any one-bedroom disagreement "
        "exceeds 15%. So Zillow-first currently means 60% Zillow for beds, not "
        "Zillow. Remove this marker when the conflict rule is changed."
    ),
)
def test_zillow_wins_bedrooms_outright() -> None:
    normalized, provenance = _normalize(RENTCAST, ZILLOW)

    assert normalized["bedrooms"] == 4
    assert provenance["bedrooms"]["source"] == "axesso"


def test_rentcast_fills_a_fact_zillow_is_missing() -> None:
    zillow_without_sqft = {k: v for k, v in ZILLOW.items() if k != "livingArea"}
    normalized, provenance = _normalize(RENTCAST, zillow_without_sqft)

    assert normalized["square_footage"] == 1800
    assert provenance["square_footage"]["source"] == "rentcast"
    # Fields Zillow did answer are still Zillow's.
    assert normalized["year_built"] == 1992
    assert provenance["year_built"]["source"] == "axesso"


def test_unit_mismatched_fields_stay_rentcast_first() -> None:
    """Zillow reports these in different units and nothing converts them."""
    mapping = DataNormalizer.FIELD_MAPPING
    assert mapping["lot_size"][2] == "rentcast"
    assert mapping["value_range_low"][2] == "rentcast"
    assert mapping["value_range_high"][2] == "rentcast"


def test_estimate_sources_are_unchanged() -> None:
    """The IQ averages keep every provider; only facts moved to Zillow-first."""
    mapping = DataNormalizer.FIELD_MAPPING
    assert mapping["rentcast_avm"] == ("price", None, "rentcast")
    assert mapping["rental_rentcast_estimate"] == ("rent", None, "rentcast")
    assert mapping["monthly_rent_ltr"] == ("rent", None, "rentcast")
    assert mapping["rent_range_low"] == ("rentRangeLow", None, "rentcast")
    assert mapping["rent_range_high"] == ("rentRangeHigh", None, "rentcast")
