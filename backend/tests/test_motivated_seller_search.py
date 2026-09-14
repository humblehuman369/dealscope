"""Tests for motivated-seller Zillow keyword map search."""

from __future__ import annotations

import json
import urllib.parse
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.data.motivated_seller_keywords import MOTIVATED_SELLER_KEYWORDS
from app.schemas.property import MapListing, MapSearchRequest
from app.services.map_search_service import (
    MapSearchService,
    _build_keyword_cache_key,
)


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


def test_zillow_keyword_url_encodes_kw_and_map_bounds() -> None:
    url = MapSearchService._zillow_keyword_url(
        north=41.5,
        south=41.4,
        east=-81.6,
        west=-81.7,
        keyword="motivated seller",
    )
    assert "searchQueryState=" in url
    query = urllib.parse.urlparse(url).query
    params = urllib.parse.parse_qs(query)
    state = json.loads(params["searchQueryState"][0])
    assert state["filterState"]["kw"]["value"] == "motivated seller"
    assert state["mapBounds"] == {
        "north": 41.5,
        "south": 41.4,
        "east": -81.6,
        "west": -81.7,
    }


def test_keyword_cache_key_is_stable() -> None:
    req = MapSearchRequest(
        north=41.5,
        south=41.4,
        east=-81.6,
        west=-81.7,
    )
    a = _build_keyword_cache_key("Motivated Seller", req)
    b = _build_keyword_cache_key("motivated seller", req)
    assert a == b
    assert a.startswith("mapsearch:kw:")


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


def _listing(**overrides: object) -> MapListing:
    base: dict[str, object] = {
        "id": "z1",
        "address": "200 Oak Ave",
        "latitude": 41.45,
        "longitude": -81.65,
        "listing_status": "Active",
        "source": "rentcast",
    }
    base.update(overrides)
    return MapListing(**base)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_motivated_mode_uses_bounds_fetch_and_local_keyword_match() -> None:
    """AXESSO ignores kw — one bounds fetch, then local remark matching."""
    service = MapSearchService()
    service._initialized = True
    service.rentcast = MagicMock()
    service.zillow = MagicMock()
    service.zillow.search_by_url = AsyncMock()
    service.mashvisor = None

    hit = _listing(motivated_keywords=["As Is"])
    miss = _listing(id="z2", address="201 Oak Ave", motivated_keywords=None)

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
        patch.object(service, "_fetch_motivated_seller_listings", new=AsyncMock()) as keyword_sweep,
        patch.object(service, "_fetch_rentcast", new=AsyncMock(return_value=[hit, miss])) as rentcast_fetch,
        patch.object(service, "_fetch_zillow", new=AsyncMock(return_value=[])) as zillow_fetch,
        patch.object(service, "_attach_zip_rent_screen", new=AsyncMock(side_effect=lambda rows: rows)),
    ):
        response = await service.search(req)

    keyword_sweep.assert_not_awaited()
    rentcast_fetch.assert_awaited()
    zillow_fetch.assert_awaited()
    service.zillow.search_by_url.assert_not_called()
    by_addr = {item.address: item for item in response.listings}
    assert set(by_addr) == {"200 Oak Ave", "201 Oak Ave"}
    assert by_addr["200 Oak Ave"].motivated_keywords == ["As Is"]
    assert by_addr["201 Oak Ave"].motivated_keywords is None
    assert response.notice is None


@pytest.mark.asyncio
async def test_motivated_mode_keeps_bounds_listings_when_no_remarks() -> None:
    """List cards with no remarks must not collapse the feature to an empty set."""
    service = MapSearchService()
    service._initialized = True
    service.rentcast = MagicMock()
    service.zillow = MagicMock()
    service.zillow.search_by_url = AsyncMock()
    service.mashvisor = None

    bare = _listing(motivated_keywords=None)
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
        patch.object(service, "_fetch_rentcast", new=AsyncMock(return_value=[bare])),
        patch.object(service, "_fetch_zillow", new=AsyncMock(return_value=[])),
        patch.object(service, "_attach_zip_rent_screen", new=AsyncMock(side_effect=lambda rows: rows)),
    ):
        response = await service.search(req)

    assert response.total_count == 1
    assert response.listings[0].address == "200 Oak Ave"
    assert response.notice is None
    service.zillow.search_by_url.assert_not_called()


def test_normalize_matches_keywords_on_listing_remarks() -> None:
    listing = MapSearchService._normalize_rentcast_listing(
        {
            "id": "rc1",
            "latitude": 41.45,
            "longitude": -81.65,
            "formattedAddress": "200 Oak Ave, Cleveland, OH 44113",
            "addressLine1": "200 Oak Ave",
            "city": "Cleveland",
            "state": "OH",
            "zipCode": "44113",
            "description": "Sold AS IS. Cash only, motivated seller.",
        }
    )
    assert "As Is" in (listing.motivated_keywords or [])
    assert "Cash only" in (listing.motivated_keywords or [])
    assert "Motivated Seller" in (listing.motivated_keywords or [])


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
