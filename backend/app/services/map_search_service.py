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
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.data.motivated_seller_keywords import MOTIVATED_SELLER_KEYWORDS
from app.schemas.property import MapListing, MapSearchRequest, MapSearchResponse
from app.services.api_clients import MashvisorClient, RentCastClient, create_api_clients
from app.services.cache_service import get_cache_service
from app.services.zillow_client import ZillowClient, create_zillow_client

logger = logging.getLogger(__name__)

MAP_CACHE_TTL = 600  # 10 minutes
MOTIVATED_SELLER_KEYWORD_CACHE_TTL = 1800  # 30 minutes per keyword + viewport
MOTIVATED_SELLER_CONCURRENCY = 8

# Average days per year (accounts for leap years) — used to translate an
# owner-tenure window in years into RentCast's saleDateRange (days-ago) filter.
DAYS_PER_YEAR = 365.25

# Wide "ever sold" saleDateRange (~100 years). RentCast only returns FULL property
# records (owner / ownerOccupied / lastSaleDate) when a saleDateRange is present;
# used for occupancy-only searches that have no tenure window.
OWNER_RECORDS_ANY_TENURE_RANGE = "*:36500"

# ─── Listing status canonicalization ─────────────────────────────────────
# Mirrors frontend/src/lib/dealSignal.ts :: STATUS_MAP. Keep in sync; if these
# drift the user-visible filter and the server-side filter will disagree.

CANONICAL_STATUSES: set[str] = {
    "active",
    "owner_listed",
    "foreclosure",
    "pre-foreclosure",
    "auction",
    "expired",
}

# Expired proxy: how far back a RentCast "Inactive"/delisted listing's
# removedDate can be and still count as an actionable expired lead.
EXPIRED_MAX_AGE_DAYS = 120

# Hard cap for the best-effort recently-sold validation call (Zillow scraping via
# AXESSO is slow); keeps it from blowing the request budget → gateway 500.
RECENT_RESALE_TIMEOUT_S = 12.0

# Per-property expired validation: each delisted candidate gets a current-status
# lookup on Zillow. Bounded by concurrency + per-call timeout + a candidate cap
# so the (many, slow) lookups can't blow the request budget.
EXPIRED_VALIDATION_CONCURRENCY = 10
EXPIRED_VALIDATION_TIMEOUT_S = 6.0
EXPIRED_VALIDATION_MAX_CANDIDATES = 60

# Zillow current-status tokens that mean a delisted candidate is back on the
# market or already sold → NOT an off-market lead. Matched as substrings against
# an uppercased, separator-stripped status so "FOR_SALE"/"ForSale", "RECENTLY_SOLD"
# /"RecentlySold", "PENDING", etc. all hit. ("ACTIVE" is intentionally excluded —
# it would substring-match "INACTIVE".)
_EXPIRED_DISQUALIFYING_STATUS_TOKENS: tuple[str, ...] = (
    "FORSALE",
    "FORRENT",
    "PENDING",
    "COMINGSOON",
    "CONTINGENT",
    "BACKUP",
    "SOLD",
)

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
    # Expired proxy (RentCast inactive/delisted-and-unsold)
    "expired": "expired",
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
    "expired": 60,
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
            "mss": req.motivated_seller_search,
            "otmin": req.owner_tenure_min_years,
            "otmax": req.owner_tenure_max_years,
            "occ": req.owner_occupancy,
            "lim": req.limit,
            "off": req.offset,
        },
        sort_keys=True,
    )
    digest = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"mapsearch:{digest}"


def _build_keyword_cache_key(keyword: str, req: MapSearchRequest) -> str:
    """Cache key for a single motivated-seller keyword query within a viewport."""
    raw = json.dumps(
        {
            "kw": keyword.lower().strip(),
            "n": _round_coord(req.north),
            "s": _round_coord(req.south),
            "e": _round_coord(req.east),
            "w": _round_coord(req.west),
            "pt": req.property_type,
        },
        sort_keys=True,
    )
    digest = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"mapsearch:kw:{digest}"


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

        motivated_seller_mode = req.motivated_seller_search
        # Owner-records mode: RentCast property-records lead search, driven by an
        # owner-tenure window and/or an owner-occupancy (absentee) filter.
        owner_records_mode = req.owner_tenure_min_years is not None or req.owner_occupancy is not None

        # Decide grid size based on viewport radius
        if motivated_seller_mode or owner_records_mode:
            grid_size = 1
        elif radius > 100:
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

        if motivated_seller_mode:
            logger.info(
                "Map search motivated-seller mode: replacing standard sources with %d Zillow keyword queries",
                len(MOTIVATED_SELLER_KEYWORDS),
            )
            if req.listing_type in ("sale", "both"):
                motivated_rows = await self._fetch_motivated_seller_listings(req, cache)
                raw_source_totals = len(motivated_rows)
                for item in motivated_rows:
                    self._merge_listing_into(listings_by_addr, item)
        elif owner_records_mode:
            logger.info(
                "Map search owner-records mode: RentCast property records, tenure=%s-%s yrs, occupancy=%s",
                req.owner_tenure_min_years,
                req.owner_tenure_max_years,
                req.owner_occupancy,
            )
            # Fetch long-tenure candidates (RentCast records) and an independent
            # recently-sold set (Zillow) concurrently. The latter validates that
            # RentCast's lastSaleDate hasn't gone stale via a resale in the gap —
            # RentCast can't catch that itself (same dataset), so we use a fresher
            # MLS-sourced source. Best-effort: if validation fails, rows are left
            # unflagged rather than dropped.
            tenure_rows, resale_index = await asyncio.gather(
                self._fetch_owner_tenure_records(req, center_lat, center_lng, sub_radius),
                self._fetch_recent_resales(center_lat, center_lng, sub_radius),
            )
            tenure_rows = self._annotate_tenure_confidence(tenure_rows, resale_index)
            # Hard-exclude candidates an independent source shows resold recently.
            # Only drops rows actually flagged "recent_resale"; when validation was
            # unavailable (confidence is None) nothing is dropped, so we never hide
            # leads we couldn't verify.
            before_exclude = len(tenure_rows)
            tenure_rows = [r for r in tenure_rows if r.tenure_confidence != "recent_resale"]
            excluded = before_exclude - len(tenure_rows)
            if excluded:
                logger.info("Owner-tenure: hard-excluded %d recently-resold candidates", excluded)
            raw_source_totals = len(tenure_rows)
            for item in tenure_rows:
                self._merge_listing_into(listings_by_addr, item)
        else:
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
                    # RentCast active for-sale — only when active/owner-listed is
                    # wanted (mirrors the Zillow forSale gate below) so an
                    # expired-only or distressed-only search doesn't waste the call.
                    if requested_statuses & {"active", "owner_listed"} and not _skip_rentcast_sale_use_zillow_only_distressed(
                        requested_statuses,
                        bool(self.zillow),
                    ):
                        tasks.append(
                            asyncio.create_task(
                                self._fetch_rentcast(req, "sale", pt_lat, pt_lng, sub_radius),
                            )
                        )
                    # Expired proxy: RentCast "Inactive" (delisted) for-sale records
                    # that did NOT sell (recently-sold ones are removed downstream).
                    if "expired" in requested_statuses:
                        tasks.append(
                            asyncio.create_task(
                                self._fetch_rentcast_expired(req, pt_lat, pt_lng, sub_radius),
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

        # Expired proxy refinement: a RentCast "Inactive" listing is only a true
        # expired/withdrawn lead if it DIDN'T sell. Cross-check against an
        # independent recently-sold source (Zillow) and drop any expired row that
        # actually closed. Best-effort: if validation is unavailable, rows are kept.
        if "expired" in requested_statuses and self.zillow:
            # RentCast's "Inactive" flag lags reality — delisted records are often
            # back on the market or already sold. Validate each candidate's CURRENT
            # status directly on Zillow (per-property address lookup) and keep only
            # the ones that are NOT relisted or sold — the genuine off-market leads.
            expired_rows = [i for i in listings if normalize_listing_status(i.listing_status) == "expired"]
            if expired_rows:
                others = [i for i in listings if normalize_listing_status(i.listing_status) != "expired"]
                kept = await self._filter_expired_not_relisted(expired_rows)
                listings = others + kept
                logger.info(
                    "Expired validation: %d candidates → %d not relisted/sold",
                    len(expired_rows),
                    len(kept),
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
        # also dropped here. Skipped in owner-tenure mode, whose off-market
        # property records are an intentionally distinct (non-listing)
        # inventory that doesn't map onto the for-sale status buckets.
        if not owner_records_mode:
            listings = [item for item in listings if normalize_listing_status(item.listing_status) in requested_statuses]

        # Estimate total: if every sub-query returned its limit, there are
        # likely more listings than we fetched. Extrapolate conservatively.
        estimated_total: int | None = None
        if not motivated_seller_mode and grid_size > 1:
            full_queries = sum(1 for r in results if not isinstance(r, Exception) and len(r) >= req.limit * 0.8)
            if full_queries > 0:
                avg_per_query = raw_source_totals / max(len([r for r in results if not isinstance(r, Exception)]), 1)
                area_multiplier = max(grid_size**2, 1)
                estimated_total = int(avg_per_query * area_multiplier * 1.5)

        logger.info(
            "Map search returned %d listings (statuses=%s, motivated=%s, %d grid points, radius=%.1fmi, grid=%dx%d)",
            len(listings),
            sorted(requested_statuses),
            motivated_seller_mode,
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
            merged = _merge_preserving_loser_fields(item, existing)
        else:
            # Same-or-lower priority: existing wins, but pick up any
            # display fields it was missing.
            merged = _merge_preserving_loser_fields(existing, item)
        combined_kw = sorted(
            set((existing.motivated_keywords or []) + (item.motivated_keywords or []))
        )
        if combined_kw:
            merged = merged.model_copy(update={"motivated_keywords": combined_kw})
        bucket[addr_key] = merged

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

    @staticmethod
    def _zillow_keyword_url(
        north: float,
        south: float,
        east: float,
        west: float,
        keyword: str,
    ) -> str:
        """Build a Zillow ``searchQueryState`` URL for listing-description keyword search.

        Zillow's Keywords filter maps to ``filterState.kw.value`` (comma-separated
        terms are ANDed; we issue one keyword per URL for OR semantics).
        Routed through AXESSO ``search-by-url`` like distressed inventory.
        """
        filter_state = {"kw": {"value": keyword.strip()}}
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

    # ─── Expired listings (RentCast inactive/delisted proxy) ────────────────

    @staticmethod
    def _parse_iso_dt(value: Any) -> datetime | None:
        """Parse an ISO date/datetime string to an aware datetime, or None."""
        if value is None:
            return None
        s = str(value).strip()
        if not s:
            return None
        for candidate in (s.replace("Z", "+00:00"), s[:10]):
            try:
                dt = datetime.fromisoformat(candidate)
                return dt if dt.tzinfo else dt.replace(tzinfo=UTC)
            except (ValueError, TypeError):
                continue
        return None

    @classmethod
    def _within_days(cls, value: Any, max_days: int) -> bool:
        """True only when ``value`` is a known date within ``max_days`` of now.

        Unknown/unparseable dates return False: a strict recency window ("delisted
        in the past N days") is a positive assertion we can't make for a missing
        date, so those listings are excluded rather than assumed recent. Future
        dates are also rejected defensively.
        """
        dt = cls._parse_iso_dt(value)
        if dt is None:
            return False
        return 0 <= (datetime.now(UTC) - dt).days <= max_days

    async def _fetch_rentcast_expired(
        self,
        req: MapSearchRequest,
        center_lat: float,
        center_lng: float,
        radius_miles: float,
    ) -> list[MapListing]:
        """Fetch RentCast "Inactive" (delisted) for-sale listings as expired-proxy rows.

        RentCast doesn't expose a true "Expired" status — only Active/Inactive —
        so this returns delisted listings (gated to a recent ``removedDate`` window
        for actionability), tagged ``Expired``. The caller removes any that
        actually sold via an independent recently-sold cross-check, leaving the
        expired/withdrawn "failed to sell" set.
        """
        radius = max(radius_miles, 0.5)
        try:
            resp = await self.rentcast.get_sale_listings(
                latitude=center_lat,
                longitude=center_lng,
                radius=radius,
                property_type=req.property_type,
                status="Inactive",
                limit=req.limit,
                offset=req.offset,
            )
            if not resp.success or not resp.data:
                logger.info("RentCast expired (inactive) returned no data")
                return []

            raw_listings: list[dict[str, Any]] = resp.data if isinstance(resp.data, list) else [resp.data]
            results: list[MapListing] = []
            for item in raw_listings:
                if not self._has_coords(item):
                    continue
                removed = item.get("removedDate")
                if not self._within_days(removed, EXPIRED_MAX_AGE_DAYS):
                    continue
                base = self._normalize_rentcast_listing(item)
                delisted_dt = self._parse_iso_dt(removed)
                results.append(
                    base.model_copy(
                        update={
                            "listing_status": "Expired",
                            "delisted_date": delisted_dt.date().isoformat() if delisted_dt else None,
                        }
                    )
                )
            logger.info("RentCast expired: %d delisted listings within %dd window", len(results), EXPIRED_MAX_AGE_DAYS)
            return results
        except Exception:
            logger.exception("RentCast expired (inactive) listing fetch failed")
            return []

    @staticmethod
    def _extract_current_status(resp: Any) -> str | None:
        """Pull the current listing status from a Zillow search-by-address response."""
        if resp is None or not getattr(resp, "success", False) or not getattr(resp, "data", None):
            return None
        data = resp.data
        if isinstance(data, list):
            data = data[0] if data else None
        if not isinstance(data, dict):
            return None
        return data.get("homeStatus") or data.get("keystoneHomeStatus") or data.get("listingStatus")

    @classmethod
    def _is_relisted_or_sold(cls, status: str | None) -> bool:
        """True when a Zillow status means the property is back on market or sold."""
        if not status:
            return False
        s = status.upper().replace("_", "").replace(" ", "")
        return any(tok in s for tok in _EXPIRED_DISQUALIFYING_STATUS_TOKENS)

    async def _filter_expired_not_relisted(self, candidates: list[MapListing]) -> list[MapListing]:
        """Keep only delisted candidates that Zillow shows as NOT relisted or sold.

        For each candidate we look up its CURRENT status on Zillow by address and
        drop it if it's back on the market (for sale / pending / coming soon /
        contingent) or sold — leaving the genuinely off-market "listed but didn't
        sell, not relisted" set the user is after.

        Bounded by concurrency, a per-call timeout, and a candidate cap so the
        per-property lookups can't blow the request budget. Lookups that fail are
        kept (not *confirmed* relisted).
        """
        if not self.zillow or not candidates:
            return candidates

        to_check = candidates[:EXPIRED_VALIDATION_MAX_CANDIDATES]
        if len(candidates) > EXPIRED_VALIDATION_MAX_CANDIDATES:
            logger.info(
                "Expired validation capped at %d of %d candidates (zoom in to validate the rest)",
                EXPIRED_VALIDATION_MAX_CANDIDATES,
                len(candidates),
            )
        semaphore = asyncio.Semaphore(EXPIRED_VALIDATION_CONCURRENCY)

        async def _keep(candidate: MapListing) -> MapListing | None:
            async with semaphore:
                try:
                    resp = await asyncio.wait_for(
                        self.zillow.search_by_address(candidate.address),
                        timeout=EXPIRED_VALIDATION_TIMEOUT_S,
                    )
                except (TimeoutError, asyncio.TimeoutError):
                    return candidate  # couldn't verify → not confirmed relisted → keep
                except Exception:
                    logger.debug("Expired validation lookup failed for %s", candidate.address)
                    return candidate
            return None if self._is_relisted_or_sold(self._extract_current_status(resp)) else candidate

        results = await asyncio.gather(*[_keep(c) for c in to_check])
        return [c for c in results if c is not None]

    # ─── Owner tenure (RentCast property records) ──────────────────────────

    @staticmethod
    def _tenure_sale_date_range(min_years: int, max_years: int | None) -> str:
        """Translate an owner-tenure window (years) into RentCast ``saleDateRange``.

        RentCast expresses ``saleDateRange`` as a *days-ago* lookback with
        ``min:max`` range syntax. Longer tenure = sold further in the past, so
        ``min_years`` maps to the smaller day bound and ``max_years`` to the
        larger one. An omitted ``max_years`` yields an open-ended ``min:*``
        window (e.g. "30+ years").
        """
        min_days = int(round(min_years * DAYS_PER_YEAR))
        if max_years is None:
            return f"{min_days}:*"
        max_days = int(round(max_years * DAYS_PER_YEAR))
        return f"{min_days}:{max_days}"

    async def _fetch_owner_tenure_records(
        self,
        req: MapSearchRequest,
        center_lat: float,
        center_lng: float,
        radius_miles: float,
    ) -> list[MapListing]:
        """Fetch off-market property records for owner-tenure / absentee lead search.

        Uses RentCast's ``/properties`` records endpoint (not the for-sale listings
        endpoint). A ``saleDateRange`` filter is ALWAYS sent — it's what makes
        RentCast return full records (owner, ownerOccupied, lastSaleDate); without
        it the bulk list is trimmed. When no tenure window is set we send a wide
        "ever sold" range so an occupancy-only search still gets full records.

        Owner-occupancy (absentee) is filtered CLIENT-SIDE: RentCast ignores the
        ``ownerOccupied`` query param, so we filter on the returned field.
        """
        if req.owner_tenure_min_years is None and req.owner_occupancy is None:
            return []

        if req.owner_tenure_min_years is not None:
            sale_date_range = self._tenure_sale_date_range(
                req.owner_tenure_min_years,
                req.owner_tenure_max_years,
            )
        else:
            sale_date_range = OWNER_RECORDS_ANY_TENURE_RANGE

        radius = max(radius_miles, 0.5)
        try:
            resp = await self.rentcast.get_property_records(
                latitude=center_lat,
                longitude=center_lng,
                radius=radius,
                property_type=req.property_type,
                sale_date_range=sale_date_range,
                limit=req.limit,
                offset=req.offset,
            )
            if not resp.success or not resp.data:
                logger.info("RentCast property records returned no data (saleDateRange=%s)", sale_date_range)
                return []

            # RentCast /properties may return a list or a wrapped object { properties: [...] }.
            if isinstance(resp.data, list):
                raw_records: list[dict[str, Any]] = resp.data
            else:
                body = resp.data or {}
                raw_records = body.get("properties") or body.get("data") or []
                if not isinstance(raw_records, list):
                    raw_records = [raw_records] if raw_records else []
            results = [
                self._normalize_owner_tenure_record(item)
                for item in raw_records
                if self._has_coords(item)
            ]

            # Client-side owner-occupancy filter (RentCast ignores the server param).
            if req.owner_occupancy == "absentee":
                results = [r for r in results if r.owner_occupied is False]
            elif req.owner_occupancy == "owner_occupied":
                results = [r for r in results if r.owner_occupied is True]

            logger.info(
                "RentCast property records: %d records (saleDateRange=%s, occupancy=%s)",
                len(results),
                sale_date_range,
                req.owner_occupancy,
            )
            return results
        except Exception:
            logger.exception("RentCast property records fetch failed (saleDateRange=%s)", sale_date_range)
            return []

    @staticmethod
    def _owner_years_from_sale_date(last_sale_date: str | None) -> float | None:
        """Years between ``last_sale_date`` (ISO) and now, or None if unparseable."""
        if not last_sale_date:
            return None
        raw = str(last_sale_date).strip()
        if not raw:
            return None
        # RentCast returns e.g. "2003-05-14T00:00:00.000Z"; normalize the Z.
        normalized = raw.replace("Z", "+00:00")
        from datetime import UTC, datetime

        for candidate in (normalized, raw[:10]):
            try:
                parsed = datetime.fromisoformat(candidate)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=UTC)
                delta_days = (datetime.now(UTC) - parsed).days
                return round(max(delta_days, 0) / DAYS_PER_YEAR, 1)
            except (ValueError, TypeError):
                continue
        return None

    @staticmethod
    def _normalize_owner_tenure_record(item: dict) -> MapListing:
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

        last_sale_date = item.get("lastSaleDate")
        last_sale_price = item.get("lastSalePrice")
        owner_years = MapSearchService._owner_years_from_sale_date(last_sale_date)
        owner_occupied = item.get("ownerOccupied")

        return MapListing(
            id=item.get("id") or f"rc-rec-{item.get('latitude')}-{item.get('longitude')}",
            address=address,
            city=city or None,
            state=state or None,
            zip_code=zipcode or None,
            latitude=item["latitude"],
            longitude=item["longitude"],
            # Off-market record: no list price. Surface last sale price so the
            # marker/card still has a dollar anchor.
            price=last_sale_price,
            bedrooms=item.get("bedrooms"),
            bathrooms=item.get("bathrooms"),
            sqft=item.get("squareFootage"),
            property_type=item.get("propertyType"),
            listing_status="off-market",
            photo_url=None,
            source="rentcast_records",
            days_on_market=None,
            year_built=item.get("yearBuilt"),
            last_sale_date=str(last_sale_date) if last_sale_date else None,
            last_sale_price=last_sale_price,
            owner_years=owner_years,
            owner_occupied=owner_occupied if isinstance(owner_occupied, bool) else None,
        )

    # ─── Owner-tenure validation (recent-resale guard) ─────────────────────

    # Canonical forms for street-type suffixes and directionals so the same
    # address from different providers ("12 Oak Street N" vs "12 Oak St N" vs
    # "12 Oak St North") collapses to one key. Matching is the #1 leak in the
    # expired cross-check — every miss leaves a sold/listed false positive in.
    _STREET_TOKEN_CANON: dict[str, str] = {
        "street": "st", "st": "st",
        "avenue": "ave", "ave": "ave", "av": "ave",
        "road": "rd", "rd": "rd",
        "drive": "dr", "dr": "dr",
        "lane": "ln", "ln": "ln",
        "court": "ct", "ct": "ct",
        "circle": "cir", "cir": "cir", "cr": "cir",
        "boulevard": "blvd", "blvd": "blvd",
        "place": "pl", "pl": "pl",
        "terrace": "ter", "ter": "ter", "terr": "ter",
        "parkway": "pkwy", "pkwy": "pkwy", "pky": "pkwy",
        "highway": "hwy", "hwy": "hwy",
        "trail": "trl", "trl": "trl",
        "square": "sq", "sq": "sq",
        "cove": "cv", "cv": "cv",
        "point": "pt", "pt": "pt",
        "plaza": "plz", "plz": "plz",
        "way": "way", "loop": "loop", "run": "run", "pass": "pass", "path": "path", "row": "row",
        # directionals
        "north": "n", "n": "n", "south": "s", "s": "s",
        "east": "e", "e": "e", "west": "w", "w": "w",
        "northeast": "ne", "ne": "ne", "northwest": "nw", "nw": "nw",
        "southeast": "se", "se": "se", "southwest": "sw", "sw": "sw",
    }

    @staticmethod
    def _addr_match_key(address: str | None) -> str | None:
        """Cross-provider address key: canonicalized street line + 5-digit zip.

        Normalizes street-type/directional tokens (Street→st, North→n, …) so the
        same property from RentCast vs Zillow collapses to one key. Imperfect
        matching fails safe — a miss leaves a candidate in (over-includes), never
        drops a legitimate one.
        """
        if not address:
            return None
        import re

        s = address.lower().strip()
        if not s:
            return None
        street_raw = re.sub(r"[^a-z0-9 ]", "", s.split(",")[0])
        tokens = [t for t in street_raw.split() if t]
        if not tokens:
            return None
        canon = [MapSearchService._STREET_TOKEN_CANON.get(t, t) for t in tokens]
        street = " ".join(canon)
        zip_match = re.search(r"\b(\d{5})\b", s)
        return f"{street}|{zip_match.group(1) if zip_match else ''}"

    @staticmethod
    def _zillow_sold_date_to_iso(value: Any) -> str | None:
        """Normalize a Zillow sold date (epoch-ms / epoch-s / ISO string) to YYYY-MM-DD."""
        if value is None or isinstance(value, bool):
            return None
        if isinstance(value, (int, float)):
            try:
                ts = value / 1000 if value > 1e11 else value
                return datetime.fromtimestamp(ts, tz=UTC).date().isoformat()
            except (ValueError, OSError, OverflowError):
                return None
        s = str(value).strip()
        if len(s) >= 10 and s[4] == "-":
            return s[:10]
        return s or None

    @staticmethod
    def _zillow_recently_sold_url(
        north: float,
        south: float,
        east: float,
        west: float,
        doz: str = "36m",
    ) -> str:
        """Build a Zillow ``searchQueryState`` URL for recently-sold inventory.

        Recently-sold requires ``rs`` (isRecentlySold) on and ALL for-sale
        category toggles off (``fsba``/``fsbo``/``nc``/``cmsn``/``auc``/``fore``),
        otherwise Zillow returns the union of for-sale + sold. ``doz`` (days on
        Zillow, sold-within) only accepts preset buckets — "36m" is the widest,
        which comfortably covers RentCast's realistic ingestion lag.

        Routed through AXESSO ``search-by-url`` like the distressed buckets.
        NOTE: validate against live AXESSO as the distressed path was — if the
        filter is wrong it simply yields no flags (fail-safe), not bad results.
        """
        filter_state = {
            "rs": {"value": True},
            "doz": {"value": doz},
            "fsba": {"value": False},
            "fsbo": {"value": False},
            "nc": {"value": False},
            "cmsn": {"value": False},
            "auc": {"value": False},
            "fore": {"value": False},
        }
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
        return f"https://www.zillow.com/homes/recently_sold/?searchQueryState={encoded}"

    async def _fetch_recent_resales(
        self,
        center_lat: float,
        center_lng: float,
        radius_miles: float,
    ) -> dict[str, str | None] | None:
        """Build an index of recently-sold addresses (last ~36mo) for the viewport.

        Returns ``{addr_key: sold_date_iso_or_None}`` on success (possibly empty),
        or ``None`` when validation is unavailable (no Zillow client / request
        failed) so callers can distinguish "checked, nothing recent" from
        "couldn't check".
        """
        if not self.zillow:
            return None

        north, south, east, west = self._radius_to_bbox(center_lat, center_lng, max(radius_miles, 0.5))
        url = self._zillow_recently_sold_url(north, south, east, west, doz="36m")
        try:
            # Hard cap: AXESSO search-by-url scrapes Zillow and can run 30s+ with
            # retries. This validation is best-effort, so bound it tightly — a
            # slow call must never blow the overall request budget (which would
            # surface as a gateway 500), it just skips validation instead.
            resp = await asyncio.wait_for(self.zillow.search_by_url(url), timeout=RECENT_RESALE_TIMEOUT_S)
            if not resp.success:
                return None
            data = resp.data or {}
            raw_props = data.get("results") or data.get("props") or data.get("searchResults") or []
            if isinstance(data, dict) and not raw_props:
                for val in data.values():
                    if isinstance(val, list) and len(val) > 0:
                        raw_props = val
                        break

            index: dict[str, str | None] = {}
            for item in raw_props:
                if not isinstance(item, dict) or not self._zillow_has_coords(item):
                    continue
                listing = self._normalize_zillow_listing(item)
                key = self._addr_match_key(listing.address)
                if not key:
                    continue
                sold_raw = item.get("dateSold") or item.get("soldDate") or item.get("lastSoldDate")
                index[key] = self._zillow_sold_date_to_iso(sold_raw)
            logger.info("Recent-resale validation: %d recently-sold addresses in viewport", len(index))
            return index
        except (TimeoutError, asyncio.TimeoutError):
            logger.warning(
                "Recent-resale validation timed out after %.0fs — skipping (rows kept)",
                RECENT_RESALE_TIMEOUT_S,
            )
            return None
        except Exception:
            logger.exception("Zillow recent-resale validation fetch failed")
            return None

    @staticmethod
    def _annotate_tenure_confidence(
        rows: list[MapListing],
        resale_index: dict[str, str | None] | None,
    ) -> list[MapListing]:
        """Flag long-tenure candidates that an independent source shows resold recently.

        ``tenure_confidence`` is left ``None`` when validation was unavailable,
        set to ``"recent_resale"`` when a fresher source contradicts the tenure,
        and ``"clear"`` otherwise. Rows are flagged, never dropped — surfacing the
        uncertainty is safer than silently hiding leads.
        """
        if resale_index is None:
            return rows
        annotated: list[MapListing] = []
        flagged = 0
        for row in rows:
            key = MapSearchService._addr_match_key(row.address)
            if key and key in resale_index:
                flagged += 1
                annotated.append(
                    row.model_copy(
                        update={
                            "tenure_confidence": "recent_resale",
                            "recent_resale_date": resale_index[key],
                        }
                    )
                )
            else:
                annotated.append(row.model_copy(update={"tenure_confidence": "clear"}))
        if flagged:
            logger.info("Owner-tenure: flagged %d/%d candidates as possible recent resales", flagged, len(rows))
        return annotated

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

    async def _fetch_zillow_keyword(
        self,
        req: MapSearchRequest,
        keyword: str,
        cache: Any,
    ) -> list[MapListing]:
        """Fetch for-sale listings matching a single Zillow keyword within the viewport."""
        if not self.zillow:
            return []

        cache_key = _build_keyword_cache_key(keyword, req)
        cached = await cache.get(cache_key)
        if cached:
            try:
                return [MapListing(**item) for item in cached]
            except Exception:
                logger.warning("Motivated-seller keyword cache parse failed for %r", keyword)

        url = self._zillow_keyword_url(req.north, req.south, req.east, req.west, keyword)
        try:
            resp = await self.zillow.search_by_url(url)
            if not resp.success or not resp.data:
                await cache.set(cache_key, [], ttl_seconds=MOTIVATED_SELLER_KEYWORD_CACHE_TTL)
                return []

            raw_props = resp.data.get("results") or resp.data.get("props") or resp.data.get("searchResults") or []
            if isinstance(resp.data, dict) and not raw_props:
                for val in resp.data.values():
                    if isinstance(val, list) and len(val) > 0:
                        raw_props = val
                        break

            results: list[MapListing] = []
            for item in raw_props:
                if not self._zillow_has_coords(item):
                    continue
                listing = self._normalize_zillow_listing(item)
                results.append(listing.model_copy(update={"motivated_keywords": [keyword]}))

            await cache.set(
                cache_key,
                [item.model_dump(mode="json") for item in results],
                ttl_seconds=MOTIVATED_SELLER_KEYWORD_CACHE_TTL,
            )
            if results:
                logger.info("Zillow keyword %r: %d listings", keyword, len(results))
            return results
        except Exception:
            logger.exception("Zillow keyword %r listing fetch failed", keyword)
            return []

    async def _fetch_motivated_seller_listings(
        self,
        req: MapSearchRequest,
        cache: Any,
    ) -> list[MapListing]:
        """Run parallel Zillow keyword searches for every motivated-seller phrase."""
        if not self.zillow:
            return []

        semaphore = asyncio.Semaphore(MOTIVATED_SELLER_CONCURRENCY)
        listings_by_addr: dict[str, MapListing] = {}
        hits_by_keyword: dict[str, int] = {}

        async def _run_keyword(keyword: str) -> None:
            async with semaphore:
                rows = await self._fetch_zillow_keyword(req, keyword, cache)
            hits_by_keyword[keyword] = len(rows)
            for item in rows:
                self._merge_listing_into(listings_by_addr, item)

        await asyncio.gather(*(_run_keyword(kw) for kw in MOTIVATED_SELLER_KEYWORDS))

        keywords_with_hits = sum(1 for count in hits_by_keyword.values() if count > 0)
        logger.info(
            "Motivated seller search: %d unique listings from %d/%d keywords with hits",
            len(listings_by_addr),
            keywords_with_hits,
            len(MOTIVATED_SELLER_KEYWORDS),
        )
        return list(listings_by_addr.values())

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
