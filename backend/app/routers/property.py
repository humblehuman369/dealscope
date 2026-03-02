"""
Property router for property search, details, and market data endpoints.

Extracted from main.py for cleaner architecture.
"""

import logging
from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.core.deps import DbSession, OptionalUser
from app.core.exceptions import ExternalAPIError
from app.schemas.property import (
    PropertyResponse,
    PropertySearchRequest,
)
from app.services.property_export_service import generate_property_data_report_excel
from app.services.property_service import property_service
from app.services.search_history_service import search_history_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Properties"])


# ============================================
# PROPERTY SEARCH
# ============================================


@router.post("/properties/search", response_model=PropertyResponse)
async def search_property(
    request: PropertySearchRequest,
    db: DbSession,
    current_user: OptionalUser = None,
):
    """
    Search for a property by address.

    Fetches data from RentCast and AXESSO APIs, normalizes into unified schema.
    Returns property details, valuations, rental estimates, and data provenance.
    Automatically records the search in the user's search history when authenticated.
    """
    # Build full address
    address_parts = [request.address]
    if request.city:
        address_parts.append(request.city)
    if request.state:
        address_parts.append(request.state)
    if request.zip_code:
        address_parts.append(request.zip_code)

    full_address = ", ".join(address_parts)

    logger.info(f"Searching for property: {full_address}")

    try:
        result = await property_service.search_property(full_address)
    except ExternalAPIError as e:
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
                    search_source="web",
                    was_successful=False,
                    error_message=e.message,
                )
            except Exception as rec_err:
                logger.error(f"Failed to record search history: {rec_err}", exc_info=True)
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
                    search_source="web",
                    was_successful=False,
                    error_message=str(e),
                )
            except Exception as rec_err:
                logger.error(f"Failed to record search history: {rec_err}", exc_info=True)
        logger.error(f"Property search error: {e!s}")
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
                search_source="web",
                was_successful=True,
            )
            logger.info(f"Search history recorded for user {current_user.id}")
        except Exception as rec_err:
            logger.error(f"Failed to record search history: {rec_err}", exc_info=True)
    else:
        logger.debug("Search history not recorded: no authenticated user")

    return result


@router.post(
    "/properties/export-report",
    summary="Report of data received from RentCast and AXESSO for a property",
)
async def export_property_data_report(request: PropertySearchRequest):
    """
    Generate one Excel report with two sheets:
    - **RentCast** — all data we receive from RentCast for this property.
    - **AXESSO** — all data we receive from AXESSO/Zillow for this property.

    Request body: same as property search (address, optional city, state, zip_code).
    Returns a single .xlsx file.
    """
    address_parts = [request.address]
    if request.city:
        address_parts.append(request.city)
    if request.state:
        address_parts.append(request.state)
    if request.zip_code:
        address_parts.append(request.zip_code)
    full_address = ", ".join(address_parts)
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


@router.get("/properties/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    """
    Get cached property data by ID.
    """
    try:
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
async def get_property_photos(zpid: str | None = None, url: str | None = None):
    """
    Get property photos from Zillow via AXESSO API.

    Args:
        zpid: Zillow Property ID
        url: Property URL on Zillow

    Returns:
        List of photo URLs for the property
    """
    try:
        if not zpid and not url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Either zpid or url parameter is required"
            )

        logger.info(f"Fetching photos for zpid={zpid}, url={url}")

        result = await property_service.get_property_photos(zpid=zpid, url=url)
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
async def get_market_data(location: str = Query(..., description="City, State format (e.g., 'Delray Beach, FL')")):
    """
    Get rental market data from Zillow via AXESSO API.

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
    zpid: str | None = None,
    url: str | None = None,
    address: str | None = None,
    limit: int = Query(default=10, ge=1, le=50, description="Number of comps to return"),
    offset: int = Query(default=0, ge=0, description="Number of comps to skip"),
    exclude_zpids: str | None = Query(default=None, description="Comma-separated zpids to exclude"),
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
            zpid=zpid, url=url, address=address, limit=limit, offset=offset, exclude_zpids=exclude_list
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar rent fetch error: {e!s}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/rentcast/rental-comps")
async def get_rentcast_rental_comps(
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


@router.get("/similar-sold")
async def get_similar_sold(
    zpid: str | None = None,
    url: str | None = None,
    address: str | None = None,
    limit: int = Query(default=10, ge=1, le=50, description="Number of comps to return"),
    offset: int = Query(default=0, ge=0, description="Number of comps to skip"),
    exclude_zpids: str | None = Query(default=None, description="Comma-separated zpids to exclude"),
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
            zpid=zpid, url=url, address=address, limit=limit, offset=offset, exclude_zpids=exclude_list
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar sold fetch error: {e!s}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
