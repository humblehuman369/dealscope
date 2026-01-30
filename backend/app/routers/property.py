"""
Property router for property search, details, and market data endpoints.

Extracted from main.py for cleaner architecture.
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.schemas.property import (
    PropertySearchRequest,
    PropertyResponse,
)
from app.services.property_service import property_service
from app.core.exceptions import PropertyNotFoundError, ExternalAPIError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Properties"])


# ============================================
# PROPERTY SEARCH
# ============================================

@router.post("/properties/search", response_model=PropertyResponse)
async def search_property(request: PropertySearchRequest):
    """
    Search for a property by address.
    
    Fetches data from RentCast and AXESSO APIs, normalizes into unified schema.
    Returns property details, valuations, rental estimates, and data provenance.
    """
    try:
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
        
        result = await property_service.search_property(full_address)
        return result
        
    except ExternalAPIError as e:
        logger.error(f"External API error during property search: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Property search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
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
        if property_id not in property_service._property_cache:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found in cache. Please search for the property first."
            )
        
        return property_service._property_cache[property_id]["data"]
        
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
    address: Optional[str] = None
):
    """
    Get similar rental properties from Zillow via AXESSO API.
    
    Args:
        zpid: Zillow Property ID
        url: Property URL on Zillow
        address: Property address
    
    Returns:
        List of similar rental properties
    """
    try:
        if not zpid and not url and not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of zpid, url, or address is required"
            )
        
        logger.info(f"Similar rent request - zpid: {zpid}, address: {address}")
        
        result = await property_service.get_similar_rent(zpid=zpid, url=url, address=address)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar rent fetch error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/similar-sold")
async def get_similar_sold(
    zpid: Optional[str] = None,
    url: Optional[str] = None,
    address: Optional[str] = None
):
    """
    Get similar sold properties from Zillow via AXESSO API.
    
    Args:
        zpid: Zillow Property ID
        url: Property URL on Zillow
        address: Property address
    
    Returns:
        List of similar recently sold properties
    """
    try:
        if not zpid and not url and not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of zpid, url, or address is required"
            )
        
        logger.info(f"Similar sold request - zpid: {zpid}, address: {address}")
        
        result = await property_service.get_similar_sold(zpid=zpid, url=url, address=address)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar sold fetch error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
