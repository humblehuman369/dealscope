"""
External API integrations for RentCast and AXESSO.
Includes error handling, retries, and data normalization.

Uses BaseAPIClient for shared request logic including:
- Retry with exponential backoff
- Rate limit handling
- Circuit breaker pattern
"""
import httpx
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import asyncio
import logging
from dataclasses import dataclass, field
from enum import Enum

from app.services.base_client import BaseAPIClient, CircuitBreaker, BaseAPIResponse

logger = logging.getLogger(__name__)


class APIProvider(str, Enum):
    RENTCAST = "rentcast"
    AXESSO = "axesso"
    REDFIN = "redfin"


@dataclass
class APIResponse(BaseAPIResponse):
    """Standardized API response wrapper with provider info."""
    provider: APIProvider = APIProvider.RENTCAST
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class RentCastClient(BaseAPIClient[APIResponse]):
    """
    Client for RentCast API.
    
    Extends BaseAPIClient with RentCast-specific authentication and response handling.
    """
    
    def __init__(self, api_key: str, base_url: str = "https://api.rentcast.io/v1"):
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            timeout=10.0,
            connect_timeout=5.0,
            max_retries=3,
            enable_circuit_breaker=True
        )
    
    def _get_headers(self) -> Dict[str, str]:
        """Return RentCast authentication headers."""
        return {
            "X-Api-Key": self.api_key,
            "Accept": "application/json"
        }
    
    def _create_response(
        self,
        success: bool,
        data: Optional[Dict[str, Any]],
        error: Optional[str],
        status_code: Optional[int],
        raw_response: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> APIResponse:
        """Create RentCast-specific response."""
        return APIResponse(
            success=success,
            data=data,
            error=error,
            status_code=status_code,
            provider=APIProvider.RENTCAST,
            raw_response=raw_response
        )
    
    def _get_provider_name(self) -> str:
        """Return provider name for logging."""
        return "RentCast"
    
    async def get_property(self, address: str) -> APIResponse:
        """Get property records by address."""
        return await self._make_request("properties", {"address": address})
    
    async def get_value_estimate(
        self, 
        address: str,
        property_type: str = None,
        bedrooms: int = None,
        bathrooms: float = None,
        square_footage: int = None
    ) -> APIResponse:
        """Get AVM value estimate."""
        params = {"address": address}
        if property_type:
            params["propertyType"] = property_type
        if bedrooms:
            params["bedrooms"] = bedrooms
        if bathrooms:
            params["bathrooms"] = bathrooms
        if square_footage:
            params["squareFootage"] = square_footage
        
        return await self._make_request("avm", params)
    
    async def get_rent_estimate(
        self,
        address: str,
        property_type: str = None,
        bedrooms: int = None,
        bathrooms: float = None,
        square_footage: int = None
    ) -> APIResponse:
        """Get rent estimate for long-term rental."""
        params = {"address": address}
        if property_type:
            params["propertyType"] = property_type
        if bedrooms:
            params["bedrooms"] = bedrooms
        if bathrooms:
            params["bathrooms"] = bathrooms
        if square_footage:
            params["squareFootage"] = square_footage

        # RentCast long-term rent AVM endpoint returns the valuation plus comparables[].
        return await self._make_request("avm/rent/long-term", params)
    
    async def get_market_statistics(
        self,
        zip_code: str = None,
        city: str = None,
        state: str = None
    ) -> APIResponse:
        """Get market statistics for area."""
        params = {}
        if zip_code:
            params["zipCode"] = zip_code
        if city:
            params["city"] = city
        if state:
            params["state"] = state
        
        return await self._make_request("markets", params)


class AXESSOClient(BaseAPIClient[APIResponse]):
    """
    Client for AXESSO Zillow API.
    
    Extends BaseAPIClient with AXESSO-specific authentication and response handling.
    """
    
    def __init__(self, api_key: str, base_url: str = "https://api.axesso.de/zil"):
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            timeout=10.0,
            connect_timeout=5.0,
            max_retries=3,
            enable_circuit_breaker=True
        )
    
    def _get_headers(self) -> Dict[str, str]:
        """Return AXESSO authentication headers."""
        return {
            "axesso-api-key": self.api_key,
            "Accept": "application/json"
        }
    
    def _create_response(
        self,
        success: bool,
        data: Optional[Dict[str, Any]],
        error: Optional[str],
        status_code: Optional[int],
        raw_response: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> APIResponse:
        """Create AXESSO-specific response."""
        return APIResponse(
            success=success,
            data=data,
            error=error,
            status_code=status_code,
            provider=APIProvider.AXESSO,
            raw_response=raw_response
        )
    
    def _get_provider_name(self) -> str:
        """Return provider name for logging."""
        return "AXESSO"
    
    async def get_property_details(self, zpid: str = None, address: str = None) -> APIResponse:
        """Get property details from Zillow."""
        params = {}
        if zpid:
            params["zpid"] = zpid
        if address:
            params["address"] = address
        
        return await self._make_request("property-details", params)
    
    async def search_properties(
        self,
        location: str,
        page: int = 1,
        status: str = "forSale"
    ) -> APIResponse:
        """Search for properties in an area."""
        params = {
            "location": location,
            "page": page,
            "status": status
        }
        return await self._make_request("search", params)
    
    async def get_photos(self, zpid: str = None, url: str = None) -> APIResponse:
        """Get property photos from Zillow.
        
        Args:
            zpid: Zillow Property ID
            url: Property URL on Zillow
            
        Returns:
            APIResponse with photo URLs
        """
        params = {}
        if zpid:
            params["zpid"] = zpid
        if url:
            params["url"] = url
        
        return await self._make_request("photos", params)


class RedfinClient(BaseAPIClient[APIResponse]):
    """
    Client for Redfin Base API via RapidAPI.

    Two-step lookup:
    1. auto-complete  → resolve address to Redfin property name
    2. detail         → fetch AVM (predictedValue) and rental estimate
    """

    RAPIDAPI_HOST = "redfin-base.p.rapidapi.com"

    def __init__(self, api_key: str, base_url: str = "https://redfin-base.p.rapidapi.com"):
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            timeout=15.0,
            connect_timeout=5.0,
            max_retries=2,
            enable_circuit_breaker=True,
        )

    def _get_headers(self) -> Dict[str, str]:
        return {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": self.RAPIDAPI_HOST,
            "Accept": "application/json",
        }

    def _create_response(
        self,
        success: bool,
        data: Optional[Dict[str, Any]],
        error: Optional[str],
        status_code: Optional[int],
        raw_response: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> APIResponse:
        return APIResponse(
            success=success,
            data=data,
            error=error,
            status_code=status_code,
            provider=APIProvider.REDFIN,
            raw_response=raw_response,
        )

    def _get_provider_name(self) -> str:
        return "REDFIN"

    async def search_address(self, address: str) -> APIResponse:
        """Resolve a full address to Redfin's short location name via auto-complete."""
        return await self._make_request(
            "redfin/1.1/auto-complete", params={"location": address}
        )

    async def get_detail(self, location: str) -> APIResponse:
        """Fetch full property detail (AVM, rental estimate, etc.)."""
        return await self._make_request(
            "redfin/detail", params={"location": location}
        )

    async def get_property_estimate(self, address: str) -> Optional[Dict[str, Any]]:
        """Convenience: auto-complete → detail → extract AVM + rental estimate.

        Returns a dict with ``redfin_estimate`` (property value) and
        ``redfin_rental_estimate`` (monthly rent), or ``None`` on failure.
        """
        ac = await self.search_address(address)
        if not ac.success or not ac.data:
            return None

        # Auto-complete wraps results under a nested "data" key
        inner = ac.data.get("data") or ac.data
        rows = inner.get("rows") or []
        exact = inner.get("exactMatch")
        match = exact or (rows[0] if rows else None)
        if not match:
            return None

        location_name = match.get("name")
        if not location_name:
            return None

        detail = await self.get_detail(location_name)
        if not detail.success or not detail.data:
            return None

        payload = detail.data.get("data") or detail.data
        result: Dict[str, Any] = {}

        avm = payload.get("avm") or {}
        result["redfin_estimate"] = avm.get("predictedValue")
        result["redfin_last_sold_price"] = avm.get("lastSoldPrice")

        rental = payload.get("rental-estimate") or {}
        rental_info = rental.get("rentalEstimateInfo") or {}
        result["redfin_rental_estimate"] = rental_info.get("predictedValue")
        result["redfin_rental_low"] = rental_info.get("predictedValueLow")
        result["redfin_rental_high"] = rental_info.get("predictedValueHigh")

        return result


class DataNormalizer:
    """
    Normalizes and merges data from multiple API providers
    into a canonical schema.
    """
    
    # Field mapping: canonical_field -> (rentcast_field, axesso_field, priority)
    FIELD_MAPPING = {
        # Property Details
        "property_type": ("propertyType", "homeType", "rentcast"),
        "bedrooms": ("bedrooms", "bedrooms", "rentcast"),
        "bathrooms": ("bathrooms", "bathrooms", "rentcast"),
        "square_footage": ("squareFootage", "livingArea", "rentcast"),
        "lot_size": ("lotSize", "lotAreaValue", "rentcast"),
        "year_built": ("yearBuilt", "yearBuilt", "rentcast"),
        
        # Valuations - Zillow (AXESSO) primary for Zestimate data
        "zestimate": (None, "zestimate", "axesso"),
        "zestimate_high_pct": (None, "zestimateHighPercent", "axesso"),
        "zestimate_low_pct": (None, "zestimateLowPercent", "axesso"),
        "current_value_avm": ("price", "zestimate", "rentcast"),
        "value_range_low": ("priceRangeLow", "zestimateLowPercent", "rentcast"),
        "value_range_high": ("priceRangeHigh", "zestimateHighPercent", "rentcast"),
        "last_sale_price": ("lastSalePrice", "lastSoldPrice", "rentcast"),
        "last_sale_date": ("lastSaleDate", "lastSoldDate", "rentcast"),
        "tax_assessed_value": ("taxAssessments", "taxAssessedValue", "rentcast"),
        
        # Rental Data
        "monthly_rent_ltr": ("rent", None, "rentcast"),
        "average_rent": (None, "rentalData.averageRent", "axesso"),
        "rent_range_low": ("rentRangeLow", None, "rentcast"),
        "rent_range_high": ("rentRangeHigh", None, "rentcast"),
        
        # IQ Estimate source values — individual provider estimates for selector UI
        "rental_rentcast_estimate": ("rent", None, "rentcast"),
        "rental_zillow_estimate": (None, "rentZestimate", "axesso"),
        "rentcast_avm": ("price", None, "rentcast"),
        
        # Mortgage Rates - Zillow mortgage data
        "mortgage_rate_arm5": (None, "mortgageZHLRates.arm5Bucket.rate", "axesso"),
        "mortgage_rate_30yr": (None, "mortgageZHLRates.thirtyYearFixedBucket.rate", "axesso"),
        
        # STR Data (AXESSO primary for STR)
        "average_daily_rate": (None, "averageDailyRate", "axesso"),
        "occupancy_rate": (None, "occupancyRate", "axesso"),
        
        # Taxes
        "property_taxes_annual": ("propertyTaxes", "annualTaxAmount", "rentcast"),
        
        # Listing Status - AXESSO/Zillow primary
        "listing_status": (None, "homeStatus", "axesso"),
        "days_on_market": (None, "daysOnZillow", "axesso"),
        "brokerage_name": (None, "brokerageName", "axesso"),
        
        # Location
        "latitude": ("latitude", "latitude", "rentcast"),
        "longitude": ("longitude", "longitude", "rentcast"),
    }
    
    def __init__(self):
        self.conflict_threshold = 0.15  # 15% difference triggers conflict flag
    
    def normalize(
        self,
        rentcast_data: Optional[Dict[str, Any]],
        axesso_data: Optional[Dict[str, Any]],
        timestamp: datetime,
        redfin_data: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Normalize and merge data from all providers.
        Returns: (normalized_data, provenance_map)
        """
        normalized = {}
        provenance = {}
        
        for canonical_field, (rc_field, ax_field, priority) in self.FIELD_MAPPING.items():
            rc_value = self._get_nested_value(rentcast_data, rc_field) if rc_field else None
            ax_value = self._get_nested_value(axesso_data, ax_field) if ax_field else None
            
            # Determine final value based on priority and availability
            final_value = None
            source = None
            conflict = False
            raw_values = {}
            
            if rc_value is not None:
                raw_values["rentcast"] = rc_value
            if ax_value is not None:
                raw_values["axesso"] = ax_value
            
            if priority == "rentcast":
                if rc_value is not None:
                    final_value = rc_value
                    source = "rentcast"
                elif ax_value is not None:
                    final_value = ax_value
                    source = "axesso"
            else:  # axesso priority
                if ax_value is not None:
                    final_value = ax_value
                    source = "axesso"
                elif rc_value is not None:
                    final_value = rc_value
                    source = "rentcast"
            
            # Check for conflicts in numeric values
            if rc_value is not None and ax_value is not None:
                if isinstance(rc_value, (int, float)) and isinstance(ax_value, (int, float)):
                    if rc_value > 0:
                        diff_pct = abs(rc_value - ax_value) / rc_value
                        if diff_pct > self.conflict_threshold:
                            conflict = True
                            # Use weighted average for conflicting numeric values
                            if priority == "rentcast":
                                final_value = (rc_value * 0.6) + (ax_value * 0.4)
                            else:
                                final_value = (ax_value * 0.6) + (rc_value * 0.4)
                            source = "merged"
            
            normalized[canonical_field] = final_value
            
            # Determine confidence
            if source:
                if conflict:
                    confidence = "medium"
                elif source in ["rentcast", "axesso"]:
                    confidence = "high"
                else:
                    confidence = "medium"
            else:
                confidence = "low"
            
            provenance[canonical_field] = {
                "source": source or "missing",
                "fetched_at": timestamp.isoformat(),
                "confidence": confidence,
                "raw_values": raw_values if raw_values else None,
                "conflict_flag": conflict
            }
        
        # Inject Redfin estimate as a standalone source (value-only, bypasses FIELD_MAPPING)
        self._inject_redfin_data(normalized, provenance, redfin_data, timestamp)

        # Extract complex listing info from AXESSO data
        self._extract_listing_info(normalized, axesso_data, timestamp, provenance)
        
        # Compute proprietary IQ Estimates (average of all available sources)
        self._compute_iq_estimates(normalized, provenance, timestamp)
        
        return normalized, provenance
    
    def _inject_redfin_data(
        self,
        normalized: Dict[str, Any],
        provenance: Dict[str, Any],
        redfin_data: Optional[Dict[str, Any]],
        timestamp: datetime,
    ):
        """Inject Redfin estimate into normalized data with provenance tracking."""
        ts = timestamp.isoformat()
        rf_value = redfin_data.get("redfin_estimate") if redfin_data else None

        if rf_value is not None:
            try:
                rf_value = float(rf_value)
            except (TypeError, ValueError):
                rf_value = None

        normalized["redfin_estimate"] = rf_value
        provenance["redfin_estimate"] = {
            "source": "redfin" if rf_value is not None else "missing",
            "fetched_at": ts,
            "confidence": "high" if rf_value is not None else "low",
            "raw_values": {"redfin": rf_value} if rf_value is not None else None,
            "conflict_flag": False,
        }

    def _extract_listing_info(
        self,
        normalized: Dict[str, Any],
        axesso_data: Optional[Dict[str, Any]],
        timestamp: datetime,
        provenance: Dict[str, Any]
    ):
        """
        Extract listing status and seller type from AXESSO/Zillow data.
        
        This determines:
        - Whether property is actively listed (FOR_SALE, FOR_RENT) or OFF_MARKET/SOLD
        - Seller type (Agent, FSBO, Foreclosure, BankOwned, Auction)
        - Actual list price vs estimated value
        """
        if not axesso_data:
            normalized["is_off_market"] = True
            normalized["seller_type"] = None
            return
        
        # Get primary listing status
        home_status = axesso_data.get("homeStatus")
        keystone_status = axesso_data.get("keystoneHomeStatus")
        
        # Extract listingSubType for seller type determination
        # AXESSO may return this as a JSON string or under snake_case key
        listing_sub_type = axesso_data.get("listingSubType") or axesso_data.get("listing_sub_type") or {}
        if isinstance(listing_sub_type, str):
            try:
                import json
                listing_sub_type = json.loads(listing_sub_type)
            except (json.JSONDecodeError, TypeError):
                listing_sub_type = {}
        if not isinstance(listing_sub_type, dict):
            listing_sub_type = {}
        is_foreclosure = listing_sub_type.get("isForeclosure") or listing_sub_type.get("is_foreclosure", False)
        is_bank_owned = listing_sub_type.get("isBankOwned") or listing_sub_type.get("is_bankOwned", False)
        is_fsbo = listing_sub_type.get("isFSBO") or listing_sub_type.get("is_FSBO", False)
        is_auction = listing_sub_type.get("isForAuction") or listing_sub_type.get("is_forAuction", False)
        
        # Check for new construction
        reso_facts = axesso_data.get("resoFacts", {}) or {}
        is_new_construction = reso_facts.get("isNewConstruction", False)
        
        # Store individual seller type flags
        normalized["is_foreclosure"] = is_foreclosure
        normalized["is_bank_owned"] = is_bank_owned
        normalized["is_fsbo"] = is_fsbo
        normalized["is_auction"] = is_auction
        normalized["is_new_construction"] = is_new_construction
        
        # Determine seller type string
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
        
        normalized["seller_type"] = seller_type
        
        # Determine if property is off-market
        is_off_market = home_status in [None, "SOLD", "OFF_MARKET", "RECENTLY_SOLD", "OTHER"] or \
                        keystone_status in ["RecentlySold", "OffMarket"]
        
        # PENDING is still technically listed
        if home_status == "PENDING":
            is_off_market = False
        
        normalized["is_off_market"] = is_off_market
        
        # List price - only set if actively listed
        price = axesso_data.get("price")
        if not is_off_market and home_status in ["FOR_SALE", "FOR_RENT", "PENDING"]:
            normalized["list_price"] = price
        else:
            normalized["list_price"] = None
        
        # Time on market
        normalized["time_on_market"] = axesso_data.get("timeOnZillow")
        
        # Date sold (if applicable)
        date_sold = axesso_data.get("dateSold")
        if date_sold:
            if isinstance(date_sold, (int, float)):
                try:
                    normalized["date_sold"] = datetime.fromtimestamp(date_sold / 1000).isoformat()
                except:
                    normalized["date_sold"] = str(date_sold)
            else:
                normalized["date_sold"] = str(date_sold)
        else:
            normalized["date_sold"] = None
        
        # Last sold price
        normalized["last_sold_price"] = axesso_data.get("lastSoldPrice")
        
        # Listing agent/brokerage info
        attribution = axesso_data.get("attributionInfo", {}) or {}
        normalized["listing_agent_name"] = attribution.get("agentName")
        normalized["mls_id"] = attribution.get("mlsId")
        
        # Add provenance for listing fields
        listing_fields = ["is_off_market", "seller_type", "list_price", "is_foreclosure", 
                         "is_bank_owned", "is_fsbo", "is_auction", "is_new_construction",
                         "date_sold", "last_sold_price", "listing_agent_name", "mls_id", 
                         "time_on_market"]
        for field in listing_fields:
            provenance[field] = {
                "source": "axesso",
                "fetched_at": timestamp.isoformat(),
                "confidence": "high",
                "raw_values": None,
                "conflict_flag": False
            }
    
    def _compute_iq_estimates(
        self,
        normalized: Dict[str, Any],
        provenance: Dict[str, Any],
        timestamp: datetime,
    ):
        """Compute IQ proprietary estimates — average of all available sources,
        single-source value when only one exists, None when none exist."""
        ts = timestamp.isoformat()

        def _iq_multi(vals_map: Dict[str, Any], field_name: str):
            """Average all non-None values from *vals_map* into *field_name*."""
            present = {k: float(v) for k, v in vals_map.items() if v is not None}
            if present:
                avg = round(sum(present.values()) / len(present))
                normalized[field_name] = avg
                source = next(iter(present)) if len(present) == 1 else "merged"
                provenance[field_name] = {
                    "source": source,
                    "fetched_at": ts,
                    "confidence": "high",
                    "raw_values": present,
                    "conflict_flag": False,
                }
            else:
                normalized[field_name] = None
                provenance[field_name] = {
                    "source": "missing",
                    "fetched_at": ts,
                    "confidence": "low",
                    "raw_values": None,
                    "conflict_flag": False,
                }

        _iq_multi(
            {
                "rentcast": normalized.get("rental_rentcast_estimate"),
                "axesso": normalized.get("rental_zillow_estimate"),
            },
            "rental_iq_estimate",
        )
        _iq_multi(
            {
                "rentcast": normalized.get("rentcast_avm"),
                "axesso": normalized.get("zestimate"),
                "redfin": normalized.get("redfin_estimate"),
            },
            "value_iq_estimate",
        )

    def _get_nested_value(self, data: Optional[Dict], field: str) -> Any:
        """Get value from potentially nested dict using dot notation."""
        if data is None or field is None:
            return None
        
        keys = field.split(".")
        value = data
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        # Handle special cases where the API returns yearly data as a dict
        # e.g., propertyTaxes: {"2024": {"year": 2024, "total": 6471}, ...}
        if field == "propertyTaxes" and isinstance(value, dict):
            years = [k for k in value.keys() if k.isdigit()]
            if years:
                latest_year = max(years)
                year_data = value.get(latest_year, {})
                return year_data.get("total") if isinstance(year_data, dict) else None
            return None

        # taxAssessments: {"2024": {"year": 2024, "value": 346274}, ...}
        if field == "taxAssessments" and isinstance(value, dict):
            years = [k for k in value.keys() if k.isdigit()]
            if years:
                latest_year = max(years)
                year_data = value.get(latest_year, {})
                return year_data.get("value") if isinstance(year_data, dict) else None
            return None

        return value
    
    def calculate_data_quality(
        self,
        normalized: Dict[str, Any],
        provenance: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate data quality metrics."""
        total_fields = len(self.FIELD_MAPPING)
        present_fields = sum(1 for v in normalized.values() if v is not None)
        
        missing_fields = [k for k, v in normalized.items() if v is None]
        conflict_fields = [k for k, v in provenance.items() if v.get("conflict_flag")]
        
        # Check for stale data (simplified - would need timestamps in real implementation)
        stale_fields = []
        
        completeness_score = min((present_fields / total_fields) * 100, 100.0) if total_fields > 0 else 0
        
        return {
            "completeness_score": round(completeness_score, 1),
            "missing_fields": missing_fields,
            "stale_fields": stale_fields,
            "conflict_fields": conflict_fields
        }


# Factory function to create clients
def create_api_clients(
    rentcast_api_key: str,
    rentcast_url: str,
    axesso_api_key: str,
    axesso_url: str,
    redfin_api_key: str = "",
    redfin_url: str = "https://redfin-base.p.rapidapi.com",
) -> Tuple[RentCastClient, AXESSOClient, DataNormalizer, Optional[RedfinClient]]:
    """Create configured API clients and normalizer."""
    rentcast = RentCastClient(rentcast_api_key, rentcast_url)
    axesso = AXESSOClient(axesso_api_key, axesso_url)
    normalizer = DataNormalizer()
    redfin = RedfinClient(redfin_api_key, redfin_url) if redfin_api_key else None

    return rentcast, axesso, normalizer, redfin
