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
    assert len(MOTIVATED_SELLER_KEYWORDS) >= 150
    assert "Motivated Seller" in MOTIVATED_SELLER_KEYWORDS
    assert "As Is" in MOTIVATED_SELLER_KEYWORDS
    assert "Cash only" in MOTIVATED_SELLER_KEYWORDS


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


@pytest.mark.asyncio
async def test_motivated_seller_mode_skips_rentcast_and_uses_keyword_fetch() -> None:
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
        patch.object(
            service,
            "_fetch_motivated_seller_listings",
            new=AsyncMock(return_value=[sample]),
        ) as motivated_fetch,
        patch.object(service, "_fetch_rentcast", new=AsyncMock()) as rentcast_fetch,
        patch.object(service, "_fetch_zillow", new=AsyncMock()) as zillow_fetch,
    ):
        response = await service.search(req)

    motivated_fetch.assert_awaited_once()
    rentcast_fetch.assert_not_awaited()
    zillow_fetch.assert_not_awaited()
    assert response.total_count == 1
    assert response.listings[0].address == "200 Oak Ave"
