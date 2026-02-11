"""
Property router for property search, details, and market data endpoints.

Extracted from main.py for cleaner architecture.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.schemas.property import (
    PropertySearchRequest,
    PropertyResponse,
)
from app.services.property_service import property_service
from app.services.search_history_service import search_history_service
from app.core.deps import OptionalUser, DbSession
from app.core.exceptions import PropertyNotFoundError, ExternalAPIError
from app.models.user import User

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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=e.message
        )
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
        logger.error(f"Property search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

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
        logger.error(f"Demo property error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


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
                detail="Property not found in cache. Please search for the property first."
            )
        
        return cached
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get property error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================
# PHOTOS
# ============================================

@router.get("/photos")
async def get_property_photos(
    zpid: Optional[str] = None,
    url: Optional[str] = None
):
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
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either zpid or url parameter is required"
            )
        
        logger.info(f"Fetching photos for zpid={zpid}, url={url}")
        
        result = await property_service.get_property_photos(zpid=zpid, url=url)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Photos fetch error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================
# MARKET DATA
# ============================================

@router.get("/market-data")
async def get_market_data(
    location: str = Query(..., description="City, State format (e.g., 'Delray Beach, FL')")
):
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
                detail=result.get("error", "Failed to fetch market data")
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Market data fetch error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/market/assumptions")
async def get_market_assumptions(
    zip_code: str = Query(..., description="ZIP code to get market-specific assumptions for")
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
        logger.error(f"Market assumptions error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================
# SIMILAR PROPERTIES
# ============================================

@router.get("/similar-rent")
async def get_similar_rent(
    zpid: Optional[str] = None,
    url: Optional[str] = None,
    address: Optional[str] = None,
    limit: int = Query(default=10, ge=1, le=50, description="Number of comps to return"),
    offset: int = Query(default=0, ge=0, description="Number of comps to skip"),
    exclude_zpids: Optional[str] = Query(default=None, description="Comma-separated zpids to exclude")
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
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of zpid, url, or address is required"
            )
        
        # Parse exclude_zpids into list
        exclude_list = []
        if exclude_zpids:
            exclude_list = [z.strip() for z in exclude_zpids.split(",") if z.strip()]
        
        logger.info(f"Similar rent request - zpid: {zpid}, address: {address}, limit: {limit}, offset: {offset}, exclude: {len(exclude_list)} zpids")
        
        result = await property_service.get_similar_rent(
            zpid=zpid, 
            url=url, 
            address=address,
            limit=limit,
            offset=offset,
            exclude_zpids=exclude_list
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar rent fetch error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/rentcast/rental-comps")
async def get_rentcast_rental_comps(
    zpid: Optional[str] = None,
    address: Optional[str] = None,
    limit: int = Query(default=10, ge=1, le=50, description="Number of comps to return"),
    offset: int = Query(default=0, ge=0, description="Number of comps to skip"),
    exclude_zpids: Optional[str] = Query(default=None, description="Comma-separated IDs to exclude"),
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
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RentCast rental comps fetch error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/similar-sold")
async def get_similar_sold(
    zpid: Optional[str] = None,
    url: Optional[str] = None,
    address: Optional[str] = None,
    limit: int = Query(default=10, ge=1, le=50, description="Number of comps to return"),
    offset: int = Query(default=0, ge=0, description="Number of comps to skip"),
    exclude_zpids: Optional[str] = Query(default=None, description="Comma-separated zpids to exclude")
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
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of zpid, url, or address is required"
            )
        
        # Parse exclude_zpids into list
        exclude_list = []
        if exclude_zpids:
            exclude_list = [z.strip() for z in exclude_zpids.split(",") if z.strip()]
        
        logger.info(f"Similar sold request - zpid: {zpid}, address: {address}, limit: {limit}, offset: {offset}, exclude: {len(exclude_list)} zpids")
        
        result = await property_service.get_similar_sold(
            zpid=zpid, 
            url=url, 
            address=address,
            limit=limit,
            offset=offset,
            exclude_zpids=exclude_list
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar sold fetch error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
