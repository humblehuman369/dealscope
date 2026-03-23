"""
Map search service — fetches listings from RentCast and Zillow for
viewport-based and polygon-based map search.

Results are cached in Redis (or in-memory fallback) keyed by rounded
viewport bounds + filter fingerprint with a short TTL to control API costs.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
from typing import Any

from app.core.config import settings
from app.schemas.property import MapListing, MapSearchRequest, MapSearchResponse
from app.services.api_clients import RentCastClient, create_api_clients
from app.services.cache_service import get_cache_service
from app.services.zillow_client import ZillowClient, create_zillow_client

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


def _viewport_radius_miles(north: float, south: float, east: float, west: float) -> float:
    """Approximate the radius that covers the viewport, clamped to 25 miles."""
    diag = _haversine_distance_miles(south, west, north, east)
    return min(diag / 2, 25.0)


class MapSearchService:
    """Fetches and merges listings from RentCast + Zillow for map display."""

    def __init__(self) -> None:
        self.rentcast: RentCastClient
        self.zillow: ZillowClient | None = None
        self._initialized = False

    def _ensure_clients(self) -> None:
        if self._initialized:
            return
        rc, _, _, _, _ = create_api_clients(
            rentcast_api_key=settings.RENTCAST_API_KEY,
            rentcast_url=settings.RENTCAST_URL,
            axesso_api_key=settings.AXESSO_API_KEY,
            axesso_url=settings.AXESSO_URL,
        )
        self.rentcast = rc

        if settings.AXESSO_API_KEY:
            self.zillow = create_zillow_client(
                api_key=settings.AXESSO_API_KEY,
                base_url=settings.AXESSO_URL,
                fallback_api_key=getattr(settings, "AXESSO_API_KEY_SECONDARY", None),
            )

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
        radius = _viewport_radius_miles(req.north, req.south, req.east, req.west)

        listings: list[MapListing] = []
        seen_addresses: set[str] = set()

        # Fetch from all sources in parallel
        tasks: list[asyncio.Task] = []

        if req.listing_type in ("sale", "both"):
            tasks.append(asyncio.create_task(
                self._fetch_rentcast(req, "sale", center_lat, center_lng),
            ))
            if self.zillow:
                tasks.append(asyncio.create_task(
                    self._fetch_zillow(center_lat, center_lng, radius, "forSale", req),
                ))

        if req.listing_type in ("rental", "both"):
            tasks.append(asyncio.create_task(
                self._fetch_rentcast(req, "rental", center_lat, center_lng),
            ))
            if self.zillow:
                tasks.append(asyncio.create_task(
                    self._fetch_zillow(center_lat, center_lng, radius, "forRent", req),
                ))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                logger.warning("Map search source failed: %s", result)
                continue
            for item in result:
                addr_key = item.address.lower().strip()
                if addr_key and addr_key not in seen_addresses:
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

        logger.info("Map search returned %d listings (center=%.4f,%.4f radius=%.1fmi)", len(listings), center_lat, center_lng, radius)

        response = MapSearchResponse(
            listings=listings,
            total_count=len(listings),
            viewport_center=[center_lat, center_lng],
        )

        await cache.set(cache_key, response.model_dump(mode="json"), ttl_seconds=MAP_CACHE_TTL)
        return response

    # ─── RentCast ───────────────────────────────────

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
                logger.info("RentCast %s listings returned no data", listing_type)
                return []

            raw_listings: list[dict[str, Any]] = resp.data if isinstance(resp.data, list) else [resp.data]
            results = [self._normalize_rentcast_listing(item) for item in raw_listings if self._has_coords(item)]
            logger.info("RentCast %s: %d listings", listing_type, len(results))
            return results
        except Exception:
            logger.exception("RentCast %s listing fetch failed", listing_type)
            return []

    # ─── Zillow (AXESSO) ───────────────────────────

    async def _fetch_zillow(
        self,
        center_lat: float,
        center_lng: float,
        radius_miles: float,
        status: str,
        req: MapSearchRequest,
    ) -> list[MapListing]:
        if not self.zillow:
            return []
        try:
            kwargs: dict[str, Any] = {}
            if req.property_type:
                pt = req.property_type.lower()
                if "single" in pt:
                    kwargs["isSingleFamily"] = True
                elif "condo" in pt:
                    kwargs["isCondo"] = True
                elif "town" in pt:
                    kwargs["isTownhouse"] = True
                elif "multi" in pt:
                    kwargs["isMultiFamily"] = True

            resp = await self.zillow.search_by_coordinates(
                lat=center_lat,
                lng=center_lng,
                radius_miles=max(radius_miles, 0.5),
                status=status,
                **kwargs,
            )

            if not resp.success or not resp.data:
                logger.info("Zillow %s returned no data", status)
                return []

            raw_props = resp.data.get("props") or resp.data.get("searchResults") or resp.data.get("results") or []
            if isinstance(resp.data, dict) and not raw_props:
                for val in resp.data.values():
                    if isinstance(val, list) and len(val) > 0:
                        raw_props = val
                        break

            results = [self._normalize_zillow_listing(item) for item in raw_props if self._zillow_has_coords(item)]
            logger.info("Zillow %s: %d listings", status, len(results))
            return results
        except Exception:
            logger.exception("Zillow %s listing fetch failed", status)
            return []

    # ─── Normalization helpers ─────────────────────

    @staticmethod
    def _has_coords(item: dict) -> bool:
        return item.get("latitude") is not None and item.get("longitude") is not None

    @staticmethod
    def _zillow_has_coords(item: dict) -> bool:
        lat = item.get("latitude") or item.get("lat")
        lng = item.get("longitude") or item.get("lng") or item.get("long")
        return lat is not None and lng is not None

    @staticmethod
    def _normalize_rentcast_listing(item: dict) -> MapListing:
        street = item.get("addressLine1") or ""
        city = item.get("city") or ""
        state = item.get("state") or ""
        zipcode = item.get("zipCode") or ""
        formatted = item.get("formattedAddress") or ""

        if formatted and "," in formatted:
            address = formatted
        else:
            parts = [street or formatted]
            if city:
                parts.append(city)
            if state or zipcode:
                parts.append(f"{state} {zipcode}".strip())
            address = ", ".join(p for p in parts if p)

        return MapListing(
            id=item.get("id") or f"rc-{item.get('latitude')}-{item.get('longitude')}",
            address=address,
            city=city or None,
            state=state or None,
            zip_code=zipcode or None,
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

    @staticmethod
    def _normalize_zillow_listing(item: dict) -> MapListing:
        raw_address = item.get("address") or ""
        city = ""
        state = ""
        zipcode = ""

        if isinstance(raw_address, dict):
            street = raw_address.get("streetAddress") or ""
            city = raw_address.get("city") or ""
            state = raw_address.get("state") or ""
            zipcode = raw_address.get("zipcode") or raw_address.get("zip") or ""
            parts = [street]
            if city:
                parts.append(city)
            if state or zipcode:
                parts.append(f"{state} {zipcode}".strip())
            address = ", ".join(p for p in parts if p)
        elif "," in raw_address:
            address = raw_address
        else:
            street = raw_address or item.get("streetAddress") or ""
            city = item.get("city") or ""
            state = item.get("state") or ""
            zipcode = item.get("zipcode") or item.get("zip") or ""
            parts = [street]
            if city:
                parts.append(city)
            if state or zipcode:
                parts.append(f"{state} {zipcode}".strip())
            address = ", ".join(p for p in parts if p)

        lat = item.get("latitude") or item.get("lat")
        lng = item.get("longitude") or item.get("lng") or item.get("long")

        photo_url = item.get("imgSrc")
        if not photo_url and isinstance(item.get("miniCardPhotos"), list) and item["miniCardPhotos"]:
            photo_url = item["miniCardPhotos"][0].get("url")

        return MapListing(
            id=str(item.get("zpid") or item.get("id") or f"zl-{lat}-{lng}"),
            address=address,
            city=city or None,
            state=state or None,
            zip_code=zipcode or None,
            latitude=float(lat),
            longitude=float(lng),
            price=item.get("price") or item.get("listPrice") or item.get("zestimate"),
            bedrooms=item.get("bedrooms") or item.get("beds"),
            bathrooms=item.get("bathrooms") or item.get("baths"),
            sqft=item.get("livingArea") or item.get("squareFootage") or item.get("area"),
            property_type=item.get("propertyType") or item.get("homeType"),
            listing_status=item.get("homeStatus") or item.get("listingStatus"),
            photo_url=photo_url,
            source="zillow",
            days_on_market=item.get("daysOnZillow"),
            year_built=item.get("yearBuilt"),
        )


map_search_service = MapSearchService()
