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
from statistics import median
from typing import Any

from app.services.base_client import BaseAPIClient, BaseAPIResponse

logger = logging.getLogger(__name__)


class APIProvider(StrEnum):
    RENTCAST = "rentcast"
    AXESSO = "axesso"
    REDFIN = "redfin"
    REALTOR = "realtor"
    MASHVISOR = "mashvisor"


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

    async def get_sale_listings(
        self,
        latitude: float | None = None,
        longitude: float | None = None,
        radius: float | None = None,
        zip_code: str | None = None,
        city: str | None = None,
        state: str | None = None,
        property_type: str | None = None,
        status: str = "Active",
        days_old: int | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> APIResponse:
        """Search for sale listings in a geographic area.

        ``latitude``/``longitude`` MUST be paired with ``radius`` for a
        circular area search. Per RentCast's docs, providing lat/lng
        alone causes the API to silently fall back to its default
        ``city="Austin"``, ``state="TX"`` parameters and return Texas
        listings instead of properties near the requested coordinates.
        """
        params: dict[str, Any] = {"limit": limit, "offset": offset, "status": status}
        if latitude is not None:
            params["latitude"] = latitude
        if longitude is not None:
            params["longitude"] = longitude
        if radius is not None:
            # RentCast caps radius at 100 miles; clamp defensively so a
            # caller-provided value never trips a 4xx response.
            params["radius"] = max(0.5, min(radius, 100.0))
        if zip_code:
            params["zipCode"] = zip_code
        if city:
            params["city"] = city
        if state:
            params["state"] = state
        if property_type:
            params["propertyType"] = property_type
        if days_old is not None:
            params["daysOld"] = days_old

        return await self._make_request("listings/sale", params)

    async def get_rental_listings(
        self,
        latitude: float | None = None,
        longitude: float | None = None,
        radius: float | None = None,
        zip_code: str | None = None,
        city: str | None = None,
        state: str | None = None,
        property_type: str | None = None,
        status: str = "Active",
        days_old: int | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> APIResponse:
        """Search for long-term rental listings in a geographic area.

        ``latitude``/``longitude`` MUST be paired with ``radius`` for a
        circular area search. Per RentCast's docs, providing lat/lng
        alone causes the API to silently fall back to its default
        ``city="Austin"``, ``state="TX"`` parameters and return Texas
        listings instead of properties near the requested coordinates.
        """
        params: dict[str, Any] = {"limit": limit, "offset": offset, "status": status}
        if latitude is not None:
            params["latitude"] = latitude
        if longitude is not None:
            params["longitude"] = longitude
        if radius is not None:
            params["radius"] = max(0.5, min(radius, 100.0))
        if zip_code:
            params["zipCode"] = zip_code
        if city:
            params["city"] = city
        if state:
            params["state"] = state
        if property_type:
            params["propertyType"] = property_type
        if days_old is not None:
            params["daysOld"] = days_old

        return await self._make_request("listings/rental/long-term", params)


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
        """Return AXESSO authentication headers.

        Sends both ``axesso-api-key`` (legacy) and ``Ocp-Apim-Subscription-Key``
        (Azure API Management standard) for gateway compatibility.
        """
        return {
            "axesso-api-key": self.api_key,
            "Ocp-Apim-Subscription-Key": self.api_key,
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

    Two-step flow:
      1. GET /properties/auto-complete?query=<address> → extract ``url`` from first match
      2. GET /properties/details?url=<url>             → extract value + rental estimates

    Response paths (verified against live API):
      Value:  data.aboveTheFold.addressSectionInfo.avmInfo.predictedValue
      Rental: data["rental-estimate"].rentalEstimateInfo.predictedValue
    """

    _SUFFIX_SWAPS: dict[str, list[str]] = {
        "Cir": ["Ct", "Circle"],
        "Ct": ["Cir", "Court"],
        "Circle": ["Court", "Cir"],
        "Court": ["Circle", "Ct"],
        "St": ["Street"],
        "Street": ["St"],
        "Dr": ["Drive"],
        "Drive": ["Dr"],
        "Rd": ["Road"],
        "Road": ["Rd"],
        "Ave": ["Avenue"],
        "Avenue": ["Ave"],
        "Ln": ["Lane"],
        "Lane": ["Ln"],
        "Blvd": ["Boulevard"],
        "Boulevard": ["Blvd"],
        "Pl": ["Place"],
        "Place": ["Pl"],
        "Ter": ["Terrace"],
        "Terrace": ["Ter"],
        "Pkwy": ["Parkway"],
        "Parkway": ["Pkwy"],
        "Way": ["Wy"],
        "Wy": ["Way"],
    }

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

    async def get_details(self, url_path: str) -> APIResponse:
        """GET /properties/details?url=<redfin-url-path>."""
        return await self._make_request(
            "properties/details",
            params={"url": url_path},
        )

    @staticmethod
    def _extract_url_from_autocomplete(data: Any) -> str | None:
        """
        Extract the Redfin URL path from auto-complete response.

        Primary shape:
          { "data": [ { "rows": [ { "url": "/TN/Franklin/...", ... } ] } ] }

        Also handles wrapped responses where ``data`` is a dict containing
        a nested list under various keys (``data``, ``sections``, ``categories``).
        """
        if not isinstance(data, dict):
            return None

        def _scan_categories(categories: list) -> str | None:
            for category in categories:
                if not isinstance(category, dict):
                    continue
                rows = category.get("rows")
                if not isinstance(rows, list):
                    continue
                for row in rows:
                    if isinstance(row, dict) and row.get("url"):
                        return str(row["url"])
            return None

        top = data.get("data")
        if isinstance(top, list):
            return _scan_categories(top)

        if isinstance(top, dict):
            for key in ("data", "sections", "categories"):
                nested = top.get(key)
                if isinstance(nested, list):
                    result = _scan_categories(nested)
                    if result:
                        return result
            rows = top.get("rows")
            if isinstance(rows, list):
                for row in rows:
                    if isinstance(row, dict) and row.get("url"):
                        return str(row["url"])

        return None

    @staticmethod
    def _parse_details_response(data: Any) -> dict[str, Any]:
        """
        Extract redfin_estimate and redfin_rental_estimate from /properties/details.

        Value path:  data.aboveTheFold.addressSectionInfo.avmInfo.predictedValue
        Rental path: data["rental-estimate"].rentalEstimateInfo.predictedValue
        """
        result: dict[str, Any] = {}
        if not isinstance(data, dict):
            return result
        payload = data.get("data")
        if not isinstance(payload, dict):
            return result

        def _safe_float(v: Any) -> float | None:
            if v is None:
                return None
            try:
                return float(v)
            except (TypeError, ValueError):
                return None

        # Value estimate
        atf = payload.get("aboveTheFold")
        if isinstance(atf, dict):
            addr_info = atf.get("addressSectionInfo")
            if isinstance(addr_info, dict):
                avm = addr_info.get("avmInfo")
                if isinstance(avm, dict):
                    result["redfin_estimate"] = _safe_float(avm.get("predictedValue"))
                if result.get("redfin_estimate") is None:
                    price_info = addr_info.get("priceInfo")
                    if isinstance(price_info, dict):
                        result["redfin_estimate"] = _safe_float(price_info.get("amount"))

        # Rental estimate (kebab-case key from real API)
        rental = payload.get("rental-estimate") or payload.get("rentalEstimate")
        if isinstance(rental, dict):
            rental_info = rental.get("rentalEstimateInfo")
            if isinstance(rental_info, dict) and rental_info.get("shouldShow", True):
                result["redfin_rental_estimate"] = _safe_float(rental_info.get("predictedValue"))

        return result

    @staticmethod
    def _address_suffix_variants(address: str) -> list[str]:
        """Generate alternative addresses by swapping common street suffixes.

        Only operates on the street portion (before the first comma) to avoid
        false matches in city names or state abbreviations.
        """
        import re

        parts = address.split(",", 1)
        street = parts[0]
        rest = "," + parts[1] if len(parts) > 1 else ""

        variants: list[str] = []
        for suffix, alts in RedfinClient._SUFFIX_SWAPS.items():
            pattern = re.compile(r"\b" + re.escape(suffix) + r"\b", re.IGNORECASE)
            if pattern.search(street):
                for alt in alts:
                    new_street = pattern.sub(alt, street, count=1)
                    if new_street != street:
                        variants.append(new_street + rest)
        return variants

    async def get_property_estimate(self, address: str) -> dict[str, Any] | None:
        """
        Two-step lookup: auto-complete(address) → details(url).

        Returns dict with redfin_estimate and redfin_rental_estimate, or None.
        If the initial autocomplete finds no match, retries with common street
        suffix substitutions (e.g. Cir → Ct) to handle data-source mismatches.
        """
        # Step 1: auto-complete → extract URL path
        ac_resp = await self.auto_complete(address)
        if not ac_resp.success or not ac_resp.data:
            logger.warning(
                "Redfin step 1 FAILED: auto-complete success=%s, error=%s",
                ac_resp.success,
                ac_resp.error,
            )
            return None

        url_path = self._extract_url_from_autocomplete(ac_resp.data)

        # Retry with street-suffix variants when autocomplete returns no URL
        if not url_path:
            for variant in self._address_suffix_variants(address):
                ac_retry = await self.auto_complete(variant)
                if ac_retry.success and ac_retry.data:
                    url_path = self._extract_url_from_autocomplete(ac_retry.data)
                    if url_path:
                        logger.info("Redfin suffix retry OK: %r → url=%s", variant, url_path)
                        break

        if not url_path:
            import json as _json

            _preview = ""
            try:
                _preview = _json.dumps(ac_resp.data, default=str)[:500]
            except Exception:
                _preview = str(type(ac_resp.data))
            logger.warning(
                "Redfin step 1 FAILED: no URL found in auto-complete response (keys=%s, preview=%s)",
                list(ac_resp.data.keys()) if isinstance(ac_resp.data, dict) else type(ac_resp.data).__name__,
                _preview,
            )
            return None
        logger.info("Redfin step 1 OK: auto-complete → url=%s", url_path)

        # Step 2: details → extract value + rental
        det_resp = await self.get_details(url_path)
        if not det_resp.success or not det_resp.data:
            logger.warning(
                "Redfin step 2 FAILED: details(%s) success=%s, error=%s",
                url_path,
                det_resp.success,
                det_resp.error,
            )
            return None

        parsed = self._parse_details_response(det_resp.data)
        logger.info(
            "Redfin step 2 OK: details → redfin_estimate=%s, redfin_rental_estimate=%s",
            parsed.get("redfin_estimate"),
            parsed.get("redfin_rental_estimate"),
        )
        return parsed if (parsed.get("redfin_estimate") or parsed.get("redfin_rental_estimate")) else None


class RealtorClient(BaseAPIClient[APIResponse]):
    """
    Client for Realtor.com API via RapidAPI (realtor-search.p.rapidapi.com).

    Two-step flow:
      1. GET /properties/auto-complete?input=<address> → extract ``mpr_id`` from first address match
      2. GET /properties/detail?propertyId=<mpr_id>    → extract value estimate from estimates.current_values

    Response paths (verified against live API):
      Value: data.estimates.current_values → item where isbest_homevalue=true → estimate
    """

    def __init__(
        self,
        api_key: str,
        rapidapi_host: str = "realtor-search.p.rapidapi.com",
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
            provider=APIProvider.REALTOR,
            raw_response=raw_response,
        )

    def _get_provider_name(self) -> str:
        return "REALTOR"

    async def auto_complete(self, query: str) -> APIResponse:
        """GET /properties/auto-complete?input=."""
        return await self._make_request(
            "properties/auto-complete",
            params={"input": query},
        )

    async def get_detail(self, property_id: str) -> APIResponse:
        """GET /properties/detail?propertyId=."""
        return await self._make_request(
            "properties/detail",
            params={"propertyId": property_id},
        )

    @staticmethod
    def _extract_property_id_from_autocomplete(data: Any) -> str | None:
        """
        Extract mpr_id from auto-complete response.

        Response shape:
          { "data": { "autocomplete": [ { "area_type": "address", "mpr_id": "...", ... } ] } }
        """
        if not isinstance(data, dict):
            return None
        inner = data.get("data")
        if not isinstance(inner, dict):
            return None
        suggestions = inner.get("autocomplete")
        if not isinstance(suggestions, list):
            return None
        for item in suggestions:
            if not isinstance(item, dict):
                continue
            if item.get("area_type") == "address" and item.get("mpr_id"):
                return str(item["mpr_id"])
        # Fallback: first item with an mpr_id
        for item in suggestions:
            if isinstance(item, dict) and item.get("mpr_id"):
                return str(item["mpr_id"])
        return None

    @staticmethod
    def _parse_detail_response(data: Any) -> dict[str, Any]:
        """
        Extract realtor_estimate from /properties/detail response.

        Value path: data.estimates.current_values → best or average
        """
        result: dict[str, Any] = {}
        if not isinstance(data, dict):
            return result
        payload = data.get("data")
        if not isinstance(payload, dict):
            return result

        def _safe_float(v: Any) -> float | None:
            if v is None:
                return None
            try:
                return float(v)
            except (TypeError, ValueError):
                return None

        estimates = payload.get("estimates")
        if isinstance(estimates, dict):
            current_values = estimates.get("current_values")
            if isinstance(current_values, list) and current_values:
                best = next(
                    (v for v in current_values if isinstance(v, dict) and v.get("isbest_homevalue")),
                    None,
                )
                if best:
                    result["realtor_estimate"] = _safe_float(best.get("estimate"))
                if result.get("realtor_estimate") is None:
                    for v in current_values:
                        if isinstance(v, dict):
                            val = _safe_float(v.get("estimate"))
                            if val is not None:
                                result["realtor_estimate"] = val
                                break

        return result

    async def get_property_estimate(self, address: str) -> dict[str, Any] | None:
        """
        Two-step lookup: auto-complete(address) → detail(propertyId).

        Returns dict with realtor_estimate, or None.
        """
        # Step 1: auto-complete → extract propertyId (mpr_id)
        ac_resp = await self.auto_complete(address)
        if not ac_resp.success or not ac_resp.data:
            logger.warning(
                "Realtor step 1 FAILED: auto-complete success=%s, error=%s",
                ac_resp.success,
                ac_resp.error,
            )
            return None

        property_id = self._extract_property_id_from_autocomplete(ac_resp.data)
        if not property_id:
            logger.warning(
                "Realtor step 1 FAILED: no mpr_id found in auto-complete response",
            )
            return None
        logger.info("Realtor step 1 OK: auto-complete → propertyId=%s", property_id)

        # Step 2: detail → extract value estimate
        det_resp = await self.get_detail(property_id)
        if not det_resp.success or not det_resp.data:
            logger.warning(
                "Realtor step 2 FAILED: detail(%s) success=%s, error=%s",
                property_id,
                det_resp.success,
                det_resp.error,
            )
            return None

        parsed = self._parse_detail_response(det_resp.data)
        logger.info(
            "Realtor step 2 OK: detail → realtor_estimate=%s",
            parsed.get("realtor_estimate"),
        )
        return parsed if parsed.get("realtor_estimate") else None


class MashvisorClient(BaseAPIClient[APIResponse]):
    """
    Client for Mashvisor API via RapidAPI.

    Provides STR analytics (ADR, occupancy, seasonality, comps) and
    regulatory data that replace DealGapIQ's hardcoded STR defaults.
    """

    def __init__(
        self,
        api_key: str,
        rapidapi_host: str = "mashvisor-api.p.rapidapi.com",
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
            provider=APIProvider.MASHVISOR,
            raw_response=raw_response,
        )

    def _get_provider_name(self) -> str:
        return "MASHVISOR"

    async def str_lookup(
        self,
        state: str,
        city: str,
        zip_code: str,
        beds: int = 3,
        address: str | None = None,
    ) -> APIResponse:
        """GET /rento-calculator/lookup — STR pro forma for a location."""
        params: dict[str, Any] = {
            "state": state,
            "city": city,
            "zip_code": zip_code,
            "resource": "airbnb",
            "beds": beds,
        }
        if address:
            params["address"] = address
        return await self._make_request("rento-calculator/lookup", params)

    async def str_historical(
        self,
        state: str,
        city: str,
        zip_code: str,
        beds: int = 3,
    ) -> APIResponse:
        """GET /rento-calculator/historical-performance — 12-36 months of monthly STR data."""
        return await self._make_request(
            "rento-calculator/historical-performance",
            {
                "state": state,
                "city": city,
                "zip_code": zip_code,
                "resource": "airbnb",
                "beds": beds,
                "limit_recent_months": "false",
            },
        )

    async def str_regulatory(self, state: str, city: str) -> APIResponse:
        """GET /airbnb-property/short-term-regulatory — STR legality for a city."""
        return await self._make_request(
            "airbnb-property/short-term-regulatory",
            {"state": state, "city": city},
        )

    def parse_str_lookup(self, data: Any) -> dict[str, Any]:
        """Extract STR metrics from rento-calculator/lookup response."""
        result: dict[str, Any] = {}
        if not isinstance(data, dict):
            return result
        content = data.get("content")
        if not isinstance(content, dict):
            return result

        def _safe_float(v: Any) -> float | None:
            if v is None:
                return None
            try:
                return float(v)
            except (TypeError, ValueError):
                return None

        def _safe_int(v: Any) -> int | None:
            if v is None:
                return None
            try:
                return int(v)
            except (TypeError, ValueError):
                return None

        result["str_occupancy_mashvisor"] = _safe_float(content.get("median_occupancy_rate"))
        result["str_adr_mashvisor"] = _safe_float(content.get("median_night_rate"))
        result["str_revenue_annual"] = _safe_float(content.get("median_annual_revenue"))
        result["str_sample_size"] = _safe_int(content.get("sample_size"))
        result["str_city_fallback"] = bool(content.get("city_insights_fallback", False))
        result["str_cash_flow"] = _safe_float(content.get("cash_flow"))
        result["str_cap_rate"] = _safe_float(content.get("cap_rate"))
        result["str_revpar"] = _safe_float(content.get("revpar"))
        result["str_tax_rate"] = _safe_float(content.get("tax_rate"))
        result["str_median_home_value"] = _safe_float(content.get("median_home_value"))

        # Determine confidence based on sample size and fallback status
        sample = result.get("str_sample_size")
        fallback = result.get("str_city_fallback", False)
        if fallback or (sample is not None and sample < 10):
            result["str_confidence"] = "low"
        elif sample is not None and sample < 30:
            result["str_confidence"] = "medium"
        else:
            result["str_confidence"] = "high"

        return result

    def parse_str_historical(self, data: Any) -> dict[str, Any]:
        """Extract YoY changes from historical-performance response."""
        result: dict[str, Any] = {}
        if not isinstance(data, dict):
            return result
        content = data.get("content")
        if not isinstance(content, dict):
            return result

        def _safe_float(v: Any) -> float | None:
            if v is None:
                return None
            try:
                return float(v)
            except (TypeError, ValueError):
                return None

        result["str_yoy_occupancy"] = _safe_float(content.get("occupancy_yoy_changes"))
        result["str_yoy_income"] = _safe_float(content.get("rental_income_yoy_changes"))
        result["str_yoy_adr"] = _safe_float(content.get("night_price_yoy_changes"))
        return result

    def parse_str_regulatory(self, data: Any) -> dict[str, Any]:
        """Extract regulatory info from short-term-regulatory response."""
        result: dict[str, Any] = {}
        if not isinstance(data, dict):
            return result

        if data.get("status") != "success":
            return result

        content = data.get("content", {})
        reg_list = content.get("list", [])
        if not isinstance(reg_list, list) or not reg_list:
            return result

        reg = reg_list[0] if isinstance(reg_list[0], dict) else {}
        result["str_reg_rating"] = reg.get("rating")
        result["str_reg_day_limit"] = None
        day_limit = reg.get("occupied_days_limit")
        if day_limit is not None:
            try:
                result["str_reg_day_limit"] = int(day_limit)
            except (TypeError, ValueError):
                pass
        result["str_reg_permit_fee"] = reg.get("permit_fee")
        result["str_reg_rules_summary"] = reg.get("rules_summary")
        result["str_reg_rules_source"] = reg.get("rules_source")
        result["str_reg_legal_for_occupied"] = reg.get("Legal_for_occupied")
        return result

    # --- Rental rates endpoints (per-bedroom monthly rent benchmarks) ---------

    async def traditional_rental_rates(
        self,
        state: str,
        city: str,
        zip_code: str,
    ) -> APIResponse:
        """GET /rental-rates?source=traditional — per-bedroom monthly LTR rent."""
        return await self._make_request(
            "rental-rates",
            {
                "state": state,
                "city": city,
                "zip_code": zip_code,
                "source": "traditional",
            },
        )

    async def airbnb_rental_rates(
        self,
        state: str,
        city: str,
        zip_code: str,
    ) -> APIResponse:
        """GET /rental-rates?source=airbnb — per-bedroom monthly Airbnb revenue."""
        return await self._make_request(
            "rental-rates",
            {
                "state": state,
                "city": city,
                "zip_code": zip_code,
                "source": "airbnb",
            },
        )

    @staticmethod
    def parse_rental_rates(data: Any, bedrooms: int | None) -> dict[str, Any]:
        """Extract bedroom-matched monthly rent from /rental-rates response.

        Mashvisor returns flat per-bedroom buckets at
        ``content.retnal_rates.{zero,one,two,three,four}_room_value`` (note the
        misspelling in their schema) and a parallel ``detailed[]`` array with
        per-bedroom sample counts and min/max/avg/median.

        Bedroom matching:
          - 0 → zero_room_value, 1 → one_room_value, ... 3 → three_room_value
          - >= 4 → four_room_value (cap; do not extrapolate)
          - None → three_room_value (median household), confidence = medium

        Confidence (mirrors parse_str_lookup):
          - sample_count >= 30 → high
          - sample_count >= 10 → medium
          - sample_count < 10 or missing → low
        """
        result: dict[str, Any] = {
            "monthly_rate": None,
            "sample_count": None,
            "matched_bedrooms": None,
            "confidence": "low",
        }
        if not isinstance(data, dict):
            return result
        content = data.get("content")
        if not isinstance(content, dict):
            return result

        # Mashvisor's payload misspells "rental" as "retnal" — guard for both.
        rates = content.get("retnal_rates") or content.get("rental_rates")
        if not isinstance(rates, dict):
            return result

        bedroom_keys = {
            0: "zero_room_value",
            1: "one_room_value",
            2: "two_room_value",
            3: "three_room_value",
            4: "four_room_value",
        }

        if bedrooms is None:
            matched = 3
            confidence_floor = "medium"
        else:
            matched = max(0, min(int(bedrooms), 4))
            confidence_floor = None

        key = bedroom_keys[matched]
        raw_value = rates.get(key)
        try:
            monthly = float(raw_value) if raw_value is not None else None
        except (TypeError, ValueError):
            monthly = None

        result["monthly_rate"] = monthly
        result["matched_bedrooms"] = matched

        # Pull sample count from detailed[] for the matched bedroom bucket.
        detailed = content.get("detailed")
        sample_count: int | None = None
        if isinstance(detailed, list):
            for row in detailed:
                if not isinstance(row, dict):
                    continue
                try:
                    row_beds = int(row.get("beds"))
                except (TypeError, ValueError):
                    continue
                if row_beds == matched:
                    raw_count = row.get("count")
                    try:
                        sample_count = int(raw_count) if raw_count is not None else None
                    except (TypeError, ValueError):
                        sample_count = None
                    break
        # Fall back to the response-level sample_count when a per-bedroom
        # bucket wasn't returned (small markets often only have a single
        # rolled-up count at the top level).
        if sample_count is None:
            top_count = content.get("sample_count")
            try:
                sample_count = int(top_count) if top_count is not None else None
            except (TypeError, ValueError):
                sample_count = None

        result["sample_count"] = sample_count

        if monthly is None:
            result["confidence"] = "low"
        elif sample_count is not None and sample_count >= 30:
            result["confidence"] = "high"
        elif sample_count is not None and sample_count >= 10:
            result["confidence"] = "medium"
        else:
            result["confidence"] = "low"

        # Floor confidence at "medium" when we defaulted bedrooms (so the
        # caller can distinguish a 3BR-default match from a true 3BR match).
        if confidence_floor == "medium" and result["confidence"] == "high":
            result["confidence"] = "medium"

        return result

    # --- Map search endpoints --------------------------------------------------

    async def heatmap(
        self,
        state: str,
        sw_lat: float,
        sw_lng: float,
        ne_lat: float,
        ne_lng: float,
        metric_type: str = "AirbnbCoc",
    ) -> APIResponse:
        """GET /search/heatmap — investment heatmap polygons for a bounding box."""
        return await self._make_request(
            "search/heatmap",
            {
                "state": state,
                "sw_lat": sw_lat,
                "sw_lng": sw_lng,
                "ne_lat": ne_lat,
                "ne_lng": ne_lng,
                "type": metric_type,
            },
        )

    async def city_neighborhoods(self, state: str, city: str) -> APIResponse:
        """GET /city/neighborhoods/{state}/{city} — list neighborhoods with lat/lng."""
        return await self._make_request(f"city/neighborhoods/{state}/{city}")

    async def neighborhood_overview(self, neighborhood_id: int, state: str) -> APIResponse:
        """GET /neighborhood/{id}/bar — investment scorecard for a neighborhood."""
        return await self._make_request(
            f"neighborhood/{neighborhood_id}/bar",
            {"state": state},
        )

    async def neighborhood_airbnb_listings(
        self, neighborhood_id: int, state: str, page: int = 1, items: int = 50
    ) -> APIResponse:
        """GET /neighborhood/{id}/airbnb/details — active Airbnb listings in a neighborhood."""
        return await self._make_request(
            f"neighborhood/{neighborhood_id}/airbnb/details",
            {"state": state, "page": page, "items": items},
        )

    async def city_investment(self, state: str, city: str) -> APIResponse:
        """GET /city/investment/{state}/{city} — city-level investment overview."""
        return await self._make_request(f"city/investment/{state}/{city}")


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
        # Property Features (AXESSO primary — RentCast features extracted separately)
        "stories": (None, "stories", "axesso"),
        "has_pool": (None, "hasPool", "axesso"),
        "has_garage": (None, "hasGarage", "axesso"),
        "garage_spaces": (None, "parkingSpaces", "axesso"),
        "hoa_fees_monthly": (None, "hoaFee", "axesso"),
    }

    def __init__(self):
        self.conflict_threshold = 0.15  # 15% difference triggers conflict flag
        self.iq_outlier_threshold = 0.20  # 20% median-band filter for IQ estimates

    def normalize(
        self,
        rentcast_data: dict[str, Any] | None,
        axesso_data: dict[str, Any] | None,
        timestamp: datetime,
        redfin_data: dict[str, Any] | None = None,
        realtor_data: dict[str, Any] | None = None,
        mashvisor_data: dict[str, Any] | None = None,
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

        # Inject Redfin estimate as a standalone source (bypasses FIELD_MAPPING)
        self._inject_redfin_data(normalized, provenance, redfin_data, timestamp)

        # Inject Realtor.com estimate as a standalone source (bypasses FIELD_MAPPING)
        self._inject_realtor_data(normalized, provenance, realtor_data, timestamp)

        # Inject Mashvisor STR data (bypasses FIELD_MAPPING — separate data surface)
        self._inject_mashvisor_data(normalized, provenance, mashvisor_data, timestamp)

        # Extract property features from RentCast features dict and AXESSO resoFacts
        self._extract_property_features(normalized, rentcast_data, axesso_data)

        # Extract market statistics if present in RentCast data
        market_stats_data = rentcast_data.get("market_statistics") if rentcast_data else None
        self._extract_market_statistics(normalized, market_stats_data)

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

    def _inject_realtor_data(
        self,
        normalized: dict[str, Any],
        provenance: dict[str, Any],
        realtor_data: dict[str, Any] | None,
        timestamp: datetime,
    ):
        """Inject Realtor.com value estimate into normalized data."""
        ts = timestamp.isoformat()
        val = realtor_data.get("realtor_estimate") if realtor_data else None
        if val is not None:
            try:
                val = float(val)
            except (TypeError, ValueError):
                val = None
        normalized["realtor_estimate"] = val
        provenance["realtor_estimate"] = {
            "source": "realtor" if val is not None else "missing",
            "fetched_at": ts,
            "confidence": "high" if val is not None else "low",
            "raw_values": {"realtor": val} if val is not None else None,
            "conflict_flag": False,
        }

    def _inject_mashvisor_data(
        self,
        normalized: dict[str, Any],
        provenance: dict[str, Any],
        mashvisor_data: dict[str, Any] | None,
        timestamp: datetime,
    ):
        """Inject Mashvisor STR analytics and regulatory data into normalized output.

        When Mashvisor provides high/medium confidence STR data, it overrides
        AXESSO-sourced ADR/occupancy (or fills in when AXESSO is missing).
        """
        ts = timestamp.isoformat()
        mashvisor_fields = [
            "str_occupancy_mashvisor", "str_adr_mashvisor", "str_revenue_annual",
            "str_sample_size", "str_city_fallback", "str_confidence",
            "str_cash_flow", "str_cap_rate", "str_revpar", "str_tax_rate",
            "str_yoy_occupancy", "str_yoy_income", "str_yoy_adr",
            "str_reg_rating", "str_reg_day_limit", "str_reg_permit_fee",
            "str_reg_rules_summary", "str_reg_rules_source",
            "str_reg_legal_for_occupied",
            # /rental-rates traditional → drives RentalMarketStatistics.mashvisor_estimate
            "rental_mashvisor_estimate",
            "rental_mashvisor_sample_count",
            "rental_mashvisor_bedrooms",
            "rental_mashvisor_confidence",
            # /rental-rates airbnb → canonical STR monthly-revenue fallback
            "str_monthly_revenue_mashvisor",
            "str_monthly_revenue_sample_size",
            "str_monthly_revenue_bedrooms",
            "str_monthly_revenue_confidence",
        ]

        if not mashvisor_data:
            for field in mashvisor_fields:
                normalized[field] = None
                provenance[field] = {
                    "source": "missing", "fetched_at": ts,
                    "confidence": "low", "raw_values": None, "conflict_flag": False,
                }
            return

        confidence = mashvisor_data.get("str_confidence", "low")
        prov_confidence = confidence if confidence in ("high", "medium", "low") else "low"

        # Bedroom-matched parsing for /rental-rates responses. The fetcher
        # stashes the raw Mashvisor responses under "_rental_rates_*_raw"; do
        # the per-bedroom selection here, where the FIELD_MAPPING loop has
        # already populated normalized["bedrooms"] from RentCast/AXESSO.
        beds_raw = normalized.get("bedrooms")
        try:
            beds = int(beds_raw) if beds_raw is not None else None
        except (TypeError, ValueError):
            beds = None

        trad_raw = mashvisor_data.get("_rental_rates_traditional_raw")
        if trad_raw is not None:
            parsed_trad = MashvisorClient.parse_rental_rates(trad_raw, beds)
            mashvisor_data["rental_mashvisor_estimate"] = parsed_trad["monthly_rate"]
            mashvisor_data["rental_mashvisor_sample_count"] = parsed_trad["sample_count"]
            mashvisor_data["rental_mashvisor_bedrooms"] = parsed_trad["matched_bedrooms"]
            mashvisor_data["rental_mashvisor_confidence"] = parsed_trad["confidence"]

        airbnb_raw = mashvisor_data.get("_rental_rates_airbnb_raw")
        if airbnb_raw is not None:
            parsed_airbnb = MashvisorClient.parse_rental_rates(airbnb_raw, beds)
            mashvisor_data["str_monthly_revenue_mashvisor"] = parsed_airbnb["monthly_rate"]
            mashvisor_data["str_monthly_revenue_sample_size"] = parsed_airbnb["sample_count"]
            mashvisor_data["str_monthly_revenue_bedrooms"] = parsed_airbnb["matched_bedrooms"]
            mashvisor_data["str_monthly_revenue_confidence"] = parsed_airbnb["confidence"]

        for field in mashvisor_fields:
            val = mashvisor_data.get(field)
            # Use field-specific confidence when present (rental-rates have
            # their own sample-size-driven confidence, distinct from the
            # str_lookup confidence). Otherwise default to the str_lookup tier.
            field_conf: str
            if field.startswith("rental_mashvisor_") and mashvisor_data.get("rental_mashvisor_confidence"):
                rc = mashvisor_data.get("rental_mashvisor_confidence")
                field_conf = rc if rc in ("high", "medium", "low") else "low"
            elif field.startswith("str_monthly_revenue_") and mashvisor_data.get("str_monthly_revenue_confidence"):
                rc = mashvisor_data.get("str_monthly_revenue_confidence")
                field_conf = rc if rc in ("high", "medium", "low") else "low"
            else:
                field_conf = prov_confidence
            normalized[field] = val
            provenance[field] = {
                "source": "mashvisor" if val is not None else "missing",
                "fetched_at": ts,
                "confidence": field_conf if val is not None else "low",
                "raw_values": {"mashvisor": val} if val is not None else None,
                "conflict_flag": False,
            }

        # Override AXESSO STR fields when Mashvisor has med/high confidence data
        m_occ = mashvisor_data.get("str_occupancy_mashvisor")
        m_adr = mashvisor_data.get("str_adr_mashvisor")
        if confidence in ("high", "medium"):
            if m_occ is not None:
                normalized["occupancy_rate"] = m_occ / 100.0  # Mashvisor is 0-100, we store 0-1
                provenance["occupancy_rate"] = {
                    "source": "mashvisor", "fetched_at": ts,
                    "confidence": prov_confidence,
                    "raw_values": {"mashvisor": m_occ, "axesso": provenance.get("occupancy_rate", {}).get("raw_values", {}).get("axesso")},
                    "conflict_flag": False,
                }
            if m_adr is not None:
                normalized["average_daily_rate"] = m_adr
                provenance["average_daily_rate"] = {
                    "source": "mashvisor", "fetched_at": ts,
                    "confidence": prov_confidence,
                    "raw_values": {"mashvisor": m_adr, "axesso": provenance.get("average_daily_rate", {}).get("raw_values", {}).get("axesso")},
                    "conflict_flag": False,
                }

    def _extract_property_features(
        self,
        normalized: dict[str, Any],
        rentcast_data: dict[str, Any] | None,
        axesso_data: dict[str, Any] | None,
    ):
        """Extract property features from RentCast features array and AXESSO resoFacts."""
        if not rentcast_data and not axesso_data:
            return

        features = rentcast_data.get("features") if rentcast_data else None
        if isinstance(features, dict):
            if normalized.get("heating_type") is None:
                normalized["heating_type"] = features.get("heatingType") or features.get("heating")
            if normalized.get("cooling_type") is None:
                normalized["cooling_type"] = features.get("coolingType") or features.get("cooling")
            if normalized.get("has_heating") is None:
                ht = normalized.get("heating_type")
                normalized["has_heating"] = ht is not None and str(ht).lower() not in ("none", "")
            if normalized.get("has_cooling") is None:
                ct = normalized.get("cooling_type")
                normalized["has_cooling"] = ct is not None and str(ct).lower() not in ("none", "")
            if normalized.get("exterior_type") is None:
                normalized["exterior_type"] = features.get("exteriorType")
            if normalized.get("roof_type") is None:
                normalized["roof_type"] = features.get("roofType")
            if normalized.get("foundation_type") is None:
                normalized["foundation_type"] = features.get("foundationType")
            if normalized.get("has_fireplace") is None:
                fp = features.get("fireplace")
                if isinstance(fp, bool):
                    normalized["has_fireplace"] = fp
                elif isinstance(fp, (int, float)):
                    normalized["has_fireplace"] = fp > 0
                    normalized["fireplace_count"] = int(fp) if fp > 0 else None
            if normalized.get("view_type") is None:
                normalized["view_type"] = features.get("viewType")
            if normalized.get("stories") is None:
                fc = features.get("floorCount")
                if fc is not None:
                    try:
                        normalized["stories"] = int(fc)
                    except (TypeError, ValueError):
                        pass
            if normalized.get("has_pool") is None:
                pool = features.get("pool")
                if isinstance(pool, bool):
                    normalized["has_pool"] = pool
            if normalized.get("has_garage") is None:
                garage = features.get("garage")
                if isinstance(garage, bool):
                    normalized["has_garage"] = garage
            if normalized.get("garage_spaces") is None:
                gs = features.get("garageSpaces")
                if gs is not None:
                    try:
                        normalized["garage_spaces"] = int(gs)
                    except (TypeError, ValueError):
                        pass

        reso = axesso_data.get("resoFacts") if axesso_data else None
        if isinstance(reso, dict):
            if normalized.get("heating_type") is None:
                heating = reso.get("heating")
                if isinstance(heating, list) and heating:
                    normalized["heating_type"] = ", ".join(str(h) for h in heating)
                    normalized["has_heating"] = True
            if normalized.get("cooling_type") is None:
                cooling = reso.get("cooling")
                if isinstance(cooling, list) and cooling:
                    normalized["cooling_type"] = ", ".join(str(c) for c in cooling)
                    normalized["has_cooling"] = True
            if normalized.get("roof_type") is None:
                roof = reso.get("roofType")
                if roof:
                    normalized["roof_type"] = roof
            if normalized.get("exterior_type") is None:
                ext = reso.get("exteriorMaterial")
                if isinstance(ext, list) and ext:
                    normalized["exterior_type"] = ", ".join(str(e) for e in ext)
            if normalized.get("foundation_type") is None:
                fdn = reso.get("foundationDetails")
                if isinstance(fdn, list) and fdn:
                    normalized["foundation_type"] = ", ".join(str(f) for f in fdn)

    def _extract_market_statistics(
        self,
        normalized: dict[str, Any],
        market_data: dict[str, Any] | None,
    ):
        """Extract RentCast market statistics into normalized dict."""
        if not market_data:
            return

        sale = market_data.get("saleData") if isinstance(market_data, dict) else None
        rental = market_data.get("rentalData") if isinstance(market_data, dict) else None

        def _safe_num(val: Any) -> float | int | None:
            if val is None:
                return None
            try:
                f = float(val)
                return int(f) if f == int(f) else f
            except (TypeError, ValueError):
                return None

        if isinstance(sale, dict):
            normalized["market_days_on_market"] = _safe_num(sale.get("medianDaysOnMarket"))
            normalized["market_avg_days_on_market"] = _safe_num(sale.get("averageDaysOnMarket"))
            normalized["market_min_days_on_market"] = _safe_num(sale.get("minDaysOnMarket"))
            normalized["market_max_days_on_market"] = _safe_num(sale.get("maxDaysOnMarket"))
            normalized["market_total_listings"] = _safe_num(sale.get("totalListings"))
            normalized["market_new_listings"] = _safe_num(sale.get("newListings"))
            normalized["market_median_price"] = _safe_num(sale.get("medianPrice"))
            normalized["market_avg_price_sqft"] = _safe_num(sale.get("averagePricePerSquareFoot"))

        if isinstance(rental, dict):
            normalized["rental_market_avg"] = _safe_num(rental.get("averageRent"))
            normalized["rental_market_median"] = _safe_num(rental.get("medianRent"))
            normalized["rental_market_min"] = _safe_num(rental.get("minRent"))
            normalized["rental_market_max"] = _safe_num(rental.get("maxRent"))
            normalized["rental_market_rent_per_sqft"] = _safe_num(rental.get("averageRentPerSquareFoot"))
            normalized["rental_days_on_market"] = _safe_num(rental.get("medianDaysOnMarket"))
            normalized["rental_total_listings"] = _safe_num(rental.get("totalListings"))
            normalized["rental_new_listings"] = _safe_num(rental.get("newListings"))

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
        is_coming_soon = listing_sub_type.get("isComingSoon") or listing_sub_type.get("is_comingSoon", False)

        # Check for new construction
        reso_facts = axesso_data.get("resoFacts", {}) or {}
        is_new_construction = reso_facts.get("isNewConstruction", False)

        # Store individual seller type flags
        normalized["is_foreclosure"] = is_foreclosure
        normalized["is_bank_owned"] = is_bank_owned
        normalized["is_fsbo"] = is_fsbo
        normalized["is_auction"] = is_auction
        normalized["is_new_construction"] = is_new_construction
        normalized["is_coming_soon"] = is_coming_soon

        # Determine seller type using Zillow listingSubType classifications
        seller_type = "FSBA"  # Default — For Sale By Agent
        if is_foreclosure:
            seller_type = "Foreclosure"
        elif is_bank_owned:
            seller_type = "BankOwned"
        elif is_fsbo:
            seller_type = "FSBO"
        elif is_auction:
            seller_type = "Auction"
        elif is_new_construction:
            seller_type = "NewHome"
        elif is_coming_soon:
            seller_type = "ComingSoon"

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
                values_for_average = present
                excluded_outliers: dict[str, float] = {}

                # Filter outliers only when enough sources exist and the median is usable.
                # Keep original behavior if filtering would leave fewer than 2 values.
                if len(present) >= 3:
                    med = median(present.values())
                    if med > 0:
                        lower_bound = med * (1 - self.iq_outlier_threshold)
                        upper_bound = med * (1 + self.iq_outlier_threshold)
                        filtered = {k: v for k, v in present.items() if lower_bound <= v <= upper_bound}
                        outliers = {k: v for k, v in present.items() if k not in filtered}
                        if len(filtered) >= 2:
                            values_for_average = filtered
                            excluded_outliers = outliers

                avg = round(sum(values_for_average.values()) / len(values_for_average))
                normalized[field_name] = avg
                source = next(iter(values_for_average)) if len(values_for_average) == 1 else "merged"
                provenance[field_name] = {
                    "source": source,
                    "fetched_at": ts,
                    "confidence": "medium" if excluded_outliers else "high",
                    "raw_values": present,
                    "filtered_values": values_for_average,
                    "excluded_outliers": excluded_outliers or None,
                    "conflict_flag": bool(excluded_outliers),
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
                "mashvisor": normalized.get("rental_mashvisor_estimate"),
            },
            "rental_iq_estimate",
        )
        _iq_multi(
            {
                "rentcast": normalized.get("rentcast_avm"),
                "axesso": normalized.get("zestimate"),
                "redfin": normalized.get("redfin_estimate"),
                "realtor": normalized.get("realtor_estimate"),
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
    realtor_api_key: str = "",
    realtor_rapidapi_host: str = "realtor-search.p.rapidapi.com",
    mashvisor_api_key: str = "",
    mashvisor_rapidapi_host: str = "mashvisor-api.p.rapidapi.com",
) -> tuple[RentCastClient, AXESSOClient, DataNormalizer, RedfinClient | None, RealtorClient | None, MashvisorClient | None]:
    """Create configured API clients and normalizer."""
    rentcast = RentCastClient(rentcast_api_key, rentcast_url)
    axesso = AXESSOClient(axesso_api_key, axesso_url)
    normalizer = DataNormalizer()
    redfin = RedfinClient(redfin_api_key, redfin_rapidapi_host) if redfin_api_key and redfin_rapidapi_host else None
    realtor = (
        RealtorClient(realtor_api_key, realtor_rapidapi_host) if realtor_api_key and realtor_rapidapi_host else None
    )
    mashvisor = (
        MashvisorClient(mashvisor_api_key, mashvisor_rapidapi_host) if mashvisor_api_key else None
    )

    return rentcast, axesso, normalizer, redfin, realtor, mashvisor
