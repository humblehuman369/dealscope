"""Zillow map-handoff zpid misses must fall back to address search."""

from unittest.mock import AsyncMock

import pytest
from app.services.property_service import property_service

pytestmark = pytest.mark.asyncio


async def test_zpid_hit_skips_address_search(monkeypatch: pytest.MonkeyPatch):
    zpid_data = {"zpid": "1", "zestimate": 400_000}
    monkeypatch.setattr(
        property_service, "_fetch_zillow_by_zpid", AsyncMock(return_value=(zpid_data, "1", 12.0))
    )
    provider = AsyncMock()
    monkeypatch.setattr(property_service, "_fetch_zillow_provider", provider)

    data, resolved, _ms = await property_service._fetch_zillow_best("1 Oak St", "1")

    assert data == zpid_data
    assert resolved == "1"
    provider.assert_not_called()


async def test_zpid_miss_falls_back_to_address_search(monkeypatch: pytest.MonkeyPatch):
    address_data = {"zpid": "99", "zestimate": 350_000}
    monkeypatch.setattr(
        property_service, "_fetch_zillow_by_zpid", AsyncMock(return_value=(None, "1", 8.0))
    )
    monkeypatch.setattr(
        property_service,
        "_fetch_zillow_provider",
        AsyncMock(return_value=(address_data, "99", 20.0)),
    )

    data, resolved, _ms = await property_service._fetch_zillow_best("1 Oak St", "1")

    assert data == address_data
    assert resolved == "99"


async def test_no_zpid_uses_address_search(monkeypatch: pytest.MonkeyPatch):
    address_data = {"zpid": "5", "zestimate": 200_000}
    by_zpid = AsyncMock()
    monkeypatch.setattr(property_service, "_fetch_zillow_by_zpid", by_zpid)
    monkeypatch.setattr(
        property_service,
        "_fetch_zillow_provider",
        AsyncMock(return_value=(address_data, "5", 15.0)),
    )

    data, resolved, _ms = await property_service._fetch_zillow_best("1 Oak St", None)

    assert data == address_data
    assert resolved == "5"
    by_zpid.assert_not_called()
