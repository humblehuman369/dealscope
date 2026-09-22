"""Tests for motivated-seller keyword matching and the retired map keyword pass."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.data.motivated_seller_keywords import MOTIVATED_SELLER_KEYWORDS
from app.schemas.property import MapListing, MapSearchRequest
from app.services.map_search_service import MapSearchService, _build_cache_key


def test_motivated_seller_keywords_module_importable() -> None:
    """Keywords must be importable in production (not gitignored under app/data)."""
    from app.data import motivated_seller_keywords as mod

    assert mod.MOTIVATED_SELLER_KEYWORDS
    assert len(MOTIVATED_SELLER_KEYWORDS) >= 90
    assert len(MOTIVATED_SELLER_KEYWORDS) <= 120
    assert "Motivated Seller" in MOTIVATED_SELLER_KEYWORDS
    assert "As Is" in MOTIVATED_SELLER_KEYWORDS
    assert "Cash only" in MOTIVATED_SELLER_KEYWORDS
    # Broad false-positive terms removed in curation pass
    assert "Invest" not in MOTIVATED_SELLER_KEYWORDS
    assert "Potential" not in MOTIVATED_SELLER_KEYWORDS
    assert "Fire" not in MOTIVATED_SELLER_KEYWORDS
    assert "Rental" not in MOTIVATED_SELLER_KEYWORDS


def test_merge_dedupes_same_address_from_two_keyword_queries() -> None:
    service = MapSearchService()
    bucket: dict[str, MapListing] = {}
    active = MapListing(
        id="z1",
        address="100 Main St",
        latitude=41.45,
        longitude=-81.65,
        listing_status="Active",
        source="zillow_keyword",
    )
    foreclosure = MapListing(
        id="z2",
        address="100 Main St",
        latitude=41.45,
        longitude=-81.65,
        listing_status="Foreclosure",
        source="zillow_keyword",
    )
    service._merge_listing_into(bucket, active)
    service._merge_listing_into(bucket, foreclosure)
    assert len(bucket) == 1
    assert bucket["100 main st"].listing_status == "Foreclosure"


def test_merge_accumulates_motivated_keywords() -> None:
    service = MapSearchService()
    bucket: dict[str, MapListing] = {}
    a = MapListing(
        id="z1",
        address="100 Main St",
        latitude=41.45,
        longitude=-81.65,
        listing_status="Active",
        source="zillow",
        motivated_keywords=["As Is"],
    )
    b = MapListing(
        id="z1",
        address="100 Main St",
        latitude=41.45,
        longitude=-81.65,
        listing_status="Active",
        source="zillow",
        motivated_keywords=["Investor Special"],
    )
    service._merge_listing_into(bucket, a)
    service._merge_listing_into(bucket, b)
    assert bucket["100 main st"].motivated_keywords == ["As Is", "Investor Special"]


@pytest.mark.asyncio
async def test_motivated_seller_flag_runs_the_standard_source_path() -> None:
    """``motivated_seller_search=True`` is accepted but no longer changes dispatch.

    The Axesso keyword source was found not to filter (Sept 21, 2026: three
    Norfolk VA calls with different ``kw`` values returned identical zpid sets),
    so the flag now runs RentCast + Zillow exactly like any other request
    instead of replacing them with 112 keyword scrapes.
    """
    service = MapSearchService()
    service._initialized = True
    service.rentcast = MagicMock()
    service.zillow = MagicMock()
    service.mashvisor = None

    sample = MapListing(
        id="z1",
        address="200 Oak Ave",
        latitude=41.45,
        longitude=-81.65,
        listing_status="Active",
        source="zillow",
    )

    req = MapSearchRequest(
        north=41.5,
        south=41.4,
        east=-81.6,
        west=-81.7,
        motivated_seller_search=True,
    )

    cache = AsyncMock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()

    with (
        patch("app.services.map_search_service.get_cache_service", return_value=cache),
        patch.object(service, "_fetch_rentcast", new=AsyncMock(return_value=[])) as rentcast_fetch,
        patch.object(service, "_fetch_zillow", new=AsyncMock(return_value=[sample])) as zillow_fetch,
        patch.object(service, "_attach_zip_rent_screen", new=AsyncMock(side_effect=lambda rows: rows)),
    ):
        response = await service.search(req)

    rentcast_fetch.assert_awaited_once()
    zillow_fetch.assert_awaited_once()
    assert response.total_count == 1
    assert response.listings[0].address == "200 Oak Ave"


def test_motivated_seller_flag_does_not_fragment_the_tile_cache() -> None:
    """Old clients still send the flag; they must share the tile's cache entry."""
    base = MapSearchRequest(north=41.5, south=41.4, east=-81.6, west=-81.7)
    flagged = base.model_copy(update={"motivated_seller_search": True})
    assert _build_cache_key(base) == _build_cache_key(flagged)


def test_match_motivated_seller_keywords_basic() -> None:
    from app.data.motivated_seller_keywords import match_motivated_seller_keywords

    text = "Charming fixer upper, sold AS IS. Cash only, motivated seller must sell fast!"
    matched = match_motivated_seller_keywords(text)
    # Case-insensitive, returns canonical casing
    assert "As Is" in matched
    assert "Cash only" in matched
    assert "Motivated Seller" in matched
    assert "Must Sell" in matched
    assert "Fixer Upper" in matched


def test_match_motivated_seller_keywords_empty_and_none() -> None:
    from app.data.motivated_seller_keywords import match_motivated_seller_keywords

    assert match_motivated_seller_keywords(None) == []
    assert match_motivated_seller_keywords("") == []
    assert match_motivated_seller_keywords("Beautiful move-in ready home, no issues") == []


def test_match_motivated_seller_keywords_dedupes_and_orders() -> None:
    from app.data.motivated_seller_keywords import match_motivated_seller_keywords

    text = "as is, as is, AS IS — cash only"
    matched = match_motivated_seller_keywords(text)
    assert matched.count("As Is") == 1
    # Curated order: As Is appears before Cash only in the source tuple
    assert matched.index("As Is") < matched.index("Cash only")


def test_extract_condition_keywords_delegates_to_shared_matcher() -> None:
    from app.services.calculators import extract_condition_keywords

    matched = extract_condition_keywords("Handyman Special, bring your contractor")
    assert "Handyman Special" in matched


def test_extract_price_history_computes_reductions() -> None:
    from datetime import UTC, datetime

    from app.services.api_clients import DataNormalizer

    normalizer = DataNormalizer()
    normalized: dict = {}
    axesso = {
        "priceHistory": [
            {"date": "2026-05-01", "event": "Price change", "price": 380000, "priceChangeRate": -0.05, "source": "MLS"},
            {"date": "2026-03-01", "event": "Price change", "price": 400000, "priceChangeRate": -0.0476, "source": "MLS"},
            {"date": "2026-01-01", "event": "Listed for sale", "price": 420000, "priceChangeRate": 0, "source": "MLS"},
        ]
    }
    normalizer._extract_price_history(normalized, axesso)

    assert normalized["price_reduction_count"] == 2
    assert len(normalized["price_history"]) == 3
    # Peak listed 420000 -> latest 380000 = ~9.52% total reduction
    assert normalized["total_price_reduction_pct"] == round((420000 - 380000) / 420000, 4)


def test_extract_price_history_counts_cuts_when_rate_is_zero() -> None:
    """Real AXESSO data: priceChangeRate is 0.0 even on genuine cuts, and an
    older rental cycle must not be counted as sale reductions.
    Mirrors zpid 46491558 (13587 77th Pl N)."""
    from app.services.api_clients import DataNormalizer

    normalizer = DataNormalizer()
    normalized: dict = {}
    axesso = {
        "priceHistory": [
            {"date": "2026-05-27", "event": "Price change", "price": 475000, "priceChangeRate": 0.0},
            {"date": "2026-05-02", "event": "Price change", "price": 525000, "priceChangeRate": 0.0},
            {"date": "2026-04-01", "event": "Listed for sale", "price": 574900, "priceChangeRate": 1.0},
            {"date": "2022-10-20", "event": "Listing removed", "price": None, "priceChangeRate": 0.0},
            {"date": "2022-09-30", "event": "Price change", "price": 3410, "priceChangeRate": 0.0},
            {"date": "2022-09-21", "event": "Price change", "price": 3495, "priceChangeRate": 0.0},
        ]
    }
    normalizer._extract_price_history(normalized, axesso)

    # Two cuts in the current cycle (574900 -> 525000 -> 475000); the 2022
    # rental cycle is excluded.
    assert normalized["price_reduction_count"] == 2
    assert normalized["total_price_reduction_pct"] == round((574900 - 475000) / 574900, 4)


def test_extract_ownership_absentee_flag() -> None:
    from app.services.api_clients import DataNormalizer

    normalizer = DataNormalizer()
    normalized: dict = {}
    rentcast = {
        "ownerOccupied": False,
        "owner": {
            "names": ["Jane Investor LLC"],
            "type": "Organization",
            "mailingAddress": {
                "state": "NY",
                "formattedAddress": "100 Wall St, New York, NY 10005",
            },
        },
    }
    normalizer._extract_ownership(normalized, rentcast)

    assert normalized["is_owner_occupied"] is False
    assert normalized["is_absentee_owner"] is True
    assert normalized["owner_state"] == "NY"
    assert normalized["owner_names"] == ["Jane Investor LLC"]
    assert normalized["owner_type"] == "Organization"
    assert normalized["owner_mailing_address"] == "100 Wall St, New York, NY 10005"
