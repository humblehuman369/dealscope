"""ZIP market harvest and the rent-vs-price screen it feeds.

The map used to end at price, which is exactly what listing sites already do.
The differentiator is a rent-versus-price screen on the pin, and the reason it
is affordable is that RentCast ``/markets`` is *already* called on every
property search and then discarded into one property's response. This module
harvests those payloads into a shared long-TTL ZIP store.

The invariants worth protecting:

- ``dataByBedrooms`` is extracted. It was being dropped, which is why a 4-bed
  would otherwise be screened against a ZIP median dominated by 2-beds.
- The screen states its own precision (``bedroom`` vs ``zip``), because a
  ZIP-wide median presented as a bedroom-matched one is a quiet lie.
- Nothing is fabricated. A ZIP with no rent data returns None rather than a
  ratio applied to price.
"""

from __future__ import annotations

import pytest
from app.services.api_clients import DataNormalizer
from app.services.zip_market_service import (
    MAX_ON_DEMAND_ZIP_FETCHES,
    ZipMarketSnapshot,
    extract_snapshot,
    normalize_zip,
)

MARKETS_PAYLOAD = {
    "zipCode": "34981",
    "saleData": {
        "medianPrice": 320000,
        "dataByBedrooms": [
            {"bedrooms": 2, "medianPrice": 240000},
            {"bedrooms": 3, "medianPrice": 330000},
            {"bedrooms": 4, "medianPrice": 425000},
        ],
    },
    "rentalData": {
        "medianRent": 2100,
        "dataByBedrooms": [
            {"bedrooms": 2, "medianRent": 1750},
            {"bedrooms": 3, "medianRent": 2250},
            {"bedrooms": 4, "medianRent": 2800},
        ],
    },
}


# ─── Extraction ──────────────────────────────────────────────────────────


def test_medians_and_bedroom_buckets_are_extracted():
    snapshot = extract_snapshot("34981", MARKETS_PAYLOAD)

    assert snapshot is not None
    assert snapshot.median_sale_price == 320000
    assert snapshot.median_rent == 2100
    assert snapshot.rent_by_bedrooms == {"2": 1750.0, "3": 2250.0, "4": 2800.0}
    assert snapshot.sale_price_by_bedrooms == {"2": 240000.0, "3": 330000.0, "4": 425000.0}


def test_payload_with_no_medians_is_not_stored():
    """An empty entry is worse than a miss — it suppresses the refetch."""
    assert extract_snapshot("34981", {"saleData": {}, "rentalData": {}}) is None
    assert extract_snapshot("34981", {}) is None
    assert extract_snapshot("34981", None) is None


def test_zero_and_garbage_medians_are_rejected():
    snapshot = extract_snapshot(
        "34981",
        {"saleData": {"medianPrice": 0}, "rentalData": {"medianRent": "n/a"}},
    )

    assert snapshot is None


def test_a_partial_payload_still_harvests_what_it_has():
    snapshot = extract_snapshot("34981", {"rentalData": {"medianRent": 2100}})

    assert snapshot is not None
    assert snapshot.median_rent == 2100
    assert snapshot.median_sale_price is None


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("34981", "34981"),
        ("34981-1234", "34981"),
        (34981, "34981"),
        ("  34981  ", "34981"),
        ("3498", None),
        ("ABCDE", None),
        (None, None),
    ],
)
def test_zip_normalization(raw, expected):
    assert normalize_zip(raw) == expected


# ─── The screen states its own precision ─────────────────────────────────


def test_bedroom_match_is_preferred_and_labelled():
    snapshot = extract_snapshot("34981", MARKETS_PAYLOAD)

    rent, basis = snapshot.rent_for(4)

    assert rent == 2800.0
    assert basis == "bedroom"


def test_unmatched_bedroom_count_falls_back_to_the_zip_median_and_says_so():
    snapshot = extract_snapshot("34981", MARKETS_PAYLOAD)

    rent, basis = snapshot.rent_for(7)

    assert rent == 2100
    assert basis == "zip"


def test_missing_bedroom_count_falls_back_to_the_zip_median():
    snapshot = extract_snapshot("34981", MARKETS_PAYLOAD)

    rent, basis = snapshot.rent_for(None)

    assert rent == 2100
    assert basis == "zip"


def test_no_rent_data_yields_nothing_rather_than_a_guess():
    snapshot = ZipMarketSnapshot(zip_code="34981", median_sale_price=320000)

    assert snapshot.rent_for(3) == (None, None)


def test_on_demand_fetches_are_capped():
    """A viewport spans roughly 1-15 ZIPs; the cap bounds the pathological case."""
    assert 1 <= MAX_ON_DEMAND_ZIP_FETCHES <= 20


# ─── The normalizer no longer drops dataByBedrooms ───────────────────────


def test_normalizer_keeps_bedroom_medians():
    normalized: dict = {}
    DataNormalizer()._extract_market_statistics(normalized, MARKETS_PAYLOAD)

    assert normalized["rental_market_median_by_bedrooms"] == {"2": 1750, "3": 2250, "4": 2800}
    assert normalized["market_median_price_by_bedrooms"] == {
        "2": 240000,
        "3": 330000,
        "4": 425000,
    }


def test_normalizer_tolerates_a_payload_without_bedroom_buckets():
    normalized: dict = {}
    DataNormalizer()._extract_market_statistics(
        normalized,
        {"saleData": {"medianPrice": 320000}, "rentalData": {"medianRent": 2100}},
    )

    assert normalized["rental_market_median_by_bedrooms"] == {}
    assert normalized["market_median_price_by_bedrooms"] == {}
