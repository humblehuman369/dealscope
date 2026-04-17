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

# ─── Listing status canonicalization ─────────────────────────────────────
# Mirrors frontend/src/lib/dealSignal.ts :: STATUS_MAP. Keep in sync; if these
# drift the user-visible filter and the server-side filter will disagree.

CANONICAL_STATUSES: set[str] = {
    "active",
    "pending",
    "foreclosure",
    "pre-foreclosure",
    "auction",
}

_STATUS_MAP: dict[str, str] = {
    # Zillow homeStatus values
    "for_sale": "active",
    "for_rent": "active",
    "pending": "pending",
    "pre_foreclosure": "pre-foreclosure",
    "pre-foreclosure": "pre-foreclosure",
    "preforeclosure": "pre-foreclosure",
    # RentCast status values
    "active": "active",
    # Distressed / special
    "foreclosure": "foreclosure",
    "foreclosed": "foreclosure",
    "auction": "auction",
    "bank owned": "foreclosure",
    "bank_owned": "foreclosure",
    "bankowned": "foreclosure",
    "reo": "foreclosure",
    "short sale": "pre-foreclosure",
    "short_sale": "pre-foreclosure",
    "shortsale": "pre-foreclosure",
    # Motivation indicators
    "contingent": "pending",
    "under contract": "pending",
    "under_contract": "pending",
}


def normalize_listing_status(raw: str | None) -> str | None:
    """Map a raw provider status to a canonical status, or None if unknown."""
    if not raw:
        return None
    return _STATUS_MAP.get(raw.lower().strip())


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
            "ls": sorted(req.listing_statuses) if req.listing_statuses else None,
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
    """Approximate the radius that covers the viewport."""
    diag = _haversine_distance_miles(south, west, north, east)
    return diag / 2


def _compute_grid_points(
    north: float,
    south: float,
    east: float,
    west: float,
    grid_size: int,
) -> list[tuple[float, float]]:
    """Return a list of (lat, lng) center points for a grid_size x grid_size grid."""
    lat_step = (north - south) / grid_size
    lng_step = (east - west) / grid_size
    points: list[tuple[float, float]] = []
    for r in range(grid_size):
        lat = south + lat_step * (r + 0.5)
        for c in range(grid_size):
            lng = west + lng_step * (c + 0.5)
            points.append((lat, lng))
    return points


class MapSearchService:
    """Fetches and merges listings from RentCast + Zillow for map display."""

    def __init__(self) -> None:
        self.rentcast: RentCastClient
        self.zillow: ZillowClient | None = None
        self._initialized = False

    def _ensure_clients(self) -> None:
        if self._initialized:
            return
        rc, _, _, _, _, _ = create_api_clients(
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

        # Decide grid size based on viewport radius
        if radius > 100:
            grid_size = 3  # 9 query points for state-level views
        elif radius > 30:
            grid_size = 2  # 4 query points for metro-level views
        else:
            grid_size = 1  # single center point

        if grid_size > 1:
            query_points = _compute_grid_points(req.north, req.south, req.east, req.west, grid_size)
        else:
            query_points = [(center_lat, center_lng)]

        # Each sub-query should cover its grid cell; compute from the cell diagonal
        cell_diag = _haversine_distance_miles(
            req.south,
            req.west,
            req.south + (req.north - req.south) / grid_size,
            req.west + (req.east - req.west) / grid_size,
        )
        sub_radius = min(cell_diag / 2, 100.0) if grid_size > 1 else min(radius, 25.0)

        # Resolve which canonical statuses the caller wants. None/empty
        # preserves today's behavior (active-only). Unknown values are
        # silently dropped so the API stays forgiving for clients on older
        # builds.
        requested_statuses = {
            s for s in (req.listing_statuses or ["active"]) if s in CANONICAL_STATUSES
        } or {"active"}

        listings: list[MapListing] = []
        seen_addresses: set[str] = set()
        raw_source_totals: int = 0

        # Fetch from all sources at all grid points in parallel
        tasks: list[asyncio.Task] = []

        # Build the Zillow query extras up-front (per-request, not per-grid-point)
        # so dispatch shape stays predictable: 1 vanilla forSale + at most 1
        # distressed forSale query per grid point. This is the dispatch shape
        # that fixed the rate-limit/circuit-breaker storm caused by the previous
        # one-flag-per-query design.
        zillow_distressed_extras = self._zillow_distressed_extras(requested_statuses)

        for pt_lat, pt_lng in query_points:
            if req.listing_type in ("sale", "both"):
                # Always run RentCast for sale: its per-listing `listingType`
                # field surfaces "Foreclosure" / "Short Sale" which the
                # normalizer folds into the canonical status. Cheap insurance.
                tasks.append(
                    asyncio.create_task(
                        self._fetch_rentcast(req, "sale", pt_lat, pt_lng),
                    )
                )
                if self.zillow:
                    # Vanilla forSale query — covers Active, Pending (via
                    # homeStatus), and any distressed listings AXESSO
                    # surfaces by default. Always issued so the user always
                    # sees something even when the distressed query fails.
                    if self._wants_active_or_pending(requested_statuses):
                        tasks.append(
                            asyncio.create_task(
                                self._fetch_zillow(
                                    pt_lat, pt_lng, sub_radius, "forSale", req, None
                                ),
                            )
                        )
                    # One consolidated distressed query (if any distressed
                    # statuses requested). Uses Zillow's documented
                    # `listing_type` and `property_status` params per
                    # propertydata.dev's Zillow API reference.
                    if zillow_distressed_extras:
                        tasks.append(
                            asyncio.create_task(
                                self._fetch_zillow(
                                    pt_lat, pt_lng, sub_radius, "forSale",
                                    req, zillow_distressed_extras,
                                ),
                            )
                        )

            if req.listing_type in ("rental", "both"):
                # Distressed/pending semantics don't apply to rentals; only
                # fetch when the caller wants active inventory (or no
                # explicit status filter, which defaults to active).
                if "active" in requested_statuses:
                    tasks.append(
                        asyncio.create_task(
                            self._fetch_rentcast(req, "rental", pt_lat, pt_lng),
                        )
                    )
                    if self.zillow:
                        tasks.append(
                            asyncio.create_task(
                                self._fetch_zillow(
                                    pt_lat, pt_lng, sub_radius, "forRent", req, None
                                ),
                            )
                        )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                logger.warning("Map search source failed: %s", result)
                continue
            raw_source_totals += len(result)
            for item in result:
                addr_key = item.address.lower().strip()
                if addr_key and addr_key not in seen_addresses:
                    seen_addresses.add(addr_key)
                    listings.append(item)

        if req.polygon:
            listings = [item for item in listings if _point_in_polygon(item.latitude, item.longitude, req.polygon)]

        if req.min_price is not None:
            listings = [item for item in listings if item.price is not None and item.price >= req.min_price]
        if req.max_price is not None:
            listings = [item for item in listings if item.price is not None and item.price <= req.max_price]
        if req.bedrooms is not None:
            listings = [item for item in listings if item.bedrooms is not None and item.bedrooms >= req.bedrooms]
        if req.bathrooms is not None:
            listings = [item for item in listings if item.bathrooms is not None and item.bathrooms >= req.bathrooms]

        # Authoritative status filter — guarantees the response only
        # contains the statuses the caller asked for, regardless of how
        # generous each upstream provider was. Unrecognized statuses are
        # also dropped here.
        listings = [
            item
            for item in listings
            if normalize_listing_status(item.listing_status) in requested_statuses
        ]

        # Estimate total: if every sub-query returned its limit, there are
        # likely more listings than we fetched. Extrapolate conservatively.
        estimated_total: int | None = None
        if grid_size > 1:
            full_queries = sum(1 for r in results if not isinstance(r, Exception) and len(r) >= req.limit * 0.8)
            if full_queries > 0:
                avg_per_query = raw_source_totals / max(len([r for r in results if not isinstance(r, Exception)]), 1)
                area_multiplier = max(grid_size**2, 1)
                estimated_total = int(avg_per_query * area_multiplier * 1.5)

        logger.info(
            "Map search returned %d listings (statuses=%s, %d grid points, radius=%.1fmi, grid=%dx%d)",
            len(listings),
            sorted(requested_statuses),
            len(query_points),
            radius,
            grid_size,
            grid_size,
        )

        response = MapSearchResponse(
            listings=listings,
            total_count=len(listings),
            estimated_total=estimated_total,
            viewport_center=[center_lat, center_lng],
        )

        await cache.set(cache_key, response.model_dump(mode="json"), ttl_seconds=MAP_CACHE_TTL)
        return response

    @staticmethod
    def _wants_active_or_pending(requested_statuses: set[str]) -> bool:
        """True when the vanilla forSale Zillow query should fire.

        The vanilla query covers Active and surfaces Pending listings via
        Zillow's ``homeStatus="PENDING"`` field. If neither is requested,
        skip it to save quota.
        """
        return "active" in requested_statuses or "pending" in requested_statuses

    @staticmethod
    def _zillow_distressed_extras(requested_statuses: set[str]) -> dict[str, Any] | None:
        """Build the params dict for one consolidated distressed query.

        Uses Zillow's documented filter conventions per propertydata.dev's
        Zillow API reference (which mirrors the Zillow web UI's filter
        codes):

        - ``listing_type`` accepts comma-separated values: ``foreclosures``
          (REO/bank-owned), ``foreclosed`` (lender-owned, not yet listed),
          ``pre_foreclosures``, ``auctions``.
        - ``property_status`` accepts ``pending_and_under_contract`` for
          pending inventory.

        The previous implementation passed ``isForeclosure=true``, etc.,
        which AXESSO silently ignored — confirmed via prod logs showing
        identical 41-listing payloads with and without the flag. These
        snake_case plural names align with Zillow's underlying URL filter
        codes and the param name (``listing_type``) used by the existing
        ``ZillowClient.search_properties()`` method.

        Returns None when no distressed statuses are requested (so caller
        can skip dispatching entirely).
        """
        listing_types: list[str] = []
        if "foreclosure" in requested_statuses:
            # `foreclosures` = currently listed REO / bank-owned
            # `foreclosed` = lender-owned, may soon be listed
            listing_types.extend(["foreclosures", "foreclosed"])
        if "pre-foreclosure" in requested_statuses:
            listing_types.append("pre_foreclosures")
        if "auction" in requested_statuses:
            listing_types.append("auctions")

        extras: dict[str, Any] = {}
        if listing_types:
            extras["listing_type"] = ",".join(listing_types)
        # Pending isn't strictly distressed, but Zillow exposes it via the
        # property_status filter. Including it here folds it into the same
        # query as distressed when both are requested.
        if "pending" in requested_statuses:
            extras["property_status"] = "pending_and_under_contract"

        return extras or None

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
        extra_params: dict[str, Any] | None = None,
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

            if extra_params:
                kwargs.update(extra_params)

            resp = await self.zillow.search_by_coordinates(
                lat=center_lat,
                lng=center_lng,
                radius_miles=max(radius_miles, 0.5),
                status=status,
                **kwargs,
            )

            # Compact label so logs stay greppable when params change
            label = (
                f"{status}+{','.join(f'{k}={v}' for k, v in extra_params.items())}"
                if extra_params
                else status
            )

            if not resp.success or not resp.data:
                logger.info("Zillow %s returned no data", label)
                return []

            raw_props = resp.data.get("props") or resp.data.get("searchResults") or resp.data.get("results") or []
            if isinstance(resp.data, dict) and not raw_props:
                for val in resp.data.values():
                    if isinstance(val, list) and len(val) > 0:
                        raw_props = val
                        break

            # Diagnostic: when we fired a distressed query, log the
            # distress-bearing fields from the first listing so we can
            # verify in prod logs whether AXESSO actually honored the
            # filter. Trims response to a few keys to keep log size sane.
            if extra_params and raw_props:
                first = raw_props[0] if isinstance(raw_props[0], dict) else {}
                logger.info(
                    "Zillow %s sample fields: homeStatus=%r listingSubType=%r foreclosureTypes=%r",
                    label,
                    first.get("homeStatus"),
                    first.get("listingSubType"),
                    first.get("foreclosureTypes"),
                )

            results = [self._normalize_zillow_listing(item) for item in raw_props if self._zillow_has_coords(item)]
            logger.info("Zillow %s: %d listings", label, len(results))
            return results
        except Exception:
            logger.exception(
                "Zillow %s listing fetch failed",
                f"{status}+{extra_params}" if extra_params else status,
            )
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

        # Prefer RentCast's listingType when it surfaces distress
        # ("Foreclosure" / "Short Sale") so the canonical status filter
        # routes the listing correctly. Otherwise fall back to status
        # ("Active" / "Inactive").
        listing_type = (item.get("listingType") or "").strip()
        raw_status = item.get("status")
        if listing_type and listing_type.lower() in {"foreclosure", "short sale"}:
            raw_status = listing_type

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
            listing_status=raw_status,
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

        # Derive an effective status that includes distress signals.
        # Zillow returns homeStatus="FOR_SALE" even for foreclosure /
        # auction listings — the distinction lives in listingSubType
        # and foreclosureTypes. Without this, distressed listings would
        # canonicalize to "active" and get dropped by the status filter.
        listing_status = MapSearchService._derive_zillow_status(item)

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
            listing_status=listing_status,
            photo_url=photo_url,
            source="zillow",
            days_on_market=item.get("daysOnZillow"),
            year_built=item.get("yearBuilt"),
        )

    @staticmethod
    def _derive_zillow_status(item: dict) -> str | None:
        """Pick the most informative status label from a Zillow record.

        Distress flags win over generic homeStatus. Order matters:
        pre-foreclosure beats foreclosure beats auction beats bank-owned
        beats whatever homeStatus says — because the more specific signal
        is the one investors actually filter on.
        """
        sub = item.get("listingSubType") or {}
        fore_types = item.get("foreclosureTypes") or {}

        if fore_types.get("isPreforeclosure") or fore_types.get("isPreForeclosure"):
            return "Pre-Foreclosure"
        if (
            fore_types.get("isAnyForeclosure")
            or fore_types.get("wasForeclosed")
            or sub.get("isForeclosure")
        ):
            return "Foreclosure"
        if sub.get("isForAuction") or fore_types.get("wasNonRetailAuction"):
            return "Auction"
        if sub.get("isBankOwned") or fore_types.get("isBankOwned"):
            return "Foreclosure"

        return item.get("homeStatus") or item.get("listingStatus")


map_search_service = MapSearchService()
