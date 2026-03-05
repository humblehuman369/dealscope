"""
External API integrations for RentCast and AXESSO.
Includes error handling, retries, and data normalization.

Uses BaseAPIClient for shared request logic including:
- Retry with exponential backoff
- Rate limit handling
- Circuit breaker pattern
"""

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from app.services.base_client import BaseAPIClient, BaseAPIResponse

logger = logging.getLogger(__name__)


class APIProvider(StrEnum):
    RENTCAST = "rentcast"
    AXESSO = "axesso"
    REDFIN = "redfin"


@dataclass
class APIResponse(BaseAPIResponse):
    """Standardized API response wrapper with provider info."""

    provider: APIProvider = APIProvider.RENTCAST
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))


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
            enable_circuit_breaker=True,
        )

    def _get_headers(self) -> dict[str, str]:
        """Return RentCast authentication headers."""
        return {"X-Api-Key": self.api_key, "Accept": "application/json"}

    def _create_response(
        self,
        success: bool,
        data: dict[str, Any] | None,
        error: str | None,
        status_code: int | None,
        raw_response: dict[str, Any] | None = None,
        **kwargs,
    ) -> APIResponse:
        """Create RentCast-specific response."""
        return APIResponse(
            success=success,
            data=data,
            error=error,
            status_code=status_code,
            provider=APIProvider.RENTCAST,
            raw_response=raw_response,
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
        property_type: str | None = None,
        bedrooms: int | None = None,
        bathrooms: float | None = None,
        square_footage: int | None = None,
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

        return await self._make_request("avm/value", params)

    async def get_rent_estimate(
        self,
        address: str,
        property_type: str | None = None,
        bedrooms: int | None = None,
        bathrooms: float | None = None,
        square_footage: int | None = None,
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
        self, zip_code: str | None = None, city: str | None = None, state: str | None = None
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
            enable_circuit_breaker=True,
        )

    def _get_headers(self) -> dict[str, str]:
        """Return AXESSO authentication headers."""
        return {"axesso-api-key": self.api_key, "Accept": "application/json"}

    def _create_response(
        self,
        success: bool,
        data: dict[str, Any] | None,
        error: str | None,
        status_code: int | None,
        raw_response: dict[str, Any] | None = None,
        **kwargs,
    ) -> APIResponse:
        """Create AXESSO-specific response."""
        return APIResponse(
            success=success,
            data=data,
            error=error,
            status_code=status_code,
            provider=APIProvider.AXESSO,
            raw_response=raw_response,
        )

    def _get_provider_name(self) -> str:
        """Return provider name for logging."""
        return "AXESSO"

    async def get_property_details(self, zpid: str | None = None, address: str | None = None) -> APIResponse:
        """Get property details from Zillow."""
        params = {}
        if zpid:
            params["zpid"] = zpid
        if address:
            params["address"] = address

        return await self._make_request("property-details", params)

    async def search_properties(self, location: str, page: int = 1, status: str = "forSale") -> APIResponse:
        """Search for properties in an area."""
        params = {"location": location, "page": page, "status": status}
        return await self._make_request("search", params)

    async def get_photos(self, zpid: str | None = None, url: str | None = None) -> APIResponse:
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
    Client for Redfin API via RapidAPI (redfin-com-data.p.rapidapi.com).

    Flow: auto-complete(query) → propertyId or regionId → search-sale/rent if
    regionId → get-listingId(propertyId) → properties/estimate(propertyId, listingId).
    Headers: X-Rapidapi-Key, X-Rapidapi-Host.
    """

    def __init__(
        self,
        api_key: str,
        rapidapi_host: str = "redfin-com-data.p.rapidapi.com",
    ):
        base_url = f"https://{rapidapi_host.rstrip('/')}"
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            timeout=15.0,
            connect_timeout=5.0,
            max_retries=2,
            enable_circuit_breaker=True,
        )
        self.rapidapi_host = rapidapi_host

    def _get_headers(self) -> dict[str, str]:
        return {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": self.rapidapi_host,
            "Accept": "application/json",
        }

    def _create_response(
        self,
        success: bool,
        data: dict[str, Any] | None,
        error: str | None,
        status_code: int | None,
        raw_response: dict[str, Any] | None = None,
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

    async def auto_complete(self, query: str) -> APIResponse:
        """GET /properties/auto-complete?query=."""
        return await self._make_request(
            "properties/auto-complete",
            params={"query": query},
        )

    async def search_sale(self, region_id: str) -> APIResponse:
        """GET /properties/search-sale?regionId=."""
        return await self._make_request(
            "properties/search-sale",
            params={"regionId": region_id},
        )

    async def search_rent(self, region_id: str) -> APIResponse:
        """GET /properties/search-rent?regionId=."""
        return await self._make_request(
            "properties/search-rent",
            params={"regionId": region_id},
        )

    async def get_listing_id(self, property_id: str) -> APIResponse:
        """GET /properties/get-listingId?propertyId=."""
        return await self._make_request(
            "properties/get-listingId",
            params={"propertyId": property_id},
        )

    async def get_estimate(self, property_id: str, listing_id: str) -> APIResponse:
        """GET /properties/estimate?propertyId=&listingId=."""
        return await self._make_request(
            "properties/estimate",
            params={"propertyId": property_id, "listingId": listing_id},
        )

    def _parse_estimate_response(self, data: Any) -> dict[str, Any]:
        """Extract redfin_estimate and redfin_rental_estimate from /properties/estimate response."""
        result: dict[str, Any] = {}

        def _num(obj: Any, key: str) -> float | None:
            if not isinstance(obj, dict):
                return None
            v = obj.get(key)
            if v is None:
                return None
            try:
                return float(v)
            except (TypeError, ValueError):
                return None

        if not isinstance(data, dict):
            return result

        # Unwrap nested .data if present
        payload = data.get("data") if isinstance(data.get("data"), dict) else data
        if not isinstance(payload, dict):
            payload = data

        # AVM / value
        avm = payload.get("avm")
        if isinstance(avm, dict):
            result["redfin_estimate"] = _num(avm, "predictedValue") or avm.get("predictedValue")
        if result.get("redfin_estimate") is None:
            result["redfin_estimate"] = (
                _num(payload, "predictedValue")
                or _num(payload, "value")
                or _num(payload, "avm")
            )

        # Rental
        rental = (
            payload.get("rentalEstimate")
            or payload.get("rental-estimate")
            or payload.get("rental_estimate")
        )
        if isinstance(rental, dict):
            inner = rental.get("rentalEstimateInfo") or rental.get("rental_estimate_info") or rental
            if isinstance(inner, dict):
                result["redfin_rental_estimate"] = _num(inner, "predictedValue") or inner.get("predictedValue")
        if result.get("redfin_rental_estimate") is None:
            result["redfin_rental_estimate"] = (
                _num(payload, "rent")
                or _num(payload, "price")
                or _num(payload, "monthlyRent")
                or _num(payload, "monthly_rent")
            )

        return result

    def _extract_from_autocomplete(self, data: Any) -> tuple[str | None, str | None]:
        """From auto-complete response, get (propertyId, regionId). Either may be None."""
        if not isinstance(data, dict):
            return None, None
        # Unwrap .data
        payload = data.get("data")
        if payload is None:
            payload = data
        # Single object
        if isinstance(payload, dict):
            pid = payload.get("propertyId") or payload.get("property_id")
            rid = payload.get("regionId") or payload.get("region_id")
            return (str(pid) if pid is not None else None), (str(rid) if rid is not None else None)
        # List of suggestions
        if isinstance(payload, list) and payload:
            first = payload[0] if isinstance(payload[0], dict) else None
            if first:
                pid = first.get("propertyId") or first.get("property_id")
                rid = first.get("regionId") or first.get("region_id")
                return (str(pid) if pid is not None else None), (str(rid) if rid is not None else None)
        for key in ("suggestions", "results", "items", "matches"):
            arr = data.get(key) if isinstance(data, dict) else None
            if isinstance(arr, list) and arr and isinstance(arr[0], dict):
                first = arr[0]
                pid = first.get("propertyId") or first.get("property_id")
                rid = first.get("regionId") or first.get("region_id")
                return (str(pid) if pid is not None else None), (str(rid) if rid is not None else None)
        return None, None

    def _extract_property_id_from_search(self, data: Any) -> str | None:
        """Get propertyId from search-sale or search-rent response (first result)."""
        if not isinstance(data, dict):
            return None
        for container in ("data", "properties", "results", "listings", "rows"):
            raw = data.get(container)
            if isinstance(raw, list) and raw and isinstance(raw[0], dict):
                first = raw[0]
                pid = first.get("propertyId") or first.get("property_id") or first.get("id")
                if pid is not None:
                    return str(pid)
        payload = data.get("data") if isinstance(data.get("data"), dict) else data
        if isinstance(payload, dict):
            pid = payload.get("propertyId") or payload.get("property_id")
            if pid is not None:
                return str(pid)
        return None

    def _extract_listing_id(self, data: Any) -> str | None:
        """Get listingId from get-listingId response."""
        if not isinstance(data, dict):
            return None
        payload = data.get("data") if isinstance(data.get("data"), dict) else data
        if not isinstance(payload, dict):
            payload = data
        lid = payload.get("listingId") or payload.get("listing_id")
        if lid is not None:
            return str(lid)
        if isinstance(data.get("listingId"), (str, int)):
            return str(data["listingId"])
        return None

    async def get_property_estimate(self, address: str) -> dict[str, Any] | None:
        """
        Resolve address via auto-complete → propertyId (or regionId → search-sale) →
        get-listingId → properties/estimate. Returns redfin_estimate and redfin_rental_estimate.
        """
        # Step 1: auto-complete with address query
        ac_resp = await self.auto_complete(address)
        if not ac_resp.success or not ac_resp.data:
            return None
        property_id, region_id = self._extract_from_autocomplete(ac_resp.data)
        # Step 2: if we only got regionId, get propertyId from search-sale (or search-rent)
        if not property_id and region_id:
            search_resp = await self.search_sale(region_id)
            if not search_resp.success or not search_resp.data:
                search_resp = await self.search_rent(region_id)
            if search_resp.success and search_resp.data:
                property_id = self._extract_property_id_from_search(search_resp.data)
        if not property_id:
            return None
        # Step 3: get listingId from propertyId
        lid_resp = await self.get_listing_id(property_id)
        if not lid_resp.success or not lid_resp.data:
            return None
        listing_id = self._extract_listing_id(lid_resp.data)
        if not listing_id:
            return None
        # Step 4: fetch estimate
        est_resp = await self.get_estimate(property_id, listing_id)
        if not est_resp.success or not est_resp.data:
            return None
        parsed = self._parse_estimate_response(est_resp.data)
        return parsed if (parsed.get("redfin_estimate") or parsed.get("redfin_rental_estimate")) else None


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
        rentcast_data: dict[str, Any] | None,
        axesso_data: dict[str, Any] | None,
        timestamp: datetime,
        redfin_data: dict[str, Any] | None = None,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
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
                "conflict_flag": conflict,
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
        normalized: dict[str, Any],
        provenance: dict[str, Any],
        redfin_data: dict[str, Any] | None,
        timestamp: datetime,
    ):
        """Inject Redfin value and rental estimates into normalized data."""
        ts = timestamp.isoformat()

        def _inject_field(raw_key: str, norm_key: str):
            val = redfin_data.get(raw_key) if redfin_data else None
            if val is not None:
                try:
                    val = float(val)
                except (TypeError, ValueError):
                    val = None
            normalized[norm_key] = val
            provenance[norm_key] = {
                "source": "redfin" if val is not None else "missing",
                "fetched_at": ts,
                "confidence": "high" if val is not None else "low",
                "raw_values": {"redfin": val} if val is not None else None,
                "conflict_flag": False,
            }

        _inject_field("redfin_estimate", "redfin_estimate")
        _inject_field("redfin_rental_estimate", "redfin_rental_estimate")

    def _extract_listing_info(
        self,
        normalized: dict[str, Any],
        axesso_data: dict[str, Any] | None,
        timestamp: datetime,
        provenance: dict[str, Any],
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
        is_off_market = home_status in [None, "SOLD", "OFF_MARKET", "RECENTLY_SOLD", "OTHER"] or keystone_status in [
            "RecentlySold",
            "OffMarket",
        ]

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
        listing_fields = [
            "is_off_market",
            "seller_type",
            "list_price",
            "is_foreclosure",
            "is_bank_owned",
            "is_fsbo",
            "is_auction",
            "is_new_construction",
            "date_sold",
            "last_sold_price",
            "listing_agent_name",
            "mls_id",
            "time_on_market",
        ]
        for fname in listing_fields:
            provenance[fname] = {
                "source": "axesso",
                "fetched_at": timestamp.isoformat(),
                "confidence": "high",
                "raw_values": None,
                "conflict_flag": False,
            }

    def _compute_iq_estimates(
        self,
        normalized: dict[str, Any],
        provenance: dict[str, Any],
        timestamp: datetime,
    ):
        """Compute IQ proprietary estimates — average of all available sources,
        single-source value when only one exists, None when none exist."""
        ts = timestamp.isoformat()

        def _iq_multi(vals_map: dict[str, Any], field_name: str):
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
                "redfin": normalized.get("redfin_rental_estimate"),
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

    def _get_nested_value(self, data: dict | None, field: str) -> Any:
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

    def calculate_data_quality(self, normalized: dict[str, Any], provenance: dict[str, Any]) -> dict[str, Any]:
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
            "conflict_fields": conflict_fields,
        }


# Factory function to create clients
def create_api_clients(
    rentcast_api_key: str,
    rentcast_url: str,
    axesso_api_key: str,
    axesso_url: str,
    redfin_api_key: str = "",
    redfin_rapidapi_host: str = "redfin-com-data.p.rapidapi.com",
) -> tuple[RentCastClient, AXESSOClient, DataNormalizer, RedfinClient | None]:
    """Create configured API clients and normalizer."""
    rentcast = RentCastClient(rentcast_api_key, rentcast_url)
    axesso = AXESSOClient(axesso_api_key, axesso_url)
    normalizer = DataNormalizer()
    redfin = (
        RedfinClient(redfin_api_key, redfin_rapidapi_host)
        if redfin_api_key and redfin_rapidapi_host
        else None
    )

    return rentcast, axesso, normalizer, redfin
