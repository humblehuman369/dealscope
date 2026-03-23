"""
Map search service — fetches listings from RentCast and AXESSO for
viewport-based and polygon-based map search.

Results are cached in Redis (or in-memory fallback) keyed by rounded
viewport bounds + filter fingerprint with a short TTL to control API costs.
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
from typing import Any

from app.core.config import settings
from app.schemas.property import MapListing, MapSearchRequest, MapSearchResponse
from app.services.api_clients import AXESSOClient, RentCastClient, create_api_clients
from app.services.cache_service import get_cache_service

logger = logging.getLogger(__name__)

MAP_CACHE_TTL = 600  # 10 minutes


def _round_coord(val: float, precision: int = 3) -> float:
    """Round a coordinate for cache key stability (~111 m at the equator)."""
    return round(val, precision)


def _build_cache_key(req: MapSearchRequest) -> str:
    """Deterministic cache key from the search parameters."""
    raw = json.dumps(
        {
            "n": _round_coord(req.north),
            "s": _round_coord(req.south),
            "e": _round_coord(req.east),
            "w": _round_coord(req.west),
            "type": req.listing_type,
            "pt": req.property_type,
            "minp": req.min_price,
            "maxp": req.max_price,
            "bed": req.bedrooms,
            "bath": req.bathrooms,
            "lim": req.limit,
            "off": req.offset,
        },
        sort_keys=True,
    )
    digest = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"mapsearch:{digest}"


def _point_in_polygon(lat: float, lng: float, polygon: list[list[float]]) -> bool:
    """Ray-casting algorithm for point-in-polygon test."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = polygon[i]
        yj, xj = polygon[j]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _haversine_distance_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Approximate distance between two lat/lng points in miles."""
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class MapSearchService:
    """Fetches and merges listings from RentCast + AXESSO for map display."""

    def __init__(self) -> None:
        self.rentcast: RentCastClient
        self.axesso: AXESSOClient
        self._initialized = False

    def _ensure_clients(self) -> None:
        if self._initialized:
            return
        rc, ax, _, _, _ = create_api_clients(
            rentcast_api_key=settings.RENTCAST_API_KEY,
            rentcast_url=settings.RENTCAST_URL,
            axesso_api_key=settings.AXESSO_API_KEY,
            axesso_url=settings.AXESSO_URL,
        )
        self.rentcast = rc
        self.axesso = ax
        self._initialized = True

    async def search(self, req: MapSearchRequest) -> MapSearchResponse:
        self._ensure_clients()
        cache = get_cache_service()

        cache_key = _build_cache_key(req)
        cached = await cache.get(cache_key)
        if cached:
            logger.info("Map search cache hit: %s", cache_key)
            return MapSearchResponse(**cached)

        center_lat = (req.north + req.south) / 2
        center_lng = (req.east + req.west) / 2

        listings: list[MapListing] = []
        seen_addresses: set[str] = set()

        if req.listing_type in ("sale", "both"):
            rc_sale = await self._fetch_rentcast(req, "sale", center_lat, center_lng)
            for item in rc_sale:
                addr_key = item.address.lower().strip()
                if addr_key not in seen_addresses:
                    seen_addresses.add(addr_key)
                    listings.append(item)

        if req.listing_type in ("rental", "both"):
            rc_rent = await self._fetch_rentcast(req, "rental", center_lat, center_lng)
            for item in rc_rent:
                addr_key = item.address.lower().strip()
                if addr_key not in seen_addresses:
                    seen_addresses.add(addr_key)
                    listings.append(item)

        if req.polygon:
            listings = [
                l for l in listings if _point_in_polygon(l.latitude, l.longitude, req.polygon)
            ]

        if req.min_price is not None:
            listings = [l for l in listings if l.price is not None and l.price >= req.min_price]
        if req.max_price is not None:
            listings = [l for l in listings if l.price is not None and l.price <= req.max_price]
        if req.bedrooms is not None:
            listings = [l for l in listings if l.bedrooms is not None and l.bedrooms >= req.bedrooms]
        if req.bathrooms is not None:
            listings = [l for l in listings if l.bathrooms is not None and l.bathrooms >= req.bathrooms]

        response = MapSearchResponse(
            listings=listings,
            total_count=len(listings),
            viewport_center=[center_lat, center_lng],
        )

        await cache.set(cache_key, response.model_dump(mode="json"), ttl_seconds=MAP_CACHE_TTL)
        return response

    async def _fetch_rentcast(
        self,
        req: MapSearchRequest,
        listing_type: str,
        center_lat: float,
        center_lng: float,
    ) -> list[MapListing]:
        try:
            if listing_type == "sale":
                resp = await self.rentcast.get_sale_listings(
                    latitude=center_lat,
                    longitude=center_lng,
                    property_type=req.property_type,
                    limit=req.limit,
                    offset=req.offset,
                )
            else:
                resp = await self.rentcast.get_rental_listings(
                    latitude=center_lat,
                    longitude=center_lng,
                    property_type=req.property_type,
                    limit=req.limit,
                    offset=req.offset,
                )

            if not resp.success or not resp.data:
                return []

            raw_listings: list[dict[str, Any]] = resp.data if isinstance(resp.data, list) else [resp.data]
            return [self._normalize_rentcast_listing(item) for item in raw_listings if self._has_coords(item)]
        except Exception:
            logger.exception("RentCast listing fetch failed")
            return []

    @staticmethod
    def _has_coords(item: dict) -> bool:
        return item.get("latitude") is not None and item.get("longitude") is not None

    @staticmethod
    def _normalize_rentcast_listing(item: dict) -> MapListing:
        addr_parts = [
            item.get("formattedAddress") or item.get("addressLine1", ""),
        ]
        city = item.get("city", "")
        state = item.get("state", "")
        zipcode = item.get("zipCode", "")
        if city:
            addr_parts.append(city)
        if state or zipcode:
            addr_parts.append(f"{state} {zipcode}".strip())
        address = ", ".join(p for p in addr_parts if p)

        return MapListing(
            id=item.get("id") or f"rc-{item.get('latitude')}-{item.get('longitude')}",
            address=address,
            latitude=item["latitude"],
            longitude=item["longitude"],
            price=item.get("price") or item.get("listPrice"),
            bedrooms=item.get("bedrooms"),
            bathrooms=item.get("bathrooms"),
            sqft=item.get("squareFootage"),
            property_type=item.get("propertyType"),
            listing_status=item.get("status"),
            photo_url=item.get("photoUrl") or item.get("imgSrc"),
            source="rentcast",
            days_on_market=item.get("daysOnMarket"),
            year_built=item.get("yearBuilt"),
        )


map_search_service = MapSearchService()
