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
import urllib.parse
from typing import Any

from app.core.config import settings
from app.schemas.property import MapListing, MapSearchRequest, MapSearchResponse
from app.services.api_clients import MashvisorClient, RentCastClient, create_api_clients
from app.services.cache_service import get_cache_service
from app.services.zillow_client import ZillowClient, create_zillow_client

logger = logging.getLogger(__name__)

MAP_CACHE_TTL = 600  # 10 minutes

# ─── Listing status canonicalization ─────────────────────────────────────
# Mirrors frontend/src/lib/dealSignal.ts :: STATUS_MAP. Keep in sync; if these
# drift the user-visible filter and the server-side filter will disagree.

CANONICAL_STATUSES: set[str] = {
    "active",
    "owner_listed",
    "foreclosure",
    "pre-foreclosure",
    "auction",
}

# Foreclosure / auction / pre-FC map inventory: Zillow (AXESSO) only when the user
# asks exclusively for these buckets—RentCast labels and staleness are skipped.
DISTRESSED_ONLY_STATUSES: frozenset[str] = frozenset(
    {"foreclosure", "pre-foreclosure", "auction"},
)


def _skip_rentcast_sale_use_zillow_only_distressed(
    requested_statuses: set[str],
    zillow_available: bool,
) -> bool:
    """Omit RentCast sale merge when filters are distressed-only and Zillow is configured."""
    if not zillow_available:
        return False
    return bool(requested_statuses) and requested_statuses <= DISTRESSED_ONLY_STATUSES


_STATUS_MAP: dict[str, str] = {
    # Zillow homeStatus values
    "for_sale": "active",
    "for_rent": "active",
    "pre_foreclosure": "pre-foreclosure",
    "pre-foreclosure": "pre-foreclosure",
    "preforeclosure": "pre-foreclosure",
    # RentCast status values
    "active": "active",
    "inactive": "off-market",
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
    # Owner-listed (FSBO). Raw provider strings are uncommon since Zillow
    # surfaces FSBO via listingSubType.isFSBO (handled in
    # _derive_zillow_status, which emits "Owner Listed"); these defensive
    # mappings cover any provider that uses a string value.
    "owner listed": "owner_listed",
    "owner_listed": "owner_listed",
    "for sale by owner": "owner_listed",
    "for_sale_by_owner": "owner_listed",
    "fsbo": "owner_listed",
    "by owner": "owner_listed",
    "by_owner": "owner_listed",
}


def normalize_listing_status(raw: str | None) -> str | None:
    """Map a raw provider status to a canonical status, or None if unknown."""
    if not raw:
        return None
    return _STATUS_MAP.get(raw.lower().strip())


# ─── Cross-source dedup priority ─────────────────────────────────────────
# Mirrors frontend/src/lib/dealSignal.ts :: listingMergePriority. When the
# same property address surfaces in multiple upstream queries (e.g.,
# RentCast generic sale + Zillow `auc`/`fore`/`pre` URL search), we keep
# the row that carries the strongest investor signal so the distress
# label survives the merge. Without this the generic for-sale row almost
# always wins the race (it's the first task submitted) and any
# foreclosure / pre-foreclosure / auction tag from the dedicated
# distressed query is silently dropped — the user-visible symptom is
# distressed pins flickering in on the first fetch and being replaced by
# Active pins on the next viewport refresh.

_LISTING_STATUS_PRIORITY: dict[str, int] = {
    "foreclosure": 100,
    "pre-foreclosure": 100,
    "auction": 100,
    "owner_listed": 80,
    "active": 40,
    "off-market": 10,
    "sold": 10,
}


def _listing_status_priority(raw_status: str | None) -> int:
    """Return the dedup priority for a listing's raw status string."""
    canonical = normalize_listing_status(raw_status)
    if canonical is None:
        # Unrecognized but non-empty raw status — slight preference over a
        # row with no status at all, but still below "active".
        return 20 if raw_status else 0
    return _LISTING_STATUS_PRIORITY.get(canonical, 20)


# Display fields that we never want to drop just because the higher-priority
# row happens to be sparser. If the winner is missing one of these and the
# loser has it, copy it forward so the marker still has a photo / price / etc.
_PRESERVE_FROM_LOSER: tuple[str, ...] = (
    "photo_url",
    "price",
    "bedrooms",
    "bathrooms",
    "sqft",
    "year_built",
    "days_on_market",
    "property_type",
)


def _merge_preserving_loser_fields(winner: MapListing, loser: MapListing) -> MapListing:
    """Return ``winner`` with any missing display fields filled from ``loser``."""
    updates: dict[str, Any] = {}
    for field in _PRESERVE_FROM_LOSER:
        if getattr(winner, field) is None:
            loser_value = getattr(loser, field)
            if loser_value is not None:
                updates[field] = loser_value
    if not updates:
        return winner
    return winner.model_copy(update=updates)


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
        self.mashvisor: MashvisorClient | None = None
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

        if settings.MASHVISOR_RAPIDAPI_KEY:
            self.mashvisor = MashvisorClient(
                api_key=settings.MASHVISOR_RAPIDAPI_KEY,
                rapidapi_host=settings.MASHVISOR_RAPIDAPI_HOST,
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
        requested_statuses = {s for s in (req.listing_statuses or ["active"]) if s in CANONICAL_STATUSES} or {"active"}

        # Address-keyed dedup map. We collect rows from every upstream
        # source in parallel, then keep the row whose listing_status
        # carries the strongest investor signal (see
        # ``_listing_status_priority``). This guarantees that a property
        # tagged ``Foreclosure`` by the dedicated distressed query is not
        # masked by an ``Active`` row returned earlier from RentCast or
        # Zillow's generic ``forSale`` query — the historical bug behind
        # distressed pins disappearing after a single zoom.
        listings_by_addr: dict[str, MapListing] = {}
        raw_source_totals: int = 0

        # Fetch from all sources at all grid points in parallel
        tasks: list[asyncio.Task] = []

        if _skip_rentcast_sale_use_zillow_only_distressed(requested_statuses, bool(self.zillow)):
            logger.info(
                "Map search sale: RentCast skipped (filters are foreclosure / pre-foreclosure / auction only; using Zillow)",
            )

        # Dispatch shape, per grid point:
        # - 1 vanilla forSale query when active/owner-listed is requested.
        # - 1 typed Auction query (isAuction=true) when auction is requested.
        # - 1 typed Foreclosure query (isForSaleForeclosure=true) when
        #   foreclosure is requested.
        # - 1 URL-based query for pre-foreclosure (AXESSO has no typed
        #   isPreForeclosure param; the only way to filter pre-foreclosure
        #   exclusively is via Zillow's searchQueryState.filterState.pre).
        #
        # Zillow's "Foreclosures" search can return both REO and
        # pre-foreclosure inventory; their UI splits **Foreclosed** vs
        # **Pre-foreclosures**. We classify each row with
        # `_derive_zillow_status` (listingSubType / foreclosureTypes)—no blanket
        # foreclosure tag—so filters match that split.

        for pt_lat, pt_lng in query_points:
            if req.listing_type in ("sale", "both"):
                if not _skip_rentcast_sale_use_zillow_only_distressed(
                    requested_statuses,
                    bool(self.zillow),
                ):
                    tasks.append(
                        asyncio.create_task(
                            self._fetch_rentcast(req, "sale", pt_lat, pt_lng, sub_radius),
                        )
                    )
                if self.zillow:
                    # Vanilla forSale query — covers Active and the
                    # owner-listed (FSBO) bucket Zillow's defaults already
                    # include. Issued whenever any non-distressed status is
                    # requested so the user sees something even when the
                    # distressed query fails.
                    if requested_statuses & {"active", "owner_listed"}:
                        tasks.append(
                            asyncio.create_task(
                                self._fetch_zillow(pt_lat, pt_lng, sub_radius, "forSale", req, None),
                            )
                        )
                    # All three distressed buckets route through the URL-based
                    # AXESSO `search-by-url` path. Earlier the dispatch used
                    # AXESSO's typed `isAuction` / `isForSaleForeclosure` params
                    # for the first two, but those return 0 rows in practice
                    # (verified across Detroit, Cleveland, and South Florida).
                    # Pre-foreclosure already used the URL path; we now use the
                    # same `_zillow_distressed_url` mechanism for all three.
                    for distressed_status in ("auction", "foreclosure", "pre-foreclosure"):
                        if distressed_status in requested_statuses:
                            tasks.append(
                                asyncio.create_task(
                                    self._fetch_zillow_distressed(
                                        pt_lat,
                                        pt_lng,
                                        sub_radius,
                                        distressed_status,
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
                            self._fetch_rentcast(req, "rental", pt_lat, pt_lng, sub_radius),
                        )
                    )
                    if self.zillow:
                        tasks.append(
                            asyncio.create_task(
                                self._fetch_zillow(pt_lat, pt_lng, sub_radius, "forRent", req, None),
                            )
                        )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                logger.warning("Map search source failed: %s", result)
                continue
            raw_source_totals += len(result)
            for item in result:
                self._merge_listing_into(listings_by_addr, item)

        # Merge Mashvisor Airbnb listings when requested. Airbnb rows are
        # already a distinct inventory bucket (id-prefixed
        # ``mashvisor_airbnb_*``) so they only collide with sale/rental
        # rows when the address truly matches — in that case the sale row
        # outranks the Airbnb tag and the Airbnb is intentionally dropped.
        if req.include_str_listings and self.mashvisor:
            str_listings = await self._fetch_mashvisor_str_listings(req, center_lat, center_lng)
            for item in str_listings:
                self._merge_listing_into(listings_by_addr, item)
            raw_source_totals += len(str_listings)

        listings = list(listings_by_addr.values())

        # Defense-in-depth viewport filter. Each upstream source is told to
        # search around the viewport, but radius queries (RentCast 5–100mi
        # circles, Zillow's loose bbox) routinely spill outside the
        # caller's actual bounds. Without this clamp, the property card
        # list can be dominated by listings far from what the user is
        # looking at — most notoriously Texas listings appearing for
        # Florida viewports when RentCast's lat/lng+radius pairing is
        # mis-handled upstream.
        pre_bounds_count = len(listings)
        listings = [
            item
            for item in listings
            if req.south <= item.latitude <= req.north and req.west <= item.longitude <= req.east
        ]
        if pre_bounds_count != len(listings):
            logger.info(
                "Viewport filter dropped %d out-of-bounds listings (kept %d)",
                pre_bounds_count - len(listings),
                len(listings),
            )

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
        listings = [item for item in listings if normalize_listing_status(item.listing_status) in requested_statuses]

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
    def _merge_listing_into(bucket: dict[str, MapListing], item: MapListing) -> None:
        """Insert ``item`` into ``bucket`` keyed by lower-cased address.

        When an address already exists, keep the row with the higher
        :func:`_listing_status_priority` and copy any missing display
        fields forward from the loser. This is the cross-source dedup
        that prevents distressed labels from being lost behind generic
        for-sale rows.
        """
        addr_key = item.address.lower().strip()
        if not addr_key:
            return
        existing = bucket.get(addr_key)
        if existing is None:
            bucket[addr_key] = item
            return
        existing_pri = _listing_status_priority(existing.listing_status)
        new_pri = _listing_status_priority(item.listing_status)
        if new_pri > existing_pri:
            bucket[addr_key] = _merge_preserving_loser_fields(item, existing)
        else:
            # Same-or-lower priority: existing wins, but pick up any
            # display fields it was missing.
            bucket[addr_key] = _merge_preserving_loser_fields(existing, item)

    @staticmethod
    def _radius_to_bbox(lat: float, lng: float, radius_miles: float) -> tuple[float, float, float, float]:
        """Approximate a square (north, south, east, west) around a center.

        Used to convert the existing grid-cell radius searches into the
        ``mapBounds`` rectangle Zillow's URL-based search expects. 1° lat
        ≈ 69 mi; 1° lng shrinks toward the poles by cos(lat). Cosine is
        floored so high-latitude calls don't blow up to infinity.
        """
        delta_lat = radius_miles / 69.0
        cos_lat = max(math.cos(math.radians(lat)), 0.01)
        delta_lng = radius_miles / (69.0 * cos_lat)
        return (
            lat + delta_lat,  # north
            lat - delta_lat,  # south
            lng + delta_lng,  # east
            lng - delta_lng,  # west
        )

    @staticmethod
    def _zillow_distressed_url(
        north: float,
        south: float,
        east: float,
        west: float,
        requested_statuses: set[str],
    ) -> str | None:
        """Build a Zillow ``searchQueryState`` URL for distressed-only inventory.

        Used for pre-foreclosure searches because AXESSO's
        ``/zil/search-by-coordinates`` endpoint exposes typed booleans for
        Auction (``isAuction``) and Foreclosure-for-sale
        (``isForSaleForeclosure``) but **not** for pre-foreclosure. The
        only way to filter pre-foreclosure exclusively is via Zillow's
        native ``searchQueryState.filterState.pre`` toggle, routed through
        AXESSO's ``search-by-url`` endpoint (which scrapes the resulting
        Zillow page).

        Kept generic for ``auction``/``foreclosure``/``pre-foreclosure``
        so it can serve as a fallback if the typed-param queries ever
        regress.

        ``filterState`` mechanics:
        - ``auc``/``fore``/``pre`` toggle the distressed buckets on.
        - ``fsba`` (For-Sale By Agent) is the listing-type carrier for
          REOs (foreclosure) and most auction listings — those are agent-
          listed with a distressed sub-type. Disabling ``fsba`` while
          enabling ``fore`` or ``auc`` returns an empty set, because
          there's no listing-type bucket left to draw inventory from.
        - Pre-foreclosures are an exception: Zillow surfaces them as a
          standalone bucket (homes flagged as in default, not yet listed
          for sale). For pre-foreclosure-only queries we *can* turn off
          the ``fsba``/``fsbo``/``nc``/``cmsn`` defaults to get
          distressed-only inventory back. For any query that includes
          foreclosure or auction, we leave ``fsba`` on so REO/auction
          rows actually surface.

        Returns None when no distressed status is requested.
        """
        filter_state: dict[str, dict[str, bool]] = {}
        if "auction" in requested_statuses:
            filter_state["auc"] = {"value": True}
        if "foreclosure" in requested_statuses:
            filter_state["fore"] = {"value": True}
        if "pre-foreclosure" in requested_statuses:
            filter_state["pre"] = {"value": True}

        if not filter_state:
            return None

        # Disable for-sale defaults only when the request is pre-foreclosure
        # exclusively — that bucket is its own listing type and doesn't need
        # ``fsba``. Foreclosure/auction REOs ARE agent-listed, so leave
        # ``fsba`` on (just don't add ``fsbo``/``nc``/``cmsn`` noise).
        is_pre_only = requested_statuses == {"pre-foreclosure"}
        if is_pre_only:
            filter_state.update(
                {
                    "fsba": {"value": False},
                    "fsbo": {"value": False},
                    "nc": {"value": False},
                    "cmsn": {"value": False},
                }
            )
        else:
            filter_state.update(
                {
                    "fsbo": {"value": False},
                    "nc": {"value": False},
                    "cmsn": {"value": False},
                }
            )

        state = {
            "pagination": {},
            "isMapVisible": True,
            "mapBounds": {
                "north": round(north, 6),
                "south": round(south, 6),
                "east": round(east, 6),
                "west": round(west, 6),
            },
            "filterState": filter_state,
            "isListVisible": True,
        }
        encoded = urllib.parse.quote(json.dumps(state, separators=(",", ":")))
        return f"https://www.zillow.com/homes/for_sale/?searchQueryState={encoded}"

    # ─── RentCast ───────────────────────────────────

    async def _fetch_rentcast(
        self,
        req: MapSearchRequest,
        listing_type: str,
        center_lat: float,
        center_lng: float,
        radius_miles: float,
    ) -> list[MapListing]:
        # RentCast requires `radius` whenever lat/lng is supplied — without
        # it the API silently falls back to its default city="Austin",
        # state="TX" and returns Texas listings regardless of the
        # coordinates. Always pass a positive radius. (See
        # https://developers.rentcast.io/reference/sale-listings.)
        radius = max(radius_miles, 0.5)
        try:
            if listing_type == "sale":
                resp = await self.rentcast.get_sale_listings(
                    latitude=center_lat,
                    longitude=center_lng,
                    radius=radius,
                    property_type=req.property_type,
                    limit=req.limit,
                    offset=req.offset,
                )
            else:
                resp = await self.rentcast.get_rental_listings(
                    latitude=center_lat,
                    longitude=center_lng,
                    radius=radius,
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
        tag_status: str | None = None,
    ) -> list[MapListing]:
        """Fetch Zillow listings via AXESSO's typed `search-by-coordinates`.

        ``extra_params`` should use AXESSO's documented parameter names from
        ``/zil/search-by-coordinates`` (e.g., ``isAuction``, ``isForSaleForeclosure``,
        ``isForSaleByOwner``). Earlier attempts that used ``isForeclosure``
        (wrong name — AXESSO documents ``isForSaleForeclosure``) or
        ``listing_type=foreclosures,...`` (a different vendor's contract)
        were silently ignored, which is why distressed pills returned zero
        results.

        ``tag_status``, if passed, overrides ``listing_status`` after
        normalization (rare). Auction and foreclosure-scoped searches omit it so
        ``_derive_zillow_status`` can classify **Foreclosed** (REO / bank-owned)
        vs **Pre-foreclosure** separately, consistent with Zillow's split filters.
        """
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
            label = f"{status}+{','.join(f'{k}={v}' for k, v in extra_params.items())}" if extra_params else status

            if not resp.success or not resp.data:
                logger.info("Zillow %s returned no data", label)
                return []

            raw_props = resp.data.get("results") or resp.data.get("props") or resp.data.get("searchResults") or []
            if isinstance(resp.data, dict) and not raw_props:
                for val in resp.data.values():
                    if isinstance(val, list) and len(val) > 0:
                        raw_props = val
                        break

            # Diagnostic: log distress-bearing fields on the first listing so
            # we can verify in prod whether AXESSO honored the filter. Search
            # responses only carry `is_FSBA` + `isPreforeclosureAuction`, so
            # the absence of richer fields here is expected; the value of
            # this log line is mostly for tag_status correctness checking.
            if extra_params and raw_props:
                first = raw_props[0] if isinstance(raw_props[0], dict) else {}
                logger.info(
                    "Zillow %s sample fields: homeStatus=%r listing_sub_type=%r isPreforeclosureAuction=%r",
                    label,
                    first.get("homeStatus"),
                    first.get("listing_sub_type") or first.get("listingSubType"),
                    first.get("isPreforeclosureAuction"),
                )

            results: list[MapListing] = []
            for item in raw_props:
                if not self._zillow_has_coords(item):
                    continue
                listing = self._normalize_zillow_listing(item)
                if tag_status:
                    listing.listing_status = tag_status
                results.append(listing)

            logger.info("Zillow %s: %d listings", label, len(results))
            return results
        except Exception:
            logger.exception(
                "Zillow %s listing fetch failed",
                f"{status}+{extra_params}" if extra_params else status,
            )
            return []

    # Display label tagged onto each distressed listing so the canonical
    # status filter retains them downstream — search endpoint responses
    # lack ``foreclosureTypes``, so we can't re-derive the status from the
    # row itself.
    _DISTRESSED_LABELS: dict[str, str] = {
        "auction": "Auction",
        "foreclosure": "Foreclosure",
        "pre-foreclosure": "Pre-Foreclosure",
    }

    async def _fetch_zillow_distressed(
        self,
        center_lat: float,
        center_lng: float,
        radius_miles: float,
        status: str,
    ) -> list[MapListing]:
        """Fetch distressed listings (auction / foreclosure / pre-foreclosure)
        via AXESSO's ``search-by-url``.

        AXESSO's ``/zil/search-by-coordinates`` exposes typed booleans for
        Auction (``isAuction``) and Foreclosure-for-sale
        (``isForSaleForeclosure``), but in practice those typed params
        return zero rows — so we route ALL three distressed buckets
        through Zillow's native ``searchQueryState.filterState`` toggles
        (``auc`` / ``fore`` / ``pre``), which is the same path Zillow's
        own UI uses.

        For pre-foreclosure-only queries the URL builder disables ``fsba``
        (the for-sale-by-agent default) and the response is naturally
        distressed-only, so every row gets tagged ``"Pre-Foreclosure"``.

        For foreclosure / auction queries the URL builder leaves ``fsba``
        on (REOs and most auction listings are agent-listed sub-types),
        so the response contains a mix of active + distressed rows. We
        re-classify each row via :func:`_derive_zillow_status` and keep
        only those that actually match the requested distressed bucket.
        """
        if not self.zillow:
            return []

        if status not in self._DISTRESSED_LABELS:
            return []

        north, south, east, west = self._radius_to_bbox(center_lat, center_lng, max(radius_miles, 0.5))
        url = self._zillow_distressed_url(north, south, east, west, {status})
        if not url:
            return []

        try:
            resp = await self.zillow.search_by_url(url)
            if not resp.success or not resp.data:
                logger.info("Zillow %s returned no data", status)
                return []

            raw_props = resp.data.get("results") or resp.data.get("props") or resp.data.get("searchResults") or []
            if isinstance(resp.data, dict) and not raw_props:
                for val in resp.data.values():
                    if isinstance(val, list) and len(val) > 0:
                        raw_props = val
                        break

            label = self._DISTRESSED_LABELS[status]
            # Pre-foreclosure URL is distressed-only — blanket-tag every row.
            # Foreclosure/auction URLs include agent-listed actives — only
            # keep rows whose derived status matches the requested bucket.
            blanket_tag = status == "pre-foreclosure"

            results: list[MapListing] = []
            kept_via_derive = 0
            for item in raw_props:
                if not self._zillow_has_coords(item):
                    continue
                listing = self._normalize_zillow_listing(item)
                if blanket_tag:
                    listing.listing_status = label
                else:
                    derived = self._derive_zillow_status(item)
                    if derived != label:
                        continue
                    listing.listing_status = label
                    kept_via_derive += 1
                results.append(listing)

            if blanket_tag:
                logger.info("Zillow %s: %d listings", status, len(results))
            else:
                logger.info(
                    "Zillow %s: %d/%d rows matched %s",
                    status,
                    kept_via_derive,
                    len(raw_props),
                    label,
                )
            return results
        except Exception:
            logger.exception("Zillow %s listing fetch failed", status)
            return []

    # ─── Normalization helpers ─────────────────────

    async def _fetch_mashvisor_str_listings(
        self,
        req: MapSearchRequest,
        center_lat: float,
        center_lng: float,
    ) -> list[MapListing]:
        """Fetch Airbnb listings from Mashvisor for neighborhoods in the viewport."""
        if not self.mashvisor:
            return []

        try:
            # Reverse-geocode the viewport center to a state. Use a rough
            # lookup — Mashvisor needs the state as a 2-letter code.
            state = self._estimate_state_from_viewport(req)
            if not state:
                return []

            # Try to identify the city from the viewport center
            city = self._estimate_city_from_viewport(req)
            if not city:
                return []

            # Fetch neighborhood list for the city
            nb_resp = await self.mashvisor.city_neighborhoods(state=state, city=city)
            if not nb_resp.success or not nb_resp.data:
                return []

            content = nb_resp.data.get("content", {})
            raw_neighborhoods = content.get("results", []) if isinstance(content, dict) else content
            if not isinstance(raw_neighborhoods, list):
                return []

            # Filter neighborhoods that fall within the viewport
            in_viewport = []
            for nb in raw_neighborhoods:
                if not isinstance(nb, dict):
                    continue
                nb_lat = nb.get("latitude")
                nb_lng = nb.get("longitude")
                if nb_lat is None or nb_lng is None:
                    continue
                if req.south <= nb_lat <= req.north and req.west <= nb_lng <= req.east:
                    in_viewport.append(nb)

            # Cap at 5 neighborhoods to control API costs
            in_viewport = in_viewport[:5]

            if not in_viewport:
                return []

            # Fetch Airbnb listings for each in-viewport neighborhood in parallel
            airbnb_tasks = [
                asyncio.create_task(
                    self.mashvisor.neighborhood_airbnb_listings(neighborhood_id=nb["id"], state=state, items=20)
                )
                for nb in in_viewport
                if nb.get("id")
            ]

            airbnb_results = await asyncio.gather(*airbnb_tasks, return_exceptions=True)

            listings: list[MapListing] = []
            for resp in airbnb_results:
                if isinstance(resp, Exception):
                    logger.warning("Mashvisor Airbnb fetch failed: %s", resp)
                    continue
                if not resp.success or not resp.data:
                    continue
                content = resp.data.get("content", {})
                properties = content.get("properties", []) if isinstance(content, dict) else []
                if not isinstance(properties, list):
                    continue
                for prop in properties:
                    if not isinstance(prop, dict):
                        continue
                    lat = prop.get("lat")
                    lon = prop.get("lon")
                    if lat is None or lon is None:
                        continue
                    # Check the listing is within the viewport bounds
                    if not (req.south <= lat <= req.north and req.west <= lon <= req.east):
                        continue
                    listings.append(
                        MapListing(
                            id=f"mashvisor_airbnb_{prop.get('id', '')}",
                            address=prop.get("address") or prop.get("name", "Airbnb Listing"),
                            city=prop.get("airbnbCity"),
                            state=prop.get("state"),
                            zip_code=prop.get("zip"),
                            latitude=lat,
                            longitude=lon,
                            price=None,
                            bedrooms=prop.get("numOfRooms"),
                            bathrooms=prop.get("numOfBaths"),
                            property_type=prop.get("propertyType"),
                            listing_status="active",
                            photo_url=prop.get("image"),
                            source="mashvisor_airbnb",
                            night_price=prop.get("nightPrice"),
                            occupancy=prop.get("occupancy"),
                            star_rating=prop.get("startRating") or prop.get("starRating"),
                            reviews_count=prop.get("reviewsCount"),
                        )
                    )

            logger.info("Mashvisor STR: %d Airbnb listings from %d neighborhoods", len(listings), len(in_viewport))
            return listings

        except Exception as e:
            logger.error("Mashvisor STR listing fetch failed: %s", e)
            return []

    @staticmethod
    def _estimate_state_from_viewport(req: MapSearchRequest) -> str | None:
        """Get state from request params (frontend passes from geocoding context)."""
        return req.str_state or None

    @staticmethod
    def _estimate_city_from_viewport(req: MapSearchRequest) -> str | None:
        """Get city from request params (frontend passes from geocoding context)."""
        return req.str_city or None

    @staticmethod
    def _has_coords(item: dict) -> bool:
        return item.get("latitude") is not None and item.get("longitude") is not None

    @staticmethod
    def _zillow_has_coords(item: dict) -> bool:
        lat = item.get("latitude") or item.get("lat")
        lng = item.get("longitude") or item.get("lng") or item.get("long")
        return lat is not None and lng is not None

    # ── Photo URL extraction ────────────────────────────────────────────────
    # AXESSO/Zillow returns photos under several different shapes depending on
    # the endpoint and the listing's lifecycle (active vs off-market vs FC).
    # We try the cheap top-level keys first, then walk the richer nested
    # arrays (responsivePhotos / carouselPhotos / hugePhotos / photos /
    # originalPhotos), then any dict with mixedSources.{jpeg,webp}. This
    # mirrors the frontend rent-comps `pickPhotoUrl` so a listing that shows
    # a photo on the property detail page also shows one on the map.

    @staticmethod
    def _pick_photo_url(value: Any) -> str | None:
        """Recursively search a value for a usable photo URL string."""
        if value is None:
            return None
        if isinstance(value, str):
            s = value.strip()
            return s or None
        if isinstance(value, list):
            for item in value:
                url = MapSearchService._pick_photo_url(item)
                if url:
                    return url
            return None
        if isinstance(value, dict):
            for key in ("url", "href", "src", "imageUrl", "imgSrc", "thumbnailUrl"):
                v = value.get(key)
                if isinstance(v, str) and v.strip():
                    return v.strip()
            for key in ("jpeg", "webp", "png", "mixedSources", "subPhotos", "photo", "image"):
                if key in value:
                    nested = MapSearchService._pick_photo_url(value[key])
                    if nested:
                        return nested
        return None

    @staticmethod
    def _extract_photo_url(item: dict, *, primary_keys: tuple[str, ...] = ()) -> str | None:
        """Find the best available photo URL on a raw provider listing item.

        ``primary_keys`` lets each provider list its preferred top-level fields
        (e.g. ``("photoUrl", "imgSrc")`` for RentCast or ``("imgSrc",)`` for
        Zillow). We then fall through to common nested-array fields used by
        AXESSO Zillow responses.
        """
        for key in primary_keys:
            v = item.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()
        for key in (
            "miniCardPhotos",
            "compsCarouselPropertyPhotos",
            "carouselPhotos",
            "responsivePhotos",
            "photos",
            "listingPhotos",
            "hugePhotos",
            "originalPhotos",
            "primaryPhoto",
            "primary_photo",
            "image",
            "thumbnailUrl",
        ):
            if key in item:
                url = MapSearchService._pick_photo_url(item[key])
                if url:
                    return url
        return None

    @staticmethod
    def _rentcast_listing_subtype(item: dict) -> dict[str, Any]:
        """Normalize listingSubType flags from nested objects or flat RentCast-style keys."""
        sub = item.get("listingSubType") or item.get("listing_sub_type")
        if isinstance(sub, dict):
            return sub
        out: dict[str, Any] = {}
        for key in ("isBankOwned", "isForeclosure", "isFSBO", "isFSBA", "isForAuction"):
            for prefix in ("listingSubType_", "listing_sub_type_"):
                flat = f"{prefix}{key}"
                if flat in item and item[flat] is not None:
                    out[key] = item[flat]
                    break
        return out

    @staticmethod
    def _derive_rentcast_listing_status(item: dict) -> str | None:
        """Derive listing_status from RentCast subtype flags and listingType enum.

        Aligns MLS-style labels with institutional convention: **bank-owned (REO)
        is post-foreclosure resale**; **pending / in-process collateral is pre-foreclosure**,
        not “Foreclosure” in the REO sense. RentCast's ``listingType`` enum value
        ``Foreclosure`` is treated as pre-foreclosure inventory when no REO flag is set.

        Mapping when ``listingSubType`` (or flat equivalents) is present:
        - isBankOwned → Foreclosure (REO)
        - isForAuction → Auction
        - isForeclosure → Pre-Foreclosure
        - isFSBO → Owner Listed
        - isFSBA → Active (MLS agent-listed)
        """
        sub = MapSearchService._rentcast_listing_subtype(item)

        def _truthy(name: str) -> bool:
            v = sub.get(name)
            return bool(v) if v is not None else False

        if _truthy("isBankOwned"):
            return "Foreclosure"
        if _truthy("isForAuction"):
            return "Auction"
        if _truthy("isForeclosure"):
            return "Pre-Foreclosure"
        if _truthy("isFSBO"):
            return "Owner Listed"
        if _truthy("isFSBA"):
            return "Active"

        listing_type = (item.get("listingType") or "").strip()
        lt_lower = listing_type.lower()
        if lt_lower == "short sale":
            return "Short Sale"
        if lt_lower == "foreclosure":
            return "Pre-Foreclosure"

        return item.get("status")

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

        raw_status = MapSearchService._derive_rentcast_listing_status(item)

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
            photo_url=MapSearchService._extract_photo_url(item, primary_keys=("photoUrl", "imgSrc")),
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

        # AXESSO Zillow puts the thumbnail in different fields depending on
        # listing type (active vs distressed) and endpoint. Prefer imgSrc /
        # miniCardPhotos and fall through to the richer nested arrays so the
        # map matches what the property detail view shows.
        photo_url = MapSearchService._extract_photo_url(item, primary_keys=("imgSrc",))

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

        ``isForeclosure`` on listingSubType indicates **pending** collateral / lis-pendens
        style inventory (pre-foreclosure). **REO / bank-owned** is post-foreclosure resale
        and maps to Foreclosure for filters. Order: explicit pre-FC flags → pending
        isForeclosure → other foreclosure signals → auction → REO → FSBO → homeStatus.
        """
        sub = item.get("listingSubType") or item.get("listing_sub_type") or {}
        if not isinstance(sub, dict):
            sub = {}
        fore_types = item.get("foreclosureTypes") or {}

        if fore_types.get("isPreforeclosure") or fore_types.get("isPreForeclosure"):
            return "Pre-Foreclosure"
        if sub.get("isForeclosure"):
            return "Pre-Foreclosure"
        if fore_types.get("isAnyForeclosure") or fore_types.get("wasForeclosed"):
            return "Foreclosure"
        if sub.get("isForAuction") or fore_types.get("wasNonRetailAuction"):
            return "Auction"
        if sub.get("isBankOwned") or fore_types.get("isBankOwned"):
            return "Foreclosure"
        if sub.get("isFSBO"):
            return "Owner Listed"

        return item.get("homeStatus") or item.get("listingStatus")


map_search_service = MapSearchService()
