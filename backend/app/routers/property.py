"""
Property router for property search, details, and market data endpoints.

Extracted from main.py for cleaner architecture.
"""

import hashlib
import logging
import re
from datetime import UTC, datetime, timedelta
from io import BytesIO

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession, OptionalUser
from app.core.exceptions import ExternalAPIError, SubscriptionLimitError
from app.models.saved_property import SavedProperty
from app.models.search_history import SearchHistory
from app.schemas.property import (
    MapSearchRequest,
    MapSearchResponse,
    PropertyResponse,
    PropertySearchRequest,
)
from app.services.billing_service import billing_service
from app.services.cache_service import get_cache_service
from app.services.property_export_service import generate_property_data_report_excel
from app.services.property_service import property_service
from app.services.resilience import CircuitOpenError
from app.services.search_history_service import search_history_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Properties"])


async def _user_has_cached_property_access(db: DbSession, user_id, property_id: str) -> bool:
    """Allow cached-property reads only for users who searched or saved it."""
    saved_result = await db.execute(
        select(SavedProperty.id)
        .where(SavedProperty.user_id == user_id, SavedProperty.external_property_id == property_id)
        .limit(1)
    )
    if saved_result.scalar_one_or_none() is not None:
        return True

    search_result = await db.execute(
        select(SearchHistory.id)
        .where(SearchHistory.user_id == user_id, SearchHistory.property_cache_id == property_id)
        .limit(1)
    )
    return search_result.scalar_one_or_none() is not None


def _normalize_address_part(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def _build_full_address(request: PropertySearchRequest) -> str:
    """
    Build a consistent full address from request data.
    If `address` already appears fully formatted, trust it to avoid duplicate city/state/zip.
    """
    base = _normalize_address_part(request.address)
    if not base:
        return ""

    # Most validated Google addresses arrive as full "street, city, ST ZIP".
    if "," in base:
        return base

    city = _normalize_address_part(request.city)
    state = _normalize_address_part(request.state)
    zip_code = _normalize_address_part(request.zip_code)
    state_zip = " ".join([part for part in [state, zip_code] if part])

    extra_parts = [part for part in [city, state_zip] if part]
    return ", ".join([base, *extra_parts]) if extra_parts else base


# ============================================
# PROPERTY SEARCH
# ============================================
# Server-side analysis metering
#
# The monthly analysis limit is enforced HERE (not by the client calling
# /usage/record-analysis). Semantics: one analysis = one distinct property.
# Re-searching an address the user already analyzed this month is free, so
# refreshes and Verdict <-> Strategy navigation never burn quota.


def _client_ip(request: Request) -> str:
    """Best-effort client IP extraction behind proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _address_fingerprint(full_address: str) -> str:
    normalized = re.sub(r"[^a-z0-9]", "", full_address.lower())
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


async def _has_recent_successful_search(db: DbSession, user_id, full_address: str) -> bool:
    """True when the user already successfully analyzed this address in the last 30 days."""
    window_start = datetime.now(UTC) - timedelta(days=30)
    result = await db.execute(
        select(SearchHistory.id)
        .where(
            SearchHistory.user_id == user_id,
            SearchHistory.search_query == full_address,
            SearchHistory.was_successful.is_(True),
            SearchHistory.searched_at >= window_start,
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


def _analysis_limit_http_error(e: SubscriptionLimitError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": e.code,
            "message": f"You've used all {e.limit} free analyses this month. Upgrade to Pro for unlimited.",
            "limit_type": e.limit_type,
            "current": e.current,
            "limit": e.limit,
            "tier_required": e.tier_required,
        },
    )


async def _check_anonymous_quota(http_request: Request, full_address: str) -> tuple[str, str, bool]:
    """Enforce the per-IP daily cap for signed-out users.

    Returns ``(counter_key, marker_key, is_repeat)``; raises 403 when exhausted.
    Repeat views of an already-analyzed address never consume quota.
    """
    cache = get_cache_service()
    ip = _client_ip(http_request)
    today = datetime.now(UTC).strftime("%Y%m%d")
    counter_key = f"anon_quota:{ip}:{today}"
    marker_key = f"anon_seen:{ip}:{_address_fingerprint(full_address)}"

    if await cache.exists(marker_key):
        return counter_key, marker_key, True

    limit = settings.ANON_ANALYSES_PER_DAY
    used = await cache.get(counter_key) or 0
    if int(used) >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ANONYMOUS_LIMIT_REACHED",
                "message": (
                    f"You've used today's {limit} free analyses. "
                    "Create a free account to keep analyzing properties."
                ),
                "limit_type": "anonymous_analyses",
                "current": int(used),
                "limit": limit,
                "tier_required": "free",
            },
        )
    return counter_key, marker_key, False


async def _record_anonymous_analysis(counter_key: str, marker_key: str) -> None:
    """Count one anonymous analysis after a successful fetch (24h windows)."""
    cache = get_cache_service()
    used = await cache.get(counter_key) or 0
    await cache.set(counter_key, int(used) + 1, ttl_seconds=86400)
    await cache.set(marker_key, 1, ttl_seconds=86400)


@router.post("/properties/search", response_model=PropertyResponse)
async def search_property(
    request: PropertySearchRequest,
    http_request: Request,
    db: DbSession,
    current_user: OptionalUser = None,
):
    """
    Search for a property by address.

    Fetches data from RentCast and AXESSO APIs, normalizes into unified schema.
    Returns property details, valuations, rental estimates, and data provenance.
    Automatically records the search in the user's search history when authenticated.

    Usage limits are enforced server-side: free-tier users get
    ``searches_per_month`` distinct properties per month; anonymous users get
    ``ANON_ANALYSES_PER_DAY`` distinct properties per IP per day. Returns 403
    with a structured detail payload when the limit is reached.
    """
    full_address = _build_full_address(request)
    search_source = request.search_source or "web"

    # --- Pre-flight metering (cheap checks before the expensive fetch) ---
    is_repeat = False
    anon_counter_key: str | None = None
    anon_marker_key: str | None = None
    if current_user:
        is_repeat = await _has_recent_successful_search(db, current_user.id, full_address)
        if not is_repeat:
            try:
                await billing_service.check_analysis_allowance(db, current_user.id)
            except SubscriptionLimitError as e:
                raise _analysis_limit_http_error(e)
    else:
        anon_counter_key, anon_marker_key, is_repeat = await _check_anonymous_quota(http_request, full_address)

    logger.info(f"Searching for property: {full_address}")

    try:
        result = await property_service.search_property(full_address, zpid=request.zpid)
    except (ExternalAPIError, CircuitOpenError) as e:
        # Record failed search for authenticated users
        if current_user:
            try:
                await search_history_service.record_search(
                    db=db,
                    user_id=str(current_user.id),
                    search_query=full_address,
                    address_parts={
                        "street": request.address,
                        "city": request.city,
                        "state": request.state,
                        "zip": request.zip_code,
                    },
                    search_source=search_source,
                    was_successful=False,
                    error_message=getattr(e, "message", str(e)),
                )
            except Exception as rec_err:
                logger.error(f"Failed to record search history: {rec_err}", exc_info=True)

        if isinstance(e, CircuitOpenError):
            friendly_message = (
                "Data providers are temporarily unavailable. Please try again in a few minutes."
            )
            logger.warning("Property search failed due to circuit breaker: %s", full_address)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=friendly_message)

        logger.error(f"External API error during property search: {e.message}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=e.message)
    except Exception as e:
        # Record failed search for authenticated users
        if current_user:
            try:
                await search_history_service.record_search(
                    db=db,
                    user_id=str(current_user.id),
                    search_query=full_address,
                    address_parts={
                        "street": request.address,
                        "city": request.city,
                        "state": request.state,
                        "zip": request.zip_code,
                    },
                    search_source=search_source,
                    was_successful=False,
                    error_message=str(e),
                )
            except Exception as rec_err:
                logger.error(f"Failed to record search history: {rec_err}", exc_info=True)
        # Always log the full traceback — `str(e)` alone strips the call site
        # and the wrapping HTTPException prevents Starlette from logging it.
        logger.exception("Property search error for %s: %s", full_address, e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Record successful search for authenticated users
    if current_user:
        try:
            addr = result.address
            details = result.details
            valuations = result.valuations
            rentals = result.rentals

            await search_history_service.record_search(
                db=db,
                user_id=str(current_user.id),
                search_query=full_address,
                property_cache_id=result.property_id,
                zpid=result.zpid,
                address_parts={
                    "street": addr.street if addr else request.address,
                    "city": addr.city if addr else request.city,
                    "state": addr.state if addr else request.state,
                    "zip": addr.zip_code if addr else request.zip_code,
                },
                result_summary={
                    "property_type": details.property_type if details else None,
                    "bedrooms": details.bedrooms if details else None,
                    "bathrooms": details.bathrooms if details else None,
                    "square_footage": details.square_footage if details else None,
                    "estimated_value": (valuations.zestimate or valuations.current_value_avm) if valuations else None,
                    "rent_estimate": rentals.monthly_rent_ltr if rentals else None,
                },
                search_source=search_source,
                was_successful=True,
            )
            logger.info(f"Search history recorded for user {current_user.id}")
        except Exception as rec_err:
            logger.error(f"Failed to record search history: {rec_err}", exc_info=True)

        # Count the analysis only after a successful fetch of a new property.
        if not is_repeat:
            try:
                await billing_service.record_analysis(db, current_user.id, property_address=full_address)
            except SubscriptionLimitError:
                # Lost a pre-flight race; the data was already fetched, so serve it.
                logger.warning("Analysis limit race for user %s on %s", current_user.id, full_address)
            except Exception as usage_err:
                logger.error(f"Failed to record analysis usage: {usage_err}", exc_info=True)
    else:
        logger.debug("Search history not recorded: no authenticated user")
        if not is_repeat and anon_counter_key and anon_marker_key:
            try:
                await _record_anonymous_analysis(anon_counter_key, anon_marker_key)
            except Exception as anon_err:
                logger.warning("Failed to record anonymous analysis quota: %s", anon_err)

    return result


@router.post(
    "/properties/export-report",
    summary="Report of data received from RentCast and AXESSO for a property",
)
async def export_property_data_report(request: PropertySearchRequest, current_user: CurrentUser):
    """
    Generate one Excel report with two sheets:
    - **RentCast** — all data we receive from RentCast for this property.
    - **AXESSO** — all data we receive from AXESSO/Zillow for this property.

    Request body: same as property search (address, optional city, state, zip_code).
    Returns a single .xlsx file. Requires authentication (triggers a full
    RentCast + AXESSO fetch pipeline).
    """
    full_address = _build_full_address(request)
    logger.info(f"Property data report requested for: {full_address}")
    try:
        export_data = await property_service.get_property_export_data(full_address)
        report_bytes = generate_property_data_report_excel(export_data)
    except Exception as e:
        logger.exception("Property export report failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {e!s}",
        )
    street_slug = (request.address or "property").replace(" ", "_").replace(",", "")[:40]
    filename = f"Property_Data_Report_{street_slug}_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.xlsx"
    return StreamingResponse(
        BytesIO(report_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/properties/demo/sample", response_model=PropertyResponse)
async def get_demo_property():
    """
    Get sample/demo property data.

    Returns the Palm Beach County sample property from the Excel workbook
    for testing and demonstration purposes.
    """
    try:
        return property_service.get_mock_property()
    except Exception as e:
        logger.error(f"Demo property error: {e!s}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/properties/search-area", response_model=MapSearchResponse)
async def search_property_area(
    request: MapSearchRequest,
    current_user: OptionalUser = None,
):
    """
    Map viewport / polygon listing search. Open to anonymous users so the
    map is a top-of-funnel discovery surface; API costs are controlled by
    the viewport-keyed Redis cache (10-min TTL) and the per-IP anonymous
    quota on the property-analysis endpoint downstream.

    Registered on the property router (before ``/properties/{property_id}``)
    so POST is not shadowed by the dynamic GET path when the map-search
    router fails to load or an older deployment omits it.
    """
    from app.routers.map_search import run_map_search

    return await run_map_search(request)


@router.get("/properties/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str, current_user: CurrentUser, db: DbSession):
    """
    Get cached property data by ID.
    """
    try:
        if not await _user_has_cached_property_access(db, current_user.id, property_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

        cached = await property_service.get_cached_property(property_id)
        if not cached:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found in cache. Please search for the property first.",
            )

        return cached

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get property error: {e!s}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ============================================
# PHOTOS
# ============================================


@router.get("/photos")
async def get_property_photos(zpid: str | None = None, url: str | None = None, property_id: str | None = None):
    """
    Get property photos from Zillow via AXESSO API.

    Args:
        zpid: Zillow Property ID
        url: Property URL on Zillow

    Returns:
        List of photo URLs for the property
    """
    try:
        resolved_zpid = zpid
        resolved_url = url

        if property_id:
            cached = await property_service.get_cached_property(property_id)
            if cached and cached.zpid:
                resolved_zpid = cached.zpid
                resolved_url = None

        if not resolved_zpid and not resolved_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either property_id with cached zpid, zpid, or url parameter is required",
            )

        logger.info(f"Fetching photos for property_id={property_id}, zpid={resolved_zpid}, url={resolved_url}")

        result = await property_service.get_property_photos(zpid=resolved_zpid, url=resolved_url)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Photos fetch error: {e!s}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ============================================
# MARKET DATA
# ============================================


@router.get("/market-data")
async def get_market_data(
    current_user: CurrentUser,
    location: str = Query(..., description="City, State format (e.g., 'Delray Beach, FL')"),
):
    """
    Get rental market data from Zillow via AXESSO API. Requires authentication
    (proxies a paid external API; UI only calls this from auth-gated worksheets).

    Args:
        location: City, State format (e.g., "Delray Beach, FL")

    Returns:
        Market data including median rent, trends, temperature, etc.
    """
    try:
        logger.info(f"Market data request for location: {location}")

        result = await property_service.get_market_data(location=location)

        if result.get("success"):
            return result.get("data", {})
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to fetch market data"),
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Market data fetch error: {e!s}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/market/assumptions")
async def get_market_assumptions(
    zip_code: str = Query(..., description="ZIP code to get market-specific assumptions for"),
):
    """
    Get market-specific default assumptions based on zip code.

    Returns adjustment factors for:
    - Property tax rate (varies by state/county)
    - Insurance rate (higher in coastal/disaster-prone areas)
    - Rent-to-price ratio (for estimating rent from property value)
    - Appreciation rate (market-specific growth expectations)
    - Vacancy rate (local market conditions)

    These values help the mobile app provide more accurate initial estimates
    without requiring users to research local market data.
    """
    try:
        from app.services.assumptions_service import get_market_adjustments

        adjustments = get_market_adjustments(zip_code)
        return {
            "success": True,
            "data": adjustments,
        }
    except Exception as e:
        logger.error(f"Market assumptions error: {e!s}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ============================================
# SIMILAR PROPERTIES
# ============================================


@router.get("/similar-rent")
async def get_similar_rent(
    current_user: CurrentUser,
    zpid: str | None = None,
    url: str | None = None,
    address: str | None = None,
    limit: int = Query(default=10, ge=1, le=50, description="Number of comps to return"),
    offset: int = Query(default=0, ge=0, description="Number of comps to skip"),
    exclude_zpids: str | None = Query(default=None, description="Comma-separated zpids to exclude"),
    subject_lat: float | None = Query(default=None, description="Subject property latitude for distance calculation"),
    subject_lon: float | None = Query(default=None, description="Subject property longitude for distance calculation"),
):
    """
    Get similar rental properties from Zillow via AXESSO API.

    Args:
        zpid: Zillow Property ID
        url: Property URL on Zillow
        address: Property address
        limit: Number of comps to return (1-50, default 10)
        offset: Number of comps to skip for pagination
        exclude_zpids: Comma-separated list of zpids to exclude from results
        subject_lat: Subject property latitude for computing distance to each comp
        subject_lon: Subject property longitude for computing distance to each comp

    Returns:
        List of similar rental properties with pagination metadata
    """
    try:
        if not zpid and not url and not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="At least one of zpid, url, or address is required"
            )

        # Parse exclude_zpids into list
        exclude_list = []
        if exclude_zpids:
            exclude_list = [z.strip() for z in exclude_zpids.split(",") if z.strip()]

        logger.info(
            f"Similar rent request - zpid: {zpid}, address: {address}, limit: {limit}, offset: {offset}, exclude: {len(exclude_list)} zpids"
        )

        result = await property_service.get_similar_rent(
            zpid=zpid,
            url=url,
            address=address,
            limit=limit,
            offset=offset,
            exclude_zpids=exclude_list,
            subject_lat=subject_lat,
            subject_lon=subject_lon,
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar rent fetch error: {e!s}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/rentcast/rental-comps")
async def get_rentcast_rental_comps(
    current_user: CurrentUser,
    zpid: str | None = None,
    address: str | None = None,
    limit: int = Query(default=10, ge=1, le=50, description="Number of comps to return"),
    offset: int = Query(default=0, ge=0, description="Number of comps to skip"),
    exclude_zpids: str | None = Query(default=None, description="Comma-separated IDs to exclude"),
):
    """
    Get rental comps from RentCast.

    Accepts a direct address or zpid (resolved to an address before calling RentCast).
    """
    try:
        if not zpid and not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of zpid or address is required",
            )

        exclude_list = []
        if exclude_zpids:
            exclude_list = [z.strip() for z in exclude_zpids.split(",") if z.strip()]

        logger.info(
            "RentCast rental comps request - zpid: %s, address: %s, limit: %s, offset: %s, exclude: %s IDs",
            zpid,
            address,
            limit,
            offset,
            len(exclude_list),
        )

        result = await property_service.get_rentcast_rental_comps(
            zpid=zpid,
            address=address,
            limit=limit,
            offset=offset,
            exclude_zpids=exclude_list,
        )
        logger.info(
            "RentCast rental comps response",
            extra={
                "provider": "rentcast",
                "success": result.get("success", False),
                "returned_comp_count": len(result.get("results", []) or []),
                "total_available": result.get("total_available"),
                "offset": offset,
                "limit": limit,
            },
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RentCast rental comps fetch error: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/rentcast/sale-comps")
async def get_rentcast_sale_comps(
    current_user: CurrentUser,
    zpid: str | None = None,
    address: str | None = None,
    limit: int = Query(default=10, ge=1, le=50, description="Number of comps to return"),
    offset: int = Query(default=0, ge=0, description="Number of comps to skip"),
    exclude_zpids: str | None = Query(default=None, description="Comma-separated IDs to exclude"),
):
    """
    Get sale comps from RentCast.

    Fallback for AXESSO ``similar-sold`` when the upstream provider does not
    return ``lastSoldPrice``. RentCast's ``avm/value`` endpoint reliably
    surfaces sold-price data with distance, dates, and basic property attrs.
    """
    try:
        if not zpid and not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of zpid or address is required",
            )

        exclude_list = []
        if exclude_zpids:
            exclude_list = [z.strip() for z in exclude_zpids.split(",") if z.strip()]

        logger.info(
            "RentCast sale comps request - zpid: %s, address: %s, limit: %s, offset: %s, exclude: %s IDs",
            zpid,
            address,
            limit,
            offset,
            len(exclude_list),
        )

        result = await property_service.get_rentcast_sale_comps(
            zpid=zpid,
            address=address,
            limit=limit,
            offset=offset,
            exclude_zpids=exclude_list,
        )
        logger.info(
            "RentCast sale comps response",
            extra={
                "provider": "rentcast",
                "success": result.get("success", False),
                "returned_comp_count": len(result.get("results", []) or []),
                "total_available": result.get("total_available"),
                "offset": offset,
                "limit": limit,
            },
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RentCast sale comps fetch error: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/similar-sold")
async def get_similar_sold(
    current_user: CurrentUser,
    zpid: str | None = None,
    url: str | None = None,
    address: str | None = None,
    limit: int = Query(default=10, ge=1, le=50, description="Number of comps to return"),
    offset: int = Query(default=0, ge=0, description="Number of comps to skip"),
    exclude_zpids: str | None = Query(default=None, description="Comma-separated zpids to exclude"),
    subject_lat: float | None = Query(default=None, description="Subject property latitude for distance calculation"),
    subject_lon: float | None = Query(default=None, description="Subject property longitude for distance calculation"),
):
    """
    Get similar sold properties from Zillow via AXESSO API.

    Args:
        zpid: Zillow Property ID
        url: Property URL on Zillow
        address: Property address
        limit: Number of comps to return (1-50, default 10)
        offset: Number of comps to skip for pagination
        exclude_zpids: Comma-separated list of zpids to exclude from results
        subject_lat: Subject property latitude for computing distance to each comp
        subject_lon: Subject property longitude for computing distance to each comp

    Returns:
        List of similar recently sold properties with pagination metadata
    """
    try:
        if not zpid and not url and not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="At least one of zpid, url, or address is required"
            )

        # Parse exclude_zpids into list
        exclude_list = []
        if exclude_zpids:
            exclude_list = [z.strip() for z in exclude_zpids.split(",") if z.strip()]

        logger.info(
            f"Similar sold request - zpid: {zpid}, address: {address}, limit: {limit}, offset: {offset}, exclude: {len(exclude_list)} zpids"
        )

        result = await property_service.get_similar_sold(
            zpid=zpid,
            url=url,
            address=address,
            limit=limit,
            offset=offset,
            exclude_zpids=exclude_list,
            subject_lat=subject_lat,
            subject_lon=subject_lon,
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar sold fetch error: {e!s}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
