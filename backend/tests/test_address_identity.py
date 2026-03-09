import pytest
from fastapi import HTTPException
from unittest.mock import AsyncMock

from app.routers import property as property_router
from app.services.cache_service import CacheService


class TestAddressIdentityNormalization:
    def test_cache_key_normalizes_spacing_and_country_suffix(self):
        key_a = CacheService.generate_key("property", "1451 NW 10 St, Boca Raton, FL 33486")
        key_b = CacheService.generate_key("property", " 1451   NW 10 St, Boca Raton, FL 33486, USA ")
        assert key_a == key_b


class TestPhotosEndpointIdentityBinding:
    @pytest.mark.asyncio
    async def test_photos_resolves_zpid_from_property_id(self, monkeypatch):
        mock_cached = AsyncMock(return_value=type("Cached", (), {"zpid": "123456"})())
        mock_photos = AsyncMock(return_value={"success": True, "photos": [{"url": "https://example.com/1.jpg"}]})

        monkeypatch.setattr(property_router.property_service, "get_cached_property", mock_cached)
        monkeypatch.setattr(property_router.property_service, "get_property_photos", mock_photos)

        result = await property_router.get_property_photos(property_id="prop_abc")

        assert result["success"] is True
        mock_cached.assert_awaited_once_with("prop_abc")
        mock_photos.assert_awaited_once_with(zpid="123456", url=None)

    @pytest.mark.asyncio
    async def test_photos_rejects_when_no_resolvable_identity(self, monkeypatch):
        mock_cached = AsyncMock(return_value=None)
        monkeypatch.setattr(property_router.property_service, "get_cached_property", mock_cached)

        with pytest.raises(HTTPException) as exc:
            await property_router.get_property_photos(property_id="prop_missing")

        assert exc.value.status_code == 400
