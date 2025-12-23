"""
External API integrations for RentCast and AXESSO.
Includes error handling, retries, and data normalization.
"""
import httpx
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import asyncio
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class APIProvider(str, Enum):
    RENTCAST = "rentcast"
    AXESSO = "axesso"


@dataclass
class APIResponse:
    """Standardized API response wrapper."""
    success: bool
    data: Optional[Dict[str, Any]]
    error: Optional[str]
    provider: APIProvider
    timestamp: datetime
    raw_response: Optional[Dict[str, Any]] = None


class CircuitBreaker:
    """Simple circuit breaker implementation."""
    
    def __init__(self, failure_threshold: int = 3, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = "closed"
    
    def record_failure(self):
        self.failures += 1
        self.last_failure_time = datetime.utcnow()
        if self.failures >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Circuit breaker opened after {self.failures} failures")
    
    def record_success(self):
        self.failures = 0
        self.state = "closed"
    
    def can_execute(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open":
            if self.last_failure_time:
                elapsed = (datetime.utcnow() - self.last_failure_time).total_seconds()
                if elapsed >= self.recovery_timeout:
                    self.state = "half-open"
                    return True
            return False
        return True  # half-open allows one request


class RentCastClient:
    """Client for RentCast API."""
    
    def __init__(self, api_key: str, base_url: str = "https://api.rentcast.io/v1"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.circuit_breaker = CircuitBreaker()
        self.timeout = httpx.Timeout(10.0, connect=5.0)
    
    async def _make_request(
        self, 
        endpoint: str, 
        params: Dict[str, Any] = None
    ) -> APIResponse:
        """Make authenticated request to RentCast API."""
        
        if not self.circuit_breaker.can_execute():
            return APIResponse(
                success=False,
                data=None,
                error="Circuit breaker is open - service temporarily unavailable",
                provider=APIProvider.RENTCAST,
                timestamp=datetime.utcnow()
            )
        
        headers = {
            "X-Api-Key": self.api_key,
            "Accept": "application/json"
        }
        
        url = f"{self.base_url}/{endpoint}"
        
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, headers=headers, params=params)
                    
                    if response.status_code == 200:
                        data = response.json()
                        self.circuit_breaker.record_success()
                        return APIResponse(
                            success=True,
                            data=data,
                            error=None,
                            provider=APIProvider.RENTCAST,
                            timestamp=datetime.utcnow(),
                            raw_response=data
                        )
                    elif response.status_code == 429:
                        # Rate limited
                        wait_time = 2 ** attempt
                        logger.warning(f"RentCast rate limited, waiting {wait_time}s")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        error_msg = f"RentCast API error: {response.status_code}"
                        logger.error(error_msg)
                        self.circuit_breaker.record_failure()
                        return APIResponse(
                            success=False,
                            data=None,
                            error=error_msg,
                            provider=APIProvider.RENTCAST,
                            timestamp=datetime.utcnow()
                        )
                        
            except httpx.TimeoutException:
                logger.warning(f"RentCast timeout, attempt {attempt + 1}")
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                logger.error(f"RentCast error: {str(e)}")
                self.circuit_breaker.record_failure()
                return APIResponse(
                    success=False,
                    data=None,
                    error=str(e),
                    provider=APIProvider.RENTCAST,
                    timestamp=datetime.utcnow()
                )
        
        self.circuit_breaker.record_failure()
        return APIResponse(
            success=False,
            data=None,
            error="Max retries exceeded",
            provider=APIProvider.RENTCAST,
            timestamp=datetime.utcnow()
        )
    
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
        
        return await self._make_request("rentEstimate", params)
    
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


class AXESSOClient:
    """Client for AXESSO Zillow API."""
    
    def __init__(self, api_key: str, base_url: str = "https://api.axesso.de/zil"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.circuit_breaker = CircuitBreaker()
        self.timeout = httpx.Timeout(10.0, connect=5.0)
    
    async def _make_request(
        self, 
        endpoint: str, 
        params: Dict[str, Any] = None
    ) -> APIResponse:
        """Make authenticated request to AXESSO API."""
        
        if not self.circuit_breaker.can_execute():
            return APIResponse(
                success=False,
                data=None,
                error="Circuit breaker is open - service temporarily unavailable",
                provider=APIProvider.AXESSO,
                timestamp=datetime.utcnow()
            )
        
        headers = {
            "axesso-api-key": self.api_key,  # Fixed: AXESSO uses 'axesso-api-key' header
            "Accept": "application/json"
        }
        
        url = f"{self.base_url}/{endpoint}"
        
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, headers=headers, params=params)
                    
                    if response.status_code == 200:
                        data = response.json()
                        self.circuit_breaker.record_success()
                        return APIResponse(
                            success=True,
                            data=data,
                            error=None,
                            provider=APIProvider.AXESSO,
                            timestamp=datetime.utcnow(),
                            raw_response=data
                        )
                    elif response.status_code == 429:
                        wait_time = 2 ** attempt
                        logger.warning(f"AXESSO rate limited, waiting {wait_time}s")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        error_msg = f"AXESSO API error: {response.status_code}"
                        logger.error(error_msg)
                        self.circuit_breaker.record_failure()
                        return APIResponse(
                            success=False,
                            data=None,
                            error=error_msg,
                            provider=APIProvider.AXESSO,
                            timestamp=datetime.utcnow()
                        )
                        
            except httpx.TimeoutException:
                logger.warning(f"AXESSO timeout, attempt {attempt + 1}")
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                logger.error(f"AXESSO error: {str(e)}")
                self.circuit_breaker.record_failure()
                return APIResponse(
                    success=False,
                    data=None,
                    error=str(e),
                    provider=APIProvider.AXESSO,
                    timestamp=datetime.utcnow()
                )
        
        self.circuit_breaker.record_failure()
        return APIResponse(
            success=False,
            data=None,
            error="Max retries exceeded",
            provider=APIProvider.AXESSO,
            timestamp=datetime.utcnow()
        )
    
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
        "tax_assessed_value": ("taxAssessedValue", "taxAssessedValue", "rentcast"),
        
        # Rental Data - Zillow averageRent from rentalData
        "monthly_rent_ltr": ("rent", "rentZestimate", "rentcast"),
        "average_rent": (None, "rentalData.averageRent", "axesso"),
        "rent_range_low": ("rentRangeLow", None, "rentcast"),
        "rent_range_high": ("rentRangeHigh", None, "rentcast"),
        
        # Mortgage Rates - Zillow mortgage data
        "mortgage_rate_arm5": (None, "mortgageZHLRates.arm5Bucket.rate", "axesso"),
        "mortgage_rate_30yr": (None, "mortgageZHLRates.thirtyYearFixedBucket.rate", "axesso"),
        
        # STR Data (AXESSO primary for STR)
        "average_daily_rate": (None, "averageDailyRate", "axesso"),
        "occupancy_rate": (None, "occupancyRate", "axesso"),
        
        # Taxes
        "property_taxes_annual": ("propertyTaxes", "annualTaxAmount", "rentcast"),
    }
    
    def __init__(self):
        self.conflict_threshold = 0.15  # 15% difference triggers conflict flag
    
    def normalize(
        self,
        rentcast_data: Optional[Dict[str, Any]],
        axesso_data: Optional[Dict[str, Any]],
        timestamp: datetime
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Normalize and merge data from both providers.
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
        
        return normalized, provenance
    
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
            # Find the most recent year's total tax
            years = [k for k in value.keys() if k.isdigit()]
            if years:
                latest_year = max(years)
                year_data = value.get(latest_year, {})
                return year_data.get("total") if isinstance(year_data, dict) else None
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
        
        completeness_score = (present_fields / total_fields) * 100 if total_fields > 0 else 0
        
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
    axesso_url: str
) -> Tuple[RentCastClient, AXESSOClient, DataNormalizer]:
    """Create configured API clients and normalizer."""
    rentcast = RentCastClient(rentcast_api_key, rentcast_url)
    axesso = AXESSOClient(axesso_api_key, axesso_url)
    normalizer = DataNormalizer()
    
    return rentcast, axesso, normalizer
