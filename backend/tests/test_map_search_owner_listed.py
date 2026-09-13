"""Owner Listed = Zillow Owner Posted (FSBO), not the vanilla agent-listed search."""

from __future__ import annotations

import json
import urllib.parse
from unittest.mock import AsyncMock, MagicMock

import pytest
from app.schemas.property import MapSearchRequest
from app.services.map_search_service import MapSearchService, normalize_listing_status
from app.services.zillow_client import ZillowAPIResponse, ZillowEndpoint


def _req(**overrides) -> MapSearchRequest:
    base = {
        "north": 26.40,
        "south": 26.30,
        "east": -80.05,
        "west": -80.15,
        "listing_statuses": ["owner_listed"],
    }
    base.update(overrides)
    return MapSearchRequest(**base)


def _zillow_row(zpid: str, lat: float = 26.35, lng: float = -80.10) -> dict:
    return {
        "zpid": zpid,
        "latitude": lat,
        "longitude": lng,
        "address": f"{zpid} Palm Ave, Boca Raton, FL",
        "price": 450000,
        "homeStatus": "FOR_SALE",
    }


def test_owner_posted_url_turns_off_agent_listed():
    url = MapSearchService._zillow_owner_posted_url(
        north=26.4, south=26.3, east=-80.05, west=-80.15
    )
    query = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    state = json.loads(query["searchQueryState"][0])
    assert state["filterState"]["fsbo"] == {"value": True}
    assert state["filterState"]["fsba"] == {"value": False}
    assert state["filterState"]["nc"] == {"value": False}
    assert state["filterState"]["cmsn"]["value"] is False


def test_top_level_fsbo_flag_is_owner_listed():
    status = MapSearchService._derive_zillow_status(
        {"homeStatus": "FOR_SALE", "isFSBO": True}
    )
    assert normalize_listing_status(status) == "owner_listed"


def test_nested_fsbo_flag_is_owner_listed():
    status = MapSearchService._derive_zillow_status(
        {"homeStatus": "FOR_SALE", "listingSubType": {"isFSBO": True}}
    )
    assert normalize_listing_status(status) == "owner_listed"


def test_vanilla_for_sale_is_not_owner_listed():
    status = MapSearchService._derive_zillow_status({"homeStatus": "FOR_SALE"})
    assert normalize_listing_status(status) == "active"


@pytest.mark.asyncio
async def test_owner_listed_fetch_tags_zillow_owner_posted_rows():
    service = MapSearchService()
    service.zillow = MagicMock()
    service.zillow.search_by_coordinates = AsyncMock(
        return_value=ZillowAPIResponse(
            success=True,
            endpoint=ZillowEndpoint.SEARCH_BY_COORDINATES,
            data={"props": [_zillow_row("coord-1")]},
            error=None,
            status_code=200,
        )
    )
    service.zillow.search_by_url = AsyncMock(
        return_value=ZillowAPIResponse(
            success=True,
            endpoint=ZillowEndpoint.SEARCH_BY_URL,
            data={"props": [_zillow_row("url-1")]},
            error=None,
            status_code=200,
        )
    )

    rows = await service._fetch_zillow_owner_listed(26.35, -80.10, 3.0, _req())

    assert {row.id for row in rows} == {"coord-1", "url-1"}
    assert all(row.listing_status == "Owner Listed" for row in rows)
    kwargs = service.zillow.search_by_coordinates.await_args.kwargs
    assert kwargs["isForSaleByOwner"] is True
    assert kwargs["isForSaleByAgent"] is False
    assert kwargs["listing_type"] == "by_owner"
    url = service.zillow.search_by_url.await_args.args[0]
    state = json.loads(urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["searchQueryState"][0])
    assert state["filterState"]["fsbo"]["value"] is True
    assert state["filterState"]["fsba"]["value"] is False
