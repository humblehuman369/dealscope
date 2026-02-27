"""
AXESSO Zillow API Client - Comprehensive Implementation

This module provides access to all Zillow data endpoints via the AXESSO API,
including property details, valuations, market data, comparables, and more.

AXESSO API Documentation: https://axesso.developer.azure-api.net/api-details#api=zillow-api

Authentication: Uses 'axesso-api-key' header (NOT Ocp-Apim-Subscription-Key)
Base URL: https://api.axesso.de/zil

Uses BaseAPIClient for shared request logic including:
- Retry with exponential backoff
- Rate limit handling
- Circuit breaker pattern
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from app.services.base_client import BaseAPIClient

logger = logging.getLogger(__name__)


class ZillowEndpoint(StrEnum):
    """Available AXESSO Zillow API endpoints."""

    SEARCH_BY_ADDRESS = "search-by-address"
    PROPERTY_V2 = "property-v2"
    PRICE_TAX_HISTORY = "price-tax-history"
    ZESTIMATE_HISTORY = "zestimate-history"
    RENT_ESTIMATE = "rent-estimate"
    SIMILAR_PROPERTIES = "similar-properties"
    SIMILAR_RENT = "similar-rent"
    SIMILAR_SOLD = "similar-sold"
    MARKET_DATA = "market-data"
    SCHOOLS = "schools"
    ACCESSIBILITY_SCORES = "accessibility-scores"
    PHOTOS = "photos"
    SEARCH = "search"
    SEARCH_BY_COORDINATES = "search-by-coordinates"
    SEARCH_BY_URL = "search-by-url"


@dataclass
class ZillowAPIResponse:
    """Standardized response wrapper for Zillow API calls."""

    success: bool
    endpoint: ZillowEndpoint
    data: dict[str, Any] | None
    error: str | None
    status_code: int | None
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    raw_response: dict[str, Any] | None = None
    zpid: str | None = None


class ZillowClient(BaseAPIClient["ZillowAPIResponse"]):
    """
    Comprehensive Zillow data client via AXESSO API.

    Extends BaseAPIClient with Zillow-specific response handling.

    Endpoints available:
    - search-by-address: Find property by address, returns zpid
    - property-v2: Full property details using zpid or url
    - price-tax-history: Historical price and tax data
    - zestimate-history: Zestimate value history
    - rent-estimate: Rental value estimate
    - similar-properties: Similar for-sale properties
    - similar-rent: Similar rental properties
    - similar-sold: Similar recently sold properties
    - market-data: Local market statistics
    - schools: Nearby schools
    - accessibility-scores: Walk/transit/bike scores
    - photos: Property photos
    - search: Search properties by location with filters
    """

    def __init__(self, api_key: str, base_url: str = "https://api.axesso.de/zil"):
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            timeout=15.0,
            connect_timeout=5.0,
            max_retries=3,
            enable_circuit_breaker=True,
        )

    def _get_headers(self) -> dict[str, str]:
        """Get authenticated headers for AXESSO API."""
        return {"axesso-api-key": self.api_key, "Accept": "application/json", "Content-Type": "application/json"}

    def _create_response(
        self,
        success: bool,
        data: dict[str, Any] | None,
        error: str | None,
        status_code: int | None,
        raw_response: dict[str, Any] | None = None,
        zillow_endpoint: ZillowEndpoint | None = None,
        **kwargs,
    ) -> "ZillowAPIResponse":
        """Create Zillow-specific response."""
        # Extract zpid if present
        zpid = None
        if isinstance(data, dict):
            zpid = data.get("zpid") or data.get("zillow_id")

        return ZillowAPIResponse(
            success=success,
            endpoint=zillow_endpoint or ZillowEndpoint.PROPERTY_V2,
            data=data,
            error=error,
            status_code=status_code,
            raw_response=raw_response,
            zpid=zpid,
        )

    def _get_provider_name(self) -> str:
        """Return provider name for logging."""
        return "AXESSO/Zillow"

    async def _make_zillow_request(
        self, endpoint: ZillowEndpoint, params: dict[str, Any] | None = None
    ) -> ZillowAPIResponse:
        """Make authenticated request to AXESSO Zillow API."""
        # Use base class _make_request with endpoint value as URL path.
        # Pass the ZillowEndpoint enum via response_kwargs so _create_response receives it.
        return await super()._make_request(
            endpoint=endpoint.value,
            params=params,
            zillow_endpoint=endpoint,
        )

    # =========================================================================
    # PROPERTY LOOKUP METHODS
    # =========================================================================

    async def search_by_address(self, address: str) -> ZillowAPIResponse:
        """
        Search for a property by address. Returns zpid for further lookups.

        This is the PRIMARY entry point - use this first to get the zpid,
        then use other endpoints with the zpid for detailed data.

        Args:
            address: Full property address (e.g., "953 Banyan Dr, Delray Beach, FL 33483")

        Returns:
            ZillowAPIResponse with zpid and basic property info
        """
        return await self._make_zillow_request(ZillowEndpoint.SEARCH_BY_ADDRESS, {"address": address})

    async def get_property_details(self, zpid: str | None = None, url: str | None = None) -> ZillowAPIResponse:
        """
        Get comprehensive property details.

        Args:
            zpid: Zillow Property ID (preferred)
            url: Zillow property URL (alternative)

        Returns:
            Complete property data including:
            - Property attributes (beds, baths, sqft, etc.)
            - Zestimate and rent Zestimate
            - Tax information
            - Property history
            - Neighborhood data
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url

        return await self._make_zillow_request(ZillowEndpoint.PROPERTY_V2, params)

    # =========================================================================
    # VALUATION METHODS
    # =========================================================================

    async def get_price_tax_history(self, zpid: str | None = None, url: str | None = None) -> ZillowAPIResponse:
        """
        Get historical price and tax data for a property.

        Returns:
            - Price history (all recorded sales)
            - Tax history (annual assessments)
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url

        return await self._make_zillow_request(ZillowEndpoint.PRICE_TAX_HISTORY, params)

    async def get_zestimate_history(self, zpid: str | None = None, url: str | None = None) -> ZillowAPIResponse:
        """
        Get Zestimate value history.

        Returns:
            Historical Zestimate values over time for trend analysis.
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url

        return await self._make_zillow_request(ZillowEndpoint.ZESTIMATE_HISTORY, params)

    async def get_rent_estimate(
        self,
        zpid: str | None = None,
        url: str | None = None,
        address: str | None = None,
        bedrooms: int | None = None,
        bathrooms: float | None = None,
        sqft: int | None = None,
        property_type: str | None = None,
    ) -> ZillowAPIResponse:
        """
        Get rent Zestimate (rental value estimate).

        Can use either zpid/url OR provide property characteristics.
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url
        if address:
            params["address"] = address
        if bedrooms:
            params["bedrooms"] = bedrooms
        if bathrooms:
            params["bathrooms"] = bathrooms
        if sqft:
            params["sqft"] = sqft
        if property_type:
            params["propertyType"] = property_type

        return await self._make_zillow_request(ZillowEndpoint.RENT_ESTIMATE, params)

    # =========================================================================
    # COMPARABLE PROPERTIES METHODS
    # =========================================================================

    async def get_similar_for_sale(
        self, zpid: str | None = None, url: str | None = None, address: str | None = None
    ) -> ZillowAPIResponse:
        """
        Get similar properties currently for sale.

        Excellent for market analysis and identifying comparable investments.
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url
        if address:
            params["address"] = address

        return await self._make_zillow_request(ZillowEndpoint.SIMILAR_PROPERTIES, params)

    async def get_similar_rentals(
        self, zpid: str | None = None, url: str | None = None, address: str | None = None
    ) -> ZillowAPIResponse:
        """
        Get similar properties currently for rent.

        Critical for rental income analysis and market rate validation.
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url
        if address:
            params["address"] = address

        return await self._make_zillow_request(ZillowEndpoint.SIMILAR_RENT, params)

    async def get_similar_rent(
        self, zpid: str | None = None, url: str | None = None, address: str | None = None
    ) -> ZillowAPIResponse:
        """Backward-compatible wrapper for similar rentals."""
        return await self.get_similar_rentals(zpid=zpid, url=url, address=address)

    async def get_similar_sold(
        self, zpid: str | None = None, url: str | None = None, address: str | None = None
    ) -> ZillowAPIResponse:
        """
        Get similar properties that recently sold.

        Essential for ARV (After Repair Value) analysis and comp validation.
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url
        if address:
            params["address"] = address

        return await self._make_zillow_request(ZillowEndpoint.SIMILAR_SOLD, params)

    # =========================================================================
    # MARKET & NEIGHBORHOOD METHODS
    # =========================================================================

    async def get_market_data(self, location: str) -> ZillowAPIResponse:
        """
        Get market statistics for a location.

        Args:
            location: City, zip code, or neighborhood name

        Returns:
            Market trends, median values, inventory levels, etc.
        """
        return await self._make_zillow_request(ZillowEndpoint.MARKET_DATA, {"location": location})

    async def get_nearby_schools(self, zpid: str | None = None, url: str | None = None) -> ZillowAPIResponse:
        """
        Get nearby schools with ratings.

        Important for family rental properties and resale value.
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url

        return await self._make_zillow_request(ZillowEndpoint.SCHOOLS, params)

    async def get_accessibility_scores(self, zpid: str | None = None, url: str | None = None) -> ZillowAPIResponse:
        """
        Get walk score, transit score, and bike score.

        Higher scores correlate with rental demand in urban areas.
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url

        return await self._make_zillow_request(ZillowEndpoint.ACCESSIBILITY_SCORES, params)

    async def get_photos(self, zpid: str | None = None, url: str | None = None) -> ZillowAPIResponse:
        """
        Get property photos using the dedicated /photos endpoint.

        Args:
            zpid: Zillow Property ID
            url: Zillow property URL

        Returns:
            ZillowAPIResponse with photos data
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url

        # Use the dedicated photos endpoint
        return await self._make_zillow_request(ZillowEndpoint.PHOTOS, params)

    # =========================================================================
    # SEARCH METHODS
    # =========================================================================

    async def search_properties(
        self,
        location: str,
        status: str = "forSale",
        listing_type: str | None = None,
        beds_min: int | None = None,
        beds_max: int | None = None,
        baths_min: float | None = None,
        baths_max: float | None = None,
        price_min: int | None = None,
        price_max: int | None = None,
        sqft_min: int | None = None,
        sqft_max: int | None = None,
        property_types: list[str] | None = None,
        page: int = 1,
        **kwargs,
    ) -> ZillowAPIResponse:
        """
        Search properties with filters.

        Args:
            location: City, zip, or neighborhood
            status: forSale, forRent, recentlySold
            listing_type: various listing filters
            beds_min/max: Bedroom range
            baths_min/max: Bathroom range
            price_min/max: Price range
            sqft_min/max: Size range
            property_types: List of property types
            page: Page number for pagination
        """
        params = {"location": location, "status": status, "page": page}

        if beds_min:
            params["beds_min"] = beds_min
        if beds_max:
            params["beds_max"] = beds_max
        if baths_min:
            params["baths_min"] = baths_min
        if baths_max:
            params["baths_max"] = baths_max
        if price_min:
            params["price_min"] = price_min
        if price_max:
            params["price_max"] = price_max
        if sqft_min:
            params["sqft_min"] = sqft_min
        if sqft_max:
            params["sqft_max"] = sqft_max
        if listing_type:
            params["listing_type"] = listing_type

        # Property type flags
        if property_types:
            for pt in property_types:
                if pt.lower() == "single family":
                    params["isSingleFamily"] = True
                elif pt.lower() == "condo":
                    params["isCondo"] = True
                elif pt.lower() == "townhouse":
                    params["isTownhouse"] = True
                elif pt.lower() == "multi-family":
                    params["isMultiFamily"] = True

        # Additional filters from kwargs
        params.update(kwargs)

        return await self._make_zillow_request(ZillowEndpoint.SEARCH, params)

    async def search_by_coordinates(
        self, lat: float, lng: float, radius_miles: float = 1.0, **kwargs
    ) -> ZillowAPIResponse:
        """
        Search properties by geographic coordinates.

        Args:
            lat: Latitude
            lng: Longitude
            radius_miles: Search radius
            **kwargs: Additional filters
        """
        params = {"lat": lat, "long": lng, "d": radius_miles}
        params.update(kwargs)

        return await self._make_zillow_request(ZillowEndpoint.SEARCH_BY_COORDINATES, params)

    # =========================================================================
    # COMPREHENSIVE DATA FETCH
    # =========================================================================

    async def get_complete_property_data(
        self, address: str, include_photos: bool = False
    ) -> dict[str, ZillowAPIResponse]:
        """
        Fetch ALL available data for a property in one call.

        This is the recommended method for comprehensive analysis.

        Workflow:
        1. Search by address to get zpid
        2. Fetch all data endpoints in parallel using zpid

        Args:
            address: Full property address
            include_photos: Whether to fetch photos (larger response)

        Returns:
            Dict with all endpoint responses keyed by endpoint name
        """
        results = {}

        # Step 1: Get zpid via address search
        search_result = await self.search_by_address(address)
        results["search"] = search_result

        if not search_result.success or not search_result.data:
            logger.warning(f"Property not found in Zillow: {address}")
            return results

        # Extract zpid
        zpid = None
        if isinstance(search_result.data, dict):
            zpid = search_result.data.get("zpid")
        elif isinstance(search_result.data, list) and len(search_result.data) > 0:
            zpid = search_result.data[0].get("zpid")

        if not zpid:
            # Try alternative extraction
            zpid = search_result.zpid

        if not zpid:
            logger.warning("Could not extract zpid from search results")
            return results

        results["zpid"] = zpid

        # Step 2: Fetch all data in parallel
        tasks = [
            ("property_details", self.get_property_details(zpid=zpid)),
            ("price_tax_history", self.get_price_tax_history(zpid=zpid)),
            ("zestimate_history", self.get_zestimate_history(zpid=zpid)),
            ("rent_estimate", self.get_rent_estimate(zpid=zpid)),
            ("similar_for_sale", self.get_similar_for_sale(zpid=zpid)),
            ("similar_rentals", self.get_similar_rentals(zpid=zpid)),
            ("similar_sold", self.get_similar_sold(zpid=zpid)),
            ("schools", self.get_nearby_schools(zpid=zpid)),
            ("accessibility_scores", self.get_accessibility_scores(zpid=zpid)),
        ]

        if include_photos:
            tasks.append(("photos", self.get_photos(zpid=zpid)))

        # Execute all in parallel
        task_names = [t[0] for t in tasks]
        task_coros = [t[1] for t in tasks]

        responses = await asyncio.gather(*task_coros, return_exceptions=True)

        for name, response in zip(task_names, responses, strict=False):
            if isinstance(response, Exception):
                results[name] = ZillowAPIResponse(
                    success=False, endpoint=ZillowEndpoint.PROPERTY_V2, data=None, error=str(response), status_code=None
                )
            else:
                results[name] = response

        # Also get market data for the location
        # Extract city/zip from address
        parts = address.split(",")
        if len(parts) >= 2:
            location = parts[1].strip()  # City
            market_result = await self.get_market_data(location)
            results["market_data"] = market_result

        return results


class ZillowDataExtractor:
    """
    Utility class to extract and normalize data from Zillow API responses.

    Maps Zillow response fields to our canonical schema.
    """

    @staticmethod
    def extract_property_basics(data: dict[str, Any]) -> dict[str, Any]:
        """Extract basic property attributes."""
        return {
            "zpid": data.get("zpid"),
            "address": data.get("address") or data.get("streetAddress"),
            "city": data.get("city"),
            "state": data.get("state"),
            "zipcode": data.get("zipcode"),
            "property_type": data.get("homeType"),
            "bedrooms": data.get("bedrooms"),
            "bathrooms": data.get("bathrooms"),
            "square_footage": data.get("livingArea"),
            "lot_size": data.get("lotAreaValue"),
            "year_built": data.get("yearBuilt"),
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
        }

    @staticmethod
    def extract_valuations(data: dict[str, Any]) -> dict[str, Any]:
        """Extract valuation data."""
        return {
            "zestimate": data.get("zestimate"),
            "zestimate_low": data.get("zestimateLowPercent"),
            "zestimate_high": data.get("zestimateHighPercent"),
            "rent_zestimate": data.get("rentZestimate"),
            "tax_assessed_value": data.get("taxAssessedValue"),
            "last_sold_price": data.get("lastSoldPrice"),
            "last_sold_date": data.get("lastSoldDate"),
        }

    @staticmethod
    def extract_features(data: dict[str, Any]) -> dict[str, Any]:
        """Extract property features."""
        return {
            "has_pool": data.get("hasPool"),
            "has_garage": data.get("hasGarage"),
            "parking_spaces": data.get("parkingSpaces"),
            "stories": data.get("stories"),
            "hoa_fee": data.get("hoaFee"),
            "description": data.get("description"),
        }

    @staticmethod
    def extract_scores(data: dict[str, Any]) -> dict[str, Any]:
        """Extract accessibility/walkability scores."""
        return {
            "walk_score": data.get("walkScore"),
            "transit_score": data.get("transitScore"),
            "bike_score": data.get("bikeScore"),
        }

    @staticmethod
    def extract_listing_info(data: dict[str, Any]) -> dict[str, Any]:
        """
        Extract listing status and seller type information.

        This determines:
        - Whether property is actively listed (FOR_SALE, FOR_RENT) or OFF_MARKET/SOLD
        - Seller type (Agent, FSBO, Foreclosure, BankOwned, Auction)
        - Actual list price vs estimated value

        Returns:
            Dict with listing status fields for investor analysis
        """
        # Get primary listing status from homeStatus field
        home_status = data.get("homeStatus")  # FOR_SALE, FOR_RENT, SOLD, OFF_MARKET, PENDING
        keystone_status = data.get("keystoneHomeStatus")  # RecentlySold, ForSale, etc.

        # Extract listingSubType flags for seller type determination
        listing_sub_type = data.get("listingSubType", {}) or {}
        is_foreclosure = listing_sub_type.get("isForeclosure", False)
        is_bank_owned = listing_sub_type.get("isBankOwned", False)
        is_fsbo = listing_sub_type.get("isFSBO", False)
        is_fsba = listing_sub_type.get("isFSBA", False)
        is_auction = listing_sub_type.get("isForAuction", False)
        listing_sub_type.get("isComingSoon", False)

        # Also check resoFacts for new construction
        reso_facts = data.get("resoFacts", {}) or {}
        is_new_construction = reso_facts.get("isNewConstruction", False)

        # Determine seller type based on flags
        seller_type = "Agent"  # Default
        if is_foreclosure:
            seller_type = "Foreclosure"
        elif is_bank_owned:
            seller_type = "BankOwned"
        elif is_fsbo:
            seller_type = "FSBO"
        elif is_auction:
            seller_type = "Auction"
        elif is_new_construction:
            seller_type = "NewConstruction"
        elif is_fsba:
            seller_type = "Agent"

        # Determine if property is off-market
        # A property is off-market if:
        # - homeStatus is SOLD, OFF_MARKET, or None
        # - keystoneHomeStatus indicates recently sold
        is_off_market = home_status in [None, "SOLD", "OFF_MARKET", "RECENTLY_SOLD"] or keystone_status in [
            "RecentlySold",
            "OffMarket",
        ]

        # If PENDING, it's still technically listed but under contract
        if home_status == "PENDING":
            is_off_market = False

        # Get price - this is list price if actively listed, or last sold price if sold
        price = data.get("price")

        # Only set list_price if the property is actively listed
        list_price = None
        if not is_off_market and home_status in ["FOR_SALE", "FOR_RENT", "PENDING"]:
            list_price = price

        # Time on market
        days_on_zillow = data.get("daysOnZillow")
        time_on_zillow = data.get("timeOnZillow")

        # Last sale info
        last_sold_price = data.get("lastSoldPrice")
        date_sold = data.get("dateSold")

        # Convert dateSold from timestamp to ISO string if it's a number
        date_sold_str = None
        if date_sold:
            if isinstance(date_sold, (int, float)):
                from datetime import datetime

                try:
                    date_sold_str = datetime.fromtimestamp(date_sold / 1000).isoformat()
                except:
                    date_sold_str = str(date_sold)
            else:
                date_sold_str = str(date_sold)

        # Listing agent/brokerage info
        brokerage_name = data.get("brokerageName")
        attribution_info = data.get("attributionInfo", {}) or {}
        listing_agent_name = attribution_info.get("agentName")
        mls_id = attribution_info.get("mlsId")

        return {
            "listing_status": home_status,
            "is_off_market": is_off_market,
            "seller_type": seller_type,
            "is_foreclosure": is_foreclosure,
            "is_bank_owned": is_bank_owned,
            "is_fsbo": is_fsbo,
            "is_auction": is_auction,
            "is_new_construction": is_new_construction,
            "list_price": list_price,
            "days_on_market": days_on_zillow,
            "time_on_market": time_on_zillow,
            "last_sold_price": last_sold_price,
            "date_sold": date_sold_str,
            "brokerage_name": brokerage_name,
            "listing_agent_name": listing_agent_name,
            "mls_id": mls_id,
        }


# Factory function
def create_zillow_client(api_key: str, base_url: str | None = None) -> ZillowClient:
    """Create configured Zillow client."""
    if base_url:
        return ZillowClient(api_key, base_url)
    return ZillowClient(api_key)
