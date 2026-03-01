"""
Property service - orchestrates data fetching, normalization, and calculations.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.core.formulas import compute_market_price
from app.schemas.analytics import IQVerdictInput
from app.schemas.property import (
    Address,
    AllAssumptions,
    AnalyticsResponse,
    BRRRRResults,
    DataQuality,
    FieldProvenance,
    FlipResults,
    HouseHackResults,
    ListingInfo,
    LTRResults,
    MarketData,
    MarketStatistics,
    PropertyDetails,
    PropertyResponse,
    ProvenanceMap,
    RentalData,
    RentalMarketStatistics,
    StrategyType,
    STRResults,
    ValuationData,
    WholesaleResults,
)
from app.services.api_clients import create_api_clients
from app.services.cache_service import CacheService, get_cache_service
from app.services.calculators import (
    calculate_brrrr,
    calculate_flip,
    calculate_house_hack,
    calculate_ltr,
    calculate_str,
    calculate_wholesale,
)
from app.services.iq_verdict_service import compute_iq_verdict
from app.services.zillow_client import create_zillow_client

logger = logging.getLogger(__name__)


class PropertyService:
    """
    Main service for property data operations.
    Handles API calls, data normalization, caching, and calculations.
    """

    def __init__(self):
        self.rentcast, self.axesso, self.normalizer, self.redfin = create_api_clients(
            rentcast_api_key=settings.RENTCAST_API_KEY,
            rentcast_url=settings.RENTCAST_URL,
            axesso_api_key=settings.AXESSO_API_KEY,
            axesso_url=settings.AXESSO_URL,
            redfin_api_key=settings.REDFIN_API_KEY,
            redfin_url=settings.REDFIN_URL,
        )

        # Use the comprehensive ZillowClient for Zillow data
        self.zillow = create_zillow_client(
            api_key=settings.AXESSO_API_KEY,
            base_url=settings.AXESSO_URL,
            fallback_api_key=settings.AXESSO_API_KEY_SECONDARY or None,
        )

        # Redis cache with in-memory fallback (24h TTL)
        self._cache: CacheService = get_cache_service()

    def _generate_property_id(self, address: str) -> str:
        """Generate consistent property ID from address."""
        normalized = address.lower().strip()
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]

    def _generate_assumptions_hash(self, assumptions: AllAssumptions) -> str:
        """Generate hash of assumptions for cache key."""
        assumptions_json = json.dumps(assumptions.model_dump(), sort_keys=True)
        return hashlib.sha256(assumptions_json.encode()).hexdigest()[:12]

    async def get_cached_property(self, property_id: str) -> PropertyResponse | None:
        """Retrieve a property from cache by its property_id.

        Uses the ``prop_id:<id>`` key set during ``search_property``.
        Returns ``None`` if not found or deserialization fails.
        """
        cached = await self._cache.get(f"prop_id:{property_id}")
        if cached:
            try:
                return PropertyResponse(**cached)
            except Exception as e:
                logger.warning("Failed to deserialize cached property %s: %s", property_id, e)
        return None

    async def _fetch_raw_rentcast(self, address: str) -> dict[str, Any]:
        """Fetch raw RentCast data (property, value, rent, optional market_stats). Used for export.
        Always records each endpoint response so the export shows either data or error (for auditing).
        """
        rentcast_data: dict[str, Any] = {"address": address, "fetched_at": datetime.now(UTC).isoformat()}
        merged: dict[str, Any] = {}

        rc_property = await self.rentcast.get_property(address)
        if rc_property.success and rc_property.data:
            data = rc_property.data[0] if isinstance(rc_property.data, list) else rc_property.data
            rentcast_data["property"] = data
            merged.update(data if isinstance(data, dict) else {})
        else:
            rentcast_data["property_response"] = {
                "success": False,
                "status_code": getattr(rc_property, "status_code", None),
                "error": rc_property.error,
                "data": rc_property.data,
            }

        rc_value = await self.rentcast.get_value_estimate(address)
        if rc_value.success and rc_value.data:
            rentcast_data["value_estimate"] = rc_value.data
            merged.update(rc_value.data if isinstance(rc_value.data, dict) else {})
        else:
            rentcast_data["value_estimate_response"] = {
                "success": False,
                "status_code": getattr(rc_value, "status_code", None),
                "error": rc_value.error,
                "data": rc_value.data,
            }

        rc_rent = await self.rentcast.get_rent_estimate(address)
        if rc_rent.success and rc_rent.data:
            rentcast_data["rent_estimate"] = rc_rent.data
            merged.update(rc_rent.data if isinstance(rc_rent.data, dict) else {})
        else:
            rentcast_data["rent_estimate_response"] = {
                "success": False,
                "status_code": getattr(rc_rent, "status_code", None),
                "error": rc_rent.error,
                "data": rc_rent.data,
            }

        parts = address.split()
        zip_code = None
        for part in parts:
            if part.replace("-", "").isdigit() and len(part.replace("-", "")) >= 5:
                zip_code = part[:5]
                break
        if zip_code:
            rc_market = await self.rentcast.get_market_statistics(zip_code=zip_code)
            if rc_market.success and rc_market.data:
                rentcast_data["market_statistics"] = rc_market.data
            else:
                rentcast_data["market_statistics_response"] = {
                    "success": False,
                    "status_code": getattr(rc_market, "status_code", None),
                    "error": rc_market.error,
                    "data": rc_market.data,
                }

        rentcast_data["_merged"] = merged
        return rentcast_data

    async def _fetch_raw_axesso(self, address: str) -> tuple[dict[str, Any], dict[str, Any] | None]:
        """
        Fetch raw AXESSO/Zillow data. Returns (raw_export_dict, unwrapped_property_dict).
        raw_export_dict is for Excel; always records each response (data or error) for auditing.
        """
        raw_export: dict[str, Any] = {"address": address, "fetched_at": datetime.now(UTC).isoformat()}
        unwrapped: dict[str, Any] | None = None
        try:
            zillow_response = await self.zillow.search_by_address(address)
            if zillow_response.success and zillow_response.data:
                raw_export["search_by_address"] = zillow_response.data
                raw = zillow_response.data
                unwrapped = self._unwrap_axesso_property(raw)
                zillow_zpid = unwrapped.get("zpid") or raw.get("zpid")
                zestimate = unwrapped.get("zestimate") or unwrapped.get("Zestimate")
                if zillow_zpid and zestimate is None:
                    details_response = await self.zillow.get_property_details(zpid=str(zillow_zpid))
                    if details_response.success and details_response.data:
                        raw_export["property_details"] = details_response.data
                        unwrapped = self._unwrap_axesso_property(details_response.data)
                    else:
                        raw_export["property_details"] = {
                            "success": False,
                            "status_code": getattr(details_response, "status_code", None),
                            "error": details_response.error,
                            "data": details_response.data,
                        }
                else:
                    raw_export["property_details"] = None
            else:
                raw_export["search_by_address"] = {
                    "success": False,
                    "status_code": getattr(zillow_response, "status_code", None),
                    "error": zillow_response.error,
                    "data": zillow_response.data,
                }
                raw_export["property_details"] = None
        except Exception as e:
            raw_export["error"] = str(e)
        return raw_export, unwrapped

    async def search_property(
        self,
        address: str,
        pre_fetched: tuple[dict[str, Any], tuple[dict[str, Any] | None, dict[str, Any]]] | None = None,
    ) -> PropertyResponse | tuple[PropertyResponse, dict[str, Any], dict[str, Any]]:
        """
        Search for property by address.
        Fetches from both APIs, normalizes, and returns unified response.
        Uses Redis cache with 24h TTL when available (when pre_fetched is None).

        When pre_fetched=(rentcast_merged, (axesso_unwrapped, axesso_export)) is provided,
        uses that data (no cache, no fetch) and returns (response, rentcast_merged, axesso_export).
        """
        t0 = time.perf_counter()
        timings: dict[str, float] = {}
        property_id = self._generate_property_id(address)
        timestamp = datetime.now(UTC)
        rentcast_data: dict[str, Any] = {}
        axesso_data: dict[str, Any] | None = None
        axesso_export_for_return: dict[str, Any] | None = None

        zillow_zpid = None
        redfin_data: dict[str, Any] | None = None
        if pre_fetched is not None:
            rentcast_merged, (axesso_unwrapped, axesso_export) = pre_fetched
            rentcast_data = rentcast_merged
            axesso_data = axesso_unwrapped
            axesso_export_for_return = axesso_export
            if axesso_data:
                zillow_zpid = axesso_data.get("zpid")
        else:
            # Check Redis/in-memory cache first
            t_cache = time.perf_counter()
            cached_data = await self._cache.get_property(address)
            timings["cache_lookup_ms"] = (time.perf_counter() - t_cache) * 1000
            if cached_data:
                valuations = cached_data.get("valuations") or {}
                listing = cached_data.get("listing") or {}
                is_off_market_cached = listing.get("listing_status") in (
                    None,
                    "OFF_MARKET",
                    "SOLD",
                    "FOR_RENT",
                    "OTHER",
                )
                rentals_cached = cached_data.get("rentals") or {}
                rental_stats_cached = rentals_cached.get("rental_stats") or {}
                has_source_value = (
                    valuations.get("zestimate") is not None
                    or valuations.get("current_value_avm") is not None
                    or rentals_cached.get("monthly_rent_ltr") is not None
                )
                missing_iq_fields = has_source_value and (
                    valuations.get("value_iq_estimate") is None and not rental_stats_cached
                )
                stale = (
                    is_off_market_cached
                    and valuations.get("zestimate") is None
                    and valuations.get("market_price") in (None, 1)
                ) or missing_iq_fields
                if stale:
                    logger.info("Cache hit for %s but IQ estimate data missing — forcing re-fetch", address)
                    await self._cache.clear_property_cache(address)
                else:
                    logger.info(f"Cache hit for property: {address}")
                    try:
                        cached_data = self._apply_market_price_to_cached(cached_data)
                        timings["total_ms"] = (time.perf_counter() - t0) * 1000
                        logger.info("search_property timings (cache hit): %s", timings)
                        return PropertyResponse(**cached_data)
                    except Exception as e:
                        logger.warning(f"Failed to deserialize cached property: {e}")

            # Fetch from RentCast
            t_rc = time.perf_counter()
            rc_property = await self.rentcast.get_property(address)
            rc_value = await self.rentcast.get_value_estimate(address)
            rc_rent = await self.rentcast.get_rent_estimate(address)
            timings["rentcast_ms"] = (time.perf_counter() - t_rc) * 1000

            if rc_property.success and rc_property.data:
                rentcast_data.update(rc_property.data[0] if isinstance(rc_property.data, list) else rc_property.data)
            if rc_value.success and rc_value.data:
                rentcast_data.update(rc_value.data)
            if rc_rent.success and rc_rent.data:
                rentcast_data.update(rc_rent.data)

            # Fetch from Zillow via AXESSO
            t_zil = time.perf_counter()
            zillow_zpid = None
            try:
                logger.info(f"Fetching Zillow data for: {address}")
                zillow_response = await self.zillow.search_by_address(address)

                if zillow_response.success and zillow_response.data:
                    raw = zillow_response.data
                    axesso_data = self._unwrap_axesso_property(raw)
                    zillow_zpid = axesso_data.get("zpid") or raw.get("zpid")
                    zestimate = axesso_data.get("zestimate") or axesso_data.get("Zestimate")
                    rent_zestimate = axesso_data.get("rentZestimate") or axesso_data.get("RentZestimate")
                    if zillow_zpid and zestimate is None:
                        details_response = await self.zillow.get_property_details(zpid=str(zillow_zpid))
                        if details_response.success and details_response.data:
                            axesso_data = self._unwrap_axesso_property(details_response.data)
                            zestimate = axesso_data.get("zestimate") or axesso_data.get("Zestimate")
                            rent_zestimate = axesso_data.get("rentZestimate") or axesso_data.get("RentZestimate")
                            logger.info(
                                f"Zillow property-v2 retrieved - zestimate: ${zestimate}, rentZestimate: ${rent_zestimate}"
                            )
                    logger.info(
                        f"Zillow data retrieved - zpid: {zillow_zpid}, zestimate: ${zestimate}, rentZestimate: ${rent_zestimate}"
                    )
                else:
                    logger.warning(f"Zillow search failed for: {address} - {zillow_response.error}")
            except Exception as e:
                logger.error(f"Error fetching Zillow data: {e}")
            timings["zillow_ms"] = (time.perf_counter() - t_zil) * 1000

            # Fetch from Redfin (value estimate only)
            # #region agent log
            _log_path = __import__("os").path.join(__import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))), ".cursor", "debug-3ea175.log")
            _payload = {"sessionId": "3ea175", "location": "property_service.py:Redfin", "message": "redfin_branch", "data": {"redfin_is_none": self.redfin is None, "address": address[:50]}, "timestamp": int(time.time() * 1000), "hypothesisId": "H1"}
            open(_log_path, "a").write(__import__("json").dumps(_payload) + "\n")
            # #endregion
            if self.redfin:
                t_rf = time.perf_counter()
                try:
                    redfin_data = await self.redfin.get_property_estimate(address)
                    if redfin_data:
                        logger.info(
                            "Redfin data retrieved - estimate: $%s",
                            redfin_data.get("redfin_estimate"),
                        )
                    else:
                        logger.warning("Redfin estimate unavailable for: %s", address)
                except Exception as e:
                    logger.error("Error fetching Redfin data: %s", e)
                    # #region agent log
                    open(_log_path, "a").write(__import__("json").dumps({"sessionId": "3ea175", "location": "property_service.py:Redfin_except", "message": "redfin_exception", "data": {"type": type(e).__name__, "msg": str(e)[:200]}, "timestamp": int(time.time() * 1000), "hypothesisId": "H4"}) + "\n")
                    # #endregion
                timings["redfin_ms"] = (time.perf_counter() - t_rf) * 1000

        # Normalize and merge data
        t_norm = time.perf_counter()
        normalized, provenance = self.normalizer.normalize(
            rentcast_data or None,
            axesso_data,
            timestamp,
            redfin_data=redfin_data,
        )

        # Calculate data quality
        data_quality = self.normalizer.calculate_data_quality(normalized, provenance)

        timings["normalize_ms"] = (time.perf_counter() - t_norm) * 1000

        # Build address object
        address_obj = self._parse_address(address, rentcast_data)
        # Ensure lat/long are set from normalized data if missing from rentcast_data
        if address_obj.latitude is None:
            address_obj.latitude = normalized.get("latitude")
        if address_obj.longitude is None:
            address_obj.longitude = normalized.get("longitude")

        # Build response
        response = PropertyResponse(
            property_id=property_id,
            zpid=str(zillow_zpid) if zillow_zpid else None,  # Zillow Property ID for photos
            address=address_obj,
            details=PropertyDetails(
                property_type=normalized.get("property_type"),
                bedrooms=normalized.get("bedrooms"),
                bathrooms=normalized.get("bathrooms"),
                square_footage=normalized.get("square_footage"),
                lot_size=normalized.get("lot_size"),
                year_built=normalized.get("year_built"),
                num_units=normalized.get("num_units", 1),
                stories=normalized.get("stories"),
                # HVAC
                heating_type=normalized.get("heating_type"),
                cooling_type=normalized.get("cooling_type"),
                has_heating=normalized.get("has_heating"),
                has_cooling=normalized.get("has_cooling"),
                # Parking
                has_garage=normalized.get("has_garage"),
                garage_spaces=normalized.get("garage_spaces"),
                # Construction
                exterior_type=normalized.get("exterior_type"),
                roof_type=normalized.get("roof_type"),
                # Fireplace
                has_fireplace=normalized.get("has_fireplace"),
                # Pool
                has_pool=normalized.get("has_pool"),
                # View
                view_type=normalized.get("view_type"),
            ),
            valuations=self._build_valuations(normalized),
            rentals=RentalData(
                # IQ Estimate (avg of Zillow + RentCast, or single source) -- never fabricated
                monthly_rent_ltr=normalized.get("rental_iq_estimate"),
                rent_range_low=normalized.get("rent_range_low"),
                rent_range_high=normalized.get("rent_range_high"),
                average_daily_rate=normalized.get("average_daily_rate") or self._estimate_adr(normalized),
                occupancy_rate=normalized.get("occupancy_rate") or 0.75,
                # Raw Zillow averageRent for frontend
                average_rent=normalized.get("average_rent"),
                # Comprehensive rental market statistics
                rental_stats=RentalMarketStatistics(
                    rentcast_estimate=normalized.get("rental_rentcast_estimate"),
                    zillow_estimate=normalized.get("rental_zillow_estimate"),
                    redfin_estimate=normalized.get("redfin_rental_estimate"),
                    iq_estimate=normalized.get("rental_iq_estimate"),
                    estimate_low=normalized.get("rent_range_low"),
                    estimate_high=normalized.get("rent_range_high"),
                    market_avg_rent=normalized.get("rental_market_avg"),
                    market_median_rent=normalized.get("rental_market_median"),
                    market_min_rent=normalized.get("rental_market_min"),
                    market_max_rent=normalized.get("rental_market_max"),
                    market_rent_per_sqft=normalized.get("rental_market_rent_per_sqft"),
                    rental_days_on_market=normalized.get("rental_days_on_market"),
                    rental_total_listings=normalized.get("rental_total_listings"),
                    rental_new_listings=normalized.get("rental_new_listings"),
                    rent_trend=normalized.get("rent_trend"),
                    trend_pct_change=normalized.get("rent_trend_pct"),
                )
                if any(
                    [
                        normalized.get("rental_rentcast_estimate") is not None,
                        normalized.get("rental_zillow_estimate") is not None,
                        normalized.get("redfin_rental_estimate") is not None,
                        normalized.get("rental_iq_estimate") is not None,
                        normalized.get("rental_market_avg") is not None,
                        normalized.get("rental_market_median") is not None,
                        normalized.get("rental_market_min") is not None,
                        normalized.get("rental_market_max") is not None,
                        normalized.get("rent_trend") is not None,
                    ]
                )
                else None,
            ),
            market=MarketData(
                property_taxes_annual=normalized.get("property_taxes_annual") or self._estimate_taxes(normalized),
                hoa_fees_monthly=normalized.get("hoa_fees_monthly", 0),
                # Mortgage rates for frontend
                mortgage_rate_arm5=normalized.get("mortgage_rate_arm5"),
                mortgage_rate_30yr=normalized.get("mortgage_rate_30yr"),
                # Market statistics for buyer/seller analysis
                market_stats=MarketStatistics(
                    median_days_on_market=normalized.get("market_days_on_market"),
                    avg_days_on_market=normalized.get("market_avg_days_on_market"),
                    min_days_on_market=normalized.get("market_min_days_on_market"),
                    max_days_on_market=normalized.get("market_max_days_on_market"),
                    total_listings=normalized.get("market_total_listings"),
                    new_listings=normalized.get("market_new_listings"),
                    absorption_rate=normalized.get("market_absorption_rate"),
                    market_temperature=normalized.get("market_temperature"),
                    median_price=normalized.get("market_median_price"),
                    avg_price_per_sqft=normalized.get("market_avg_price_sqft"),
                )
                if any(
                    [
                        # Check all market stats fields to avoid losing extracted data
                        normalized.get("market_days_on_market") is not None,
                        normalized.get("market_avg_days_on_market") is not None,
                        normalized.get("market_total_listings") is not None,
                        normalized.get("market_new_listings") is not None,
                        normalized.get("market_median_price") is not None,
                        normalized.get("market_avg_price_sqft") is not None,
                    ]
                )
                else None,
            ),
            listing=ListingInfo(
                listing_status=normalized.get("listing_status"),
                is_off_market=normalized.get("is_off_market") if normalized.get("is_off_market") is not None else True,
                seller_type=normalized.get("seller_type"),
                is_foreclosure=normalized.get("is_foreclosure") or False,
                is_bank_owned=normalized.get("is_bank_owned") or False,
                is_fsbo=normalized.get("is_fsbo") or False,
                is_auction=normalized.get("is_auction") or False,
                is_new_construction=normalized.get("is_new_construction") or False,
                list_price=normalized.get("list_price"),
                days_on_market=normalized.get("days_on_market"),
                time_on_market=normalized.get("time_on_market"),
                last_sold_price=normalized.get("last_sold_price"),
                date_sold=normalized.get("date_sold"),
                brokerage_name=normalized.get("brokerage_name"),
                listing_agent_name=normalized.get("listing_agent_name"),
                mls_id=normalized.get("mls_id"),
            ),
            provenance=ProvenanceMap(
                fields={k: FieldProvenance(**v) if isinstance(v, dict) else v for k, v in provenance.items()}
            ),
            data_quality=DataQuality(**data_quality),
            fetched_at=timestamp,
        )

        # Cache result (skip when pre_fetched; return raw sources with response)
        if pre_fetched is None:
            try:
                serialized = response.model_dump()
                await self._cache.set_property(address, serialized)
                await self._cache.set(f"prop_id:{property_id}", serialized)
                logger.info(f"Cached property: {address} (backend={'redis' if self._cache.use_redis else 'memory'})")
            except Exception as e:
                logger.warning(f"Failed to cache property: {e}")
            timings["total_ms"] = (time.perf_counter() - t0) * 1000
            logger.info("search_property timings (cache miss): %s", timings)
            return response
        timings["total_ms"] = (time.perf_counter() - t0) * 1000
        return (response, rentcast_data, axesso_export_for_return or {})

    async def get_property_export_data(self, address: str) -> dict[str, Any]:
        """
        Fetch raw RentCast, raw AXESSO, normalized property, and verdict/strategy
        calculated values for export (e.g. Excel). Does one coordinated fetch and
        returns data for all three export sheets.
        """
        rentcast_raw = await self._fetch_raw_rentcast(address)
        axesso_export, axesso_unwrapped = await self._fetch_raw_axesso(address)
        rentcast_merged = rentcast_raw.get("_merged") or {}
        result = await self.search_property(
            address,
            pre_fetched=(rentcast_merged, (axesso_unwrapped, axesso_export)),
        )
        if not isinstance(result, tuple):
            # Should not happen when pre_fetched is provided
            response = result
            rentcast_merged = rentcast_raw.get("_merged") or {}
            axesso_export = {}
        else:
            response, _, axesso_export = result
        # Build verdict input from property response
        valuations = response.valuations
        listing = response.listing
        details = response.details
        rentals = response.rentals
        market = response.market
        list_price_val = getattr(listing, "list_price", None) if listing is not None else None
        if list_price_val is None and listing is not None and isinstance(listing, dict):
            list_price_val = listing.get("list_price")
        list_price = (
            float(list_price_val)
            if list_price_val is not None and list_price_val > 0
            else float(valuations.zestimate or 0) or 1
        )
        monthly_rent = rentals.monthly_rent_ltr or 0
        listing_status_val = getattr(listing, "listing_status", None) if listing is not None else None
        if listing_status_val is None and listing is not None and isinstance(listing, dict):
            listing_status_val = listing.get("listing_status")
        is_listed = (
            listing_status_val is not None
            and str(listing_status_val).upper() not in ("OFF_MARKET", "SOLD", "FOR_RENT", "OTHER")
            and (list_price_val or 0) > 0
        )
        verdict_input = IQVerdictInput(
            list_price=max(1, list_price),
            monthly_rent=monthly_rent,
            property_taxes=market.property_taxes_annual or (list_price * 0.012),
            insurance=getattr(market, "insurance_annual", None) or (list_price * 0.01),
            bedrooms=details.bedrooms or 3,
            bathrooms=float(details.bathrooms or 2),
            sqft=details.square_footage,
            arv=valuations.arv or (list_price * 1.15),
            average_daily_rate=rentals.average_daily_rate,
            occupancy_rate=rentals.occupancy_rate or 0.75,
            is_listed=is_listed,
            zestimate=valuations.zestimate,
            current_value_avm=valuations.current_value_avm,
            tax_assessed_value=valuations.tax_assessed_value,
            listing_status=listing_status_val,
        )
        verdict_result = compute_iq_verdict(verdict_input)
        # Strip internal key from raw RentCast for export
        raw_rentcast_export = {k: v for k, v in rentcast_raw.items() if k != "_merged"}
        return {
            "raw_rentcast": raw_rentcast_export,
            "raw_axesso": axesso_export,
            "property": response.model_dump(mode="json"),
            "verdict": verdict_result.model_dump(mode="json"),
        }

    def _parse_address(self, address: str, data: dict | None = None) -> Address:
        """Parse address into components."""
        # Try to get structured address from API data
        if data:
            return Address(
                street=data.get("addressLine1", address.split(",")[0] if "," in address else address),
                city=data.get("city", ""),
                state=data.get("state", ""),
                zip_code=data.get("zipCode", ""),
                county=data.get("county"),
                latitude=data.get("latitude"),
                longitude=data.get("longitude"),
                full_address=data.get("formattedAddress", address),
            )

        # Fallback parsing
        parts = address.split(",")
        return Address(
            street=parts[0].strip() if len(parts) > 0 else address,
            city=parts[1].strip() if len(parts) > 1 else "",
            state=parts[2].strip().split()[0] if len(parts) > 2 else "",
            zip_code=parts[2].strip().split()[1] if len(parts) > 2 and len(parts[2].strip().split()) > 1 else "",
            county=None,
            latitude=None,
            longitude=None,
            full_address=address,
        )

    def _unwrap_axesso_property(self, raw: dict[str, Any]) -> dict[str, Any]:
        """
        Return the dict that contains zestimate so normalizer and market_price get it.
        AXESSO may return the property at top level or wrapped (e.g. data, searchResult, body).
        Normalizes camelCase Zestimate/rentZestimate so downstream code sees zestimate/rentZestimate.

        The search-by-address endpoint often returns the Zestimate as ``price``
        (not ``zestimate``) and inside the ``adTargets`` JSON blob.  When no
        explicit ``zestimate`` key is found, this method extracts it from
        ``adTargets`` or promotes ``price`` for off-market properties.
        """

        def _has_zestimate(d: dict[str, Any]) -> bool:
            if not d or not isinstance(d, dict):
                return False
            return d.get("zestimate") is not None or d.get("Zestimate") is not None

        def _normalize_zestimate_keys(d: dict[str, Any]) -> dict[str, Any]:
            out = dict(d)
            if out.get("zestimate") is None and out.get("Zestimate") is not None:
                out["zestimate"] = out["Zestimate"]
            if out.get("rentZestimate") is None and out.get("RentZestimate") is not None:
                out["rentZestimate"] = out["RentZestimate"]
            return out

        def _extract_zestimate_from_ad_targets(d: dict[str, Any]) -> float | None:
            """Parse adTargets (JSON string or dict) and extract the zestimate value."""
            ad_targets = d.get("adTargets")
            if ad_targets is None:
                return None
            if isinstance(ad_targets, str):
                try:
                    import json

                    ad_targets = json.loads(ad_targets)
                except (json.JSONDecodeError, TypeError):
                    return None
            if isinstance(ad_targets, dict):
                z = ad_targets.get("zestimate")
                if z is not None:
                    try:
                        return float(z)
                    except (ValueError, TypeError):
                        pass
            return None

        if not raw or not isinstance(raw, dict):
            return raw or {}
        chosen = raw
        if _has_zestimate(raw):
            chosen = raw
        else:
            for key in ("data", "searchResult", "body", "search", "result", "property"):
                inner = raw.get(key)
                if isinstance(inner, dict) and _has_zestimate(inner):
                    chosen = inner
                    break

        out = _normalize_zestimate_keys(chosen)

        if out.get("zestimate") is None:
            ad_z = _extract_zestimate_from_ad_targets(out)
            if ad_z is not None and ad_z > 0:
                out["zestimate"] = ad_z
                logger.info("Zestimate extracted from adTargets: $%s", ad_z)
            elif out.get("price") is not None:
                home_status = str(out.get("homeStatus") or "").upper()
                listed_statuses = ("FOR_SALE", "PENDING", "RECENTLY_SOLD")
                if home_status not in listed_statuses:
                    try:
                        out["zestimate"] = float(out["price"])
                        logger.info(
                            "Zestimate promoted from price field: $%s (homeStatus=%s)",
                            out["price"],
                            home_status,
                        )
                    except (ValueError, TypeError):
                        pass
            if out.get("zestimate") is None:
                logger.warning(
                    "No zestimate extracted — keys=%s, has_adTargets=%s, price=%s, homeStatus=%s",
                    [k for k in out.keys() if k in ("zestimate", "Zestimate", "price", "adTargets", "homeStatus")],
                    "adTargets" in out,
                    out.get("price"),
                    out.get("homeStatus"),
                )

        return out

    def _apply_market_price_to_cached(self, cached_data: dict[str, Any]) -> dict[str, Any]:
        """Recompute market_price on cached response — Zestimate is single source for off-market."""
        valuations = (cached_data.get("valuations") or {}).copy()
        listing = cached_data.get("listing") or {}
        listing_status = listing.get("listing_status")
        list_price = listing.get("list_price")
        off_market_statuses = ("OFF_MARKET", "SOLD", "FOR_RENT", "OTHER")
        is_listed = (
            listing_status is not None
            and str(listing_status).upper() not in off_market_statuses
            and list_price is not None
            and list_price > 0
        )
        market_price_val = compute_market_price(
            is_listed=is_listed,
            list_price=list_price,
            zestimate=valuations.get("zestimate"),
            current_value_avm=valuations.get("current_value_avm"),
            tax_assessed_value=valuations.get("tax_assessed_value"),
        )
        valuations["market_price"] = market_price_val
        return {**cached_data, "valuations": valuations}

    def _build_valuations(self, normalized: dict) -> ValuationData:
        """Build ValuationData — Zestimate is single source for off-market market_price."""
        listing_status = normalized.get("listing_status")
        list_price = normalized.get("list_price")
        off_market_statuses = ("OFF_MARKET", "SOLD", "FOR_RENT", "OTHER")
        is_listed = (
            listing_status is not None
            and str(listing_status).upper() not in off_market_statuses
            and list_price is not None
            and list_price > 0
        )
        market_price_val = None
        if not is_listed:
            market_price_val = compute_market_price(
                is_listed=False,
                list_price=None,
                zestimate=normalized.get("zestimate"),
                current_value_avm=normalized.get("current_value_avm"),
                tax_assessed_value=normalized.get("tax_assessed_value"),
            )
        return ValuationData(
            current_value_avm=normalized.get("current_value_avm"),
            value_iq_estimate=normalized.get("value_iq_estimate"),
            rentcast_avm=normalized.get("rentcast_avm"),
            value_range_low=normalized.get("value_range_low"),
            value_range_high=normalized.get("value_range_high"),
            last_sale_price=normalized.get("last_sale_price"),
            last_sale_date=normalized.get("last_sale_date"),
            tax_assessed_value=normalized.get("tax_assessed_value"),
            arv=self._estimate_arv(normalized),
            arv_flip=self._estimate_arv_flip(normalized),
            zestimate=normalized.get("zestimate"),
            zestimate_high_pct=normalized.get("zestimate_high_pct"),
            zestimate_low_pct=normalized.get("zestimate_low_pct"),
            redfin_estimate=normalized.get("redfin_estimate"),
            market_price=market_price_val,
        )

    def _estimate_arv(self, data: dict) -> float | None:
        """Estimate ARV for BRRRR strategy."""
        avm = data.get("current_value_avm")
        if avm:
            # ARV typically 10-15% above current market for distressed properties
            return avm * 1.10
        return None

    def _estimate_arv_flip(self, data: dict) -> float | None:
        """Estimate ARV for Fix & Flip."""
        avm = data.get("current_value_avm")
        if avm:
            # Conservative flip ARV
            return avm * 1.06
        return None

    def _estimate_adr(self, data: dict) -> float | None:
        """Estimate ADR from LTR rent if STR data unavailable."""
        monthly_rent = data.get("monthly_rent_ltr")
        if monthly_rent:
            # STR ADR is typically 2-3x daily equivalent of monthly rent
            daily_equivalent = monthly_rent / 30
            return daily_equivalent * 2.5
        return 200  # Default fallback

    def _estimate_taxes(self, data: dict) -> float:
        """Estimate annual property taxes."""
        avm = data.get("current_value_avm")
        if avm:
            # Typical 1-1.5% of value
            return avm * 0.012
        return 4500  # Default fallback

    async def _resolve_zpid_from_address(self, address: str) -> str | None:
        """Resolve a Zillow zpid from a full address."""
        if not address:
            return None

        try:
            response = await self.zillow.search_by_address(address)
        except Exception as exc:
            logger.warning(f"ZPID lookup failed for address '{address}': {exc}")
            return None

        if not response.success or not response.data:
            return response.zpid

        if isinstance(response.data, dict):
            return (
                str(response.data.get("zpid") or response.data.get("zillow_id") or response.zpid)
                if (response.data.get("zpid") or response.data.get("zillow_id") or response.zpid)
                else None
            )

        if isinstance(response.data, list) and response.data:
            zpid = response.data[0].get("zpid")
            return str(zpid) if zpid else response.zpid

        return response.zpid

    async def _resolve_address_from_zpid(self, zpid: str) -> str | None:
        """Resolve a formatted address from a Zillow zpid."""
        if not zpid:
            return None

        try:
            details = await self.zillow.get_property_details(zpid=zpid)
        except Exception as exc:
            logger.warning(f"Address lookup failed for zpid '{zpid}': {exc}")
            return None

        if not details.success or not details.data or not isinstance(details.data, dict):
            return None

        raw_address = details.data.get("address")
        if isinstance(raw_address, str) and raw_address.strip():
            return raw_address.strip()

        if isinstance(raw_address, dict):
            street = str(raw_address.get("streetAddress") or raw_address.get("line1") or "").strip()
            city = str(raw_address.get("city") or "").strip()
            state = str(raw_address.get("state") or "").strip()
            zip_code = str(raw_address.get("zipcode") or raw_address.get("zip") or "").strip()
            parts = [p for p in [street, city] if p]
            state_zip = " ".join([p for p in [state, zip_code] if p]).strip()
            if state_zip:
                parts.append(state_zip)
            if parts:
                return ", ".join(parts)

        street = str(details.data.get("streetAddress") or "").strip()
        city = str(details.data.get("city") or "").strip()
        state = str(details.data.get("state") or "").strip()
        zip_code = str(details.data.get("zipcode") or details.data.get("zip") or "").strip()
        parts = [p for p in [street, city] if p]
        state_zip = " ".join([p for p in [state, zip_code] if p]).strip()
        if state_zip:
            parts.append(state_zip)
        return ", ".join(parts) if parts else None

    async def get_rentcast_rental_comps(
        self,
        zpid: str | None = None,
        address: str | None = None,
        limit: int = 10,
        offset: int = 0,
        exclude_zpids: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Fetch rental comps from RentCast.

        Uses RentCast's rent estimate endpoint and returns the comparables payload
        when present in the response.
        """
        try:
            resolved_address = (address or "").strip() or None
            if not resolved_address and zpid:
                resolved_address = await self._resolve_address_from_zpid(zpid)

            if not resolved_address:
                return {
                    "success": False,
                    "error": "At least one of address or zpid that resolves to an address is required",
                    "results": [],
                    "total_count": 0,
                    "total_available": 0,
                    "offset": offset,
                    "limit": limit,
                    "has_more": False,
                    "provider": "rentcast",
                    "fetched_at": datetime.now(UTC).isoformat(),
                }

            result = await self.rentcast.get_rent_estimate(address=resolved_address)
            if not result.success or not result.data:
                logger.warning(
                    "RentCast rental comps upstream failure",
                    extra={
                        "provider": "rentcast",
                        "resolved_address": resolved_address,
                        "status_code": result.status_code,
                        "error": result.error,
                    },
                )
                return {
                    "success": False,
                    "error": result.error or "Failed to fetch rental comps from RentCast",
                    "results": [],
                    "total_count": 0,
                    "total_available": 0,
                    "offset": offset,
                    "limit": limit,
                    "has_more": False,
                    "provider": "rentcast",
                    "fetched_at": datetime.now(UTC).isoformat(),
                }

            payload = result.data
            comps_raw: list[dict[str, Any]] = []

            if isinstance(payload, dict):
                for key in ("comparables", "comps", "rentalComps", "rentComps", "listings", "results", "data"):
                    candidate = payload.get(key)
                    if isinstance(candidate, list):
                        comps_raw = [c for c in candidate if isinstance(c, dict)]
                        break
            elif isinstance(payload, list):
                comps_raw = [c for c in payload if isinstance(c, dict)]

            logger.info(
                "RentCast rental comps fetched",
                extra={
                    "provider": "rentcast",
                    "resolved_address": resolved_address,
                    "upstream_status_code": result.status_code,
                    "raw_comp_count": len(comps_raw),
                },
            )

            normalized_comps: list[dict[str, Any]] = []
            for comp in comps_raw:
                comp_id = str(comp.get("id") or comp.get("zpid") or comp.get("propertyId") or "")
                formatted_address = str(comp.get("formattedAddress") or "").strip()
                address_line1 = str(comp.get("addressLine1") or "").strip()
                address_line2 = str(comp.get("addressLine2") or "").strip()
                city = str(comp.get("city") or "").strip()
                state = str(comp.get("state") or "").strip()
                zip_code = str(comp.get("zipCode") or comp.get("zipcode") or comp.get("zip") or "").strip()
                display_address = formatted_address or ", ".join(
                    p for p in [address_line1, city, f"{state} {zip_code}".strip()] if p
                )

                normalized_comps.append(
                    {
                        "id": comp_id or None,
                        "zpid": comp.get("zpid"),
                        "propertyId": comp.get("propertyId"),
                        "provider": "rentcast",
                        "formattedAddress": display_address,
                        "addressLine1": address_line1,
                        "addressLine2": address_line2,
                        "city": city,
                        "state": state,
                        "zipCode": zip_code,
                        "address": {
                            "streetAddress": address_line1 or display_address,
                            "city": city,
                            "state": state,
                            "zipcode": zip_code,
                        },
                        "bedrooms": comp.get("bedrooms"),
                        "bathrooms": comp.get("bathrooms"),
                        "squareFootage": comp.get("squareFootage"),
                        "lotSize": comp.get("lotSize"),
                        "yearBuilt": comp.get("yearBuilt"),
                        "price": comp.get("price"),
                        "listedDate": comp.get("listedDate"),
                        "lastSeenDate": comp.get("lastSeenDate"),
                        "removedDate": comp.get("removedDate"),
                        "daysOnMarket": comp.get("daysOnMarket"),
                        "distance": comp.get("distance"),
                        "correlation": comp.get("correlation"),
                        "latitude": comp.get("latitude"),
                        "longitude": comp.get("longitude"),
                        "status": comp.get("status"),
                        "listingType": comp.get("listingType"),
                        "imageUrl": comp.get("imageUrl"),
                        "raw": comp,
                    }
                )

            if exclude_zpids:
                exclude_set = set(str(z) for z in exclude_zpids)
                filtered: list[dict[str, Any]] = []
                for comp in normalized_comps:
                    comp_id = str(comp.get("zpid") or comp.get("id") or comp.get("propertyId") or "")
                    if comp_id and comp_id in exclude_set:
                        continue
                    filtered.append(comp)
                normalized_comps = filtered

            total_available = len(normalized_comps)
            paginated_results = normalized_comps[offset : offset + limit]

            logger.info(
                "RentCast rental comps ready",
                extra={
                    "provider": "rentcast",
                    "resolved_address": resolved_address,
                    "filtered_comp_count": total_available,
                    "returned_comp_count": len(paginated_results),
                    "offset": offset,
                    "limit": limit,
                },
            )

            return {
                "success": True,
                "results": paginated_results,
                "total_count": len(paginated_results),
                "total_available": total_available,
                "offset": offset,
                "limit": limit,
                "has_more": (offset + limit) < total_available,
                "provider": "rentcast",
                "source_address": resolved_address,
                "fetched_at": datetime.now(UTC).isoformat(),
            }
        except Exception as exc:
            logger.error(f"Error fetching RentCast rental comps: {exc}")
            return {
                "success": False,
                "error": str(exc),
                "results": [],
                "total_count": 0,
                "total_available": 0,
                "offset": offset,
                "limit": limit,
                "has_more": False,
                "provider": "rentcast",
                "fetched_at": datetime.now(UTC).isoformat(),
            }

    def _build_market_location_candidates(self, location: str) -> list[str]:
        """Generate fallback location formats for market data queries."""
        normalized = " ".join(location.split()).strip()
        candidates: list[str] = [normalized] if normalized else []

        zip_match = re.search(r"\b\d{5}\b", normalized)
        if zip_match:
            candidates.append(zip_match.group(0))

        if "," in normalized:
            city = normalized.split(",", 1)[0].strip()
            if city:
                candidates.append(city)

        # Deduplicate while preserving order
        seen = set()
        unique_candidates = []
        for candidate in candidates:
            if candidate and candidate not in seen:
                unique_candidates.append(candidate)
                seen.add(candidate)

        return unique_candidates

    async def calculate_analytics(
        self, property_id: str, assumptions: AllAssumptions, strategies: list[StrategyType] | None = None
    ) -> AnalyticsResponse:
        """
        Calculate investment analytics for all or specified strategies.
        """
        assumptions_hash = self._generate_assumptions_hash(assumptions)

        # Check calculation cache (Redis-backed)
        cached_calc = await self._cache.get_calculation(property_id, assumptions_hash)
        if cached_calc:
            try:
                return AnalyticsResponse(**cached_calc)
            except Exception as e:
                logger.warning(f"Failed to deserialize cached calculation: {e}")

        # Get property data from cache (by property_id)
        property_data = await self.get_cached_property(property_id)
        if not property_data:
            raise ValueError(f"Property {property_id} not found. Search first.")

        # Determine which strategies to calculate
        all_strategies = [
            StrategyType.LONG_TERM_RENTAL,
            StrategyType.SHORT_TERM_RENTAL,
            StrategyType.BRRRR,
            StrategyType.FIX_AND_FLIP,
            StrategyType.HOUSE_HACK,
            StrategyType.WHOLESALE,
        ]
        strategies_to_calc = strategies or all_strategies

        # Extract values — Zestimate is single source of truth for market value,
        # RentCast rent is single source of truth for rent estimate
        purchase_price = (
            assumptions.financing.purchase_price
            or property_data.valuations.zestimate
            or property_data.valuations.current_value_avm
            or 0
        )
        monthly_rent = property_data.rentals.monthly_rent_ltr or 0
        property_taxes = property_data.market.property_taxes_annual or 4500
        hoa = property_data.market.hoa_fees_monthly or 0
        adr = property_data.rentals.average_daily_rate or 250
        occupancy = property_data.rentals.occupancy_rate or 0.75
        arv = property_data.valuations.arv or purchase_price * 1.10
        arv_flip = property_data.valuations.arv_flip or purchase_price * 1.06

        results = AnalyticsResponse(
            property_id=property_id, assumptions_hash=assumptions_hash, calculated_at=datetime.now(UTC)
        )

        # Calculate each strategy
        if StrategyType.LONG_TERM_RENTAL in strategies_to_calc:
            ltr_result = calculate_ltr(
                purchase_price=purchase_price,
                monthly_rent=monthly_rent,
                property_taxes_annual=property_taxes,
                hoa_monthly=hoa,
                down_payment_pct=assumptions.financing.down_payment_pct,
                interest_rate=assumptions.financing.interest_rate,
                loan_term_years=assumptions.financing.loan_term_years,
                closing_costs_pct=assumptions.financing.closing_costs_pct,
                vacancy_rate=assumptions.operating.vacancy_rate,
                property_management_pct=assumptions.operating.property_management_pct,
                maintenance_pct=assumptions.operating.maintenance_pct,
                insurance_annual=assumptions.operating.insurance_annual,
                utilities_monthly=assumptions.operating.utilities_monthly,
                landscaping_annual=assumptions.operating.landscaping_annual,
                pest_control_annual=assumptions.operating.pest_control_annual,
                appreciation_rate=assumptions.appreciation_rate,
                rent_growth_rate=assumptions.rent_growth_rate,
            )
            results.ltr = LTRResults(**ltr_result)

        if StrategyType.SHORT_TERM_RENTAL in strategies_to_calc:
            str_result = calculate_str(
                purchase_price=purchase_price,
                average_daily_rate=adr,
                occupancy_rate=occupancy,
                property_taxes_annual=property_taxes,
                hoa_monthly=hoa,
                down_payment_pct=0.25,  # STR typically requires 25%
                interest_rate=assumptions.financing.interest_rate,
                loan_term_years=assumptions.financing.loan_term_years,
                closing_costs_pct=assumptions.financing.closing_costs_pct,
                furniture_setup_cost=assumptions.str_assumptions.furniture_setup_cost,
                platform_fees_pct=assumptions.str_assumptions.platform_fees_pct,
                str_management_pct=assumptions.str_assumptions.str_management_pct,
                cleaning_cost_per_turnover=assumptions.str_assumptions.cleaning_cost_per_turnover,
                cleaning_fee_revenue=assumptions.str_assumptions.cleaning_fee_revenue,
                avg_length_of_stay_days=assumptions.str_assumptions.avg_length_of_stay_days,
                supplies_monthly=assumptions.str_assumptions.supplies_monthly,
                additional_utilities_monthly=assumptions.str_assumptions.additional_utilities_monthly,
                insurance_annual=assumptions.str_assumptions.str_insurance_annual,
            )
            results.str_results = STRResults(**str_result)

        if StrategyType.BRRRR in strategies_to_calc:
            brrrr_result = calculate_brrrr(
                market_value=purchase_price,
                arv=arv,
                monthly_rent_post_rehab=monthly_rent * (1 + assumptions.brrrr.post_rehab_rent_increase_pct),
                property_taxes_annual=property_taxes,
                purchase_discount_pct=assumptions.brrrr.purchase_discount_pct,
                down_payment_pct=assumptions.financing.down_payment_pct,
                interest_rate=assumptions.financing.interest_rate,
                loan_term_years=assumptions.financing.loan_term_years,
                closing_costs_pct=assumptions.financing.closing_costs_pct,
                renovation_budget=assumptions.rehab.renovation_budget,
                contingency_pct=assumptions.rehab.contingency_pct,
                holding_period_months=assumptions.rehab.holding_period_months,
                monthly_holding_costs=assumptions.rehab.monthly_holding_costs,
                refinance_ltv=assumptions.brrrr.refinance_ltv,
                refinance_interest_rate=assumptions.brrrr.refinance_interest_rate,
                refinance_term_years=assumptions.brrrr.refinance_term_years,
                refinance_closing_costs=assumptions.brrrr.refinance_closing_costs,
            )
            results.brrrr = BRRRRResults(**brrrr_result)

        if StrategyType.FIX_AND_FLIP in strategies_to_calc:
            # Calculate renovation budget from ARV if not explicitly set
            flip_renovation_budget = assumptions.rehab.renovation_budget
            if flip_renovation_budget is None:
                flip_renovation_budget = arv_flip * assumptions.rehab.renovation_budget_pct

            flip_result = calculate_flip(
                market_value=purchase_price,
                arv=arv_flip,
                purchase_discount_pct=assumptions.flip.purchase_discount_pct,
                hard_money_ltv=assumptions.flip.hard_money_ltv,
                hard_money_rate=assumptions.flip.hard_money_rate,
                closing_costs_pct=assumptions.financing.closing_costs_pct,
                renovation_budget=flip_renovation_budget,
                contingency_pct=assumptions.rehab.contingency_pct,
                holding_period_months=assumptions.flip.holding_period_months,
                property_taxes_annual=property_taxes,
                selling_costs_pct=assumptions.flip.selling_costs_pct,
            )
            results.flip = FlipResults(**flip_result)

        if StrategyType.HOUSE_HACK in strategies_to_calc:
            # Calculate defaults if not provided
            room_rent = assumptions.house_hack.room_rent_monthly
            if room_rent is None:
                # Estimate room rent as 35% of total rent (approx for 3-4 bed house)
                room_rent = monthly_rent * 0.35

            owner_market_rent = assumptions.house_hack.owner_unit_market_rent
            if owner_market_rent is None:
                # Default to total rent (conservative comparison)
                owner_market_rent = monthly_rent

            house_hack_result = calculate_house_hack(
                purchase_price=purchase_price,
                monthly_rent_per_room=room_rent,
                rooms_rented=assumptions.house_hack.units_rented_out,
                property_taxes_annual=property_taxes,
                owner_unit_market_rent=owner_market_rent,
                down_payment_pct=assumptions.house_hack.fha_down_payment_pct,
                interest_rate=assumptions.house_hack.fha_interest_rate,
                loan_term_years=assumptions.financing.loan_term_years,
                closing_costs_pct=assumptions.financing.closing_costs_pct,
                fha_mip_rate=assumptions.house_hack.fha_mip_rate,
                insurance_annual=assumptions.operating.insurance_annual,
            )
            results.house_hack = HouseHackResults(**house_hack_result)

        if StrategyType.WHOLESALE in strategies_to_calc:
            # Calculate rehab costs from ARV if not explicitly set
            wholesale_rehab_costs = assumptions.rehab.renovation_budget
            if wholesale_rehab_costs is None:
                wholesale_rehab_costs = arv_flip * assumptions.rehab.renovation_budget_pct

            wholesale_result = calculate_wholesale(
                arv=arv_flip,
                estimated_rehab_costs=wholesale_rehab_costs,
                assignment_fee=assumptions.wholesale.assignment_fee,
                marketing_costs=assumptions.wholesale.marketing_costs,
                earnest_money_deposit=assumptions.wholesale.earnest_money_deposit,
                days_to_close=assumptions.wholesale.days_to_close,
            )
            results.wholesale = WholesaleResults(**wholesale_result)

        # Cache results in Redis (1 hour TTL — assumptions may change)
        try:
            await self._cache.set_calculation(property_id, assumptions_hash, results.model_dump(), ttl_seconds=3600)
        except Exception as e:
            logger.warning(f"Failed to cache calculation: {e}")

        return results

    def _normalize_photo(self, photo: dict[str, Any]) -> dict[str, Any] | None:
        """
        Normalize a photo object from AXESSO format to frontend expected format.

        AXESSO property-v2 can return photos in various formats:
        - mixedSources.jpeg[]/webp[] structure
        - Direct url field
        - sources array with width/url

        Frontend expects { url: string, caption?: string, width?: number, height?: number }.
        """
        if not isinstance(photo, dict):
            # Sometimes it's just a URL string
            if isinstance(photo, str) and photo.startswith("http"):
                return {"url": photo, "caption": ""}
            return None

        # If already in simple format with direct url
        if "url" in photo and isinstance(photo["url"], str):
            return {
                "url": photo["url"],
                "caption": photo.get("caption", ""),
                "width": photo.get("width"),
                "height": photo.get("height"),
            }

        # Handle AXESSO mixedSources format
        if "mixedSources" in photo:
            mixed = photo["mixedSources"]
            caption = photo.get("caption", "")

            # Prefer JPEG, fall back to WebP
            sources = mixed.get("jpeg", []) or mixed.get("webp", [])

            if sources:
                # Get the highest resolution image
                # Sort by width to get the best quality
                sorted_sources = sorted(sources, key=lambda x: x.get("width", 0), reverse=True)
                best_source = sorted_sources[0] if sorted_sources else None

                if best_source and "url" in best_source:
                    return {
                        "url": best_source["url"],
                        "caption": caption,
                        "width": best_source.get("width"),
                        "height": best_source.get("height"),
                    }

        # Handle sources array format (alternative AXESSO format)
        if "sources" in photo:
            sources = photo["sources"]
            caption = photo.get("caption", "")

            if isinstance(sources, list) and sources:
                # Sort by width to get the best quality
                sorted_sources = sorted(sources, key=lambda x: x.get("width", 0), reverse=True)
                best_source = sorted_sources[0] if sorted_sources else None

                if best_source and "url" in best_source:
                    return {
                        "url": best_source["url"],
                        "caption": caption,
                        "width": best_source.get("width"),
                        "height": best_source.get("height"),
                    }

        # Handle responsivePhotos format with subPhotos
        if "subPhotos" in photo:
            sub_photos = photo["subPhotos"]
            if isinstance(sub_photos, list) and sub_photos:
                # Get highest resolution subphoto
                sorted_subs = sorted(sub_photos, key=lambda x: x.get("width", 0), reverse=True)
                best = sorted_subs[0] if sorted_subs else None
                if best and "url" in best:
                    return {
                        "url": best["url"],
                        "caption": photo.get("caption", ""),
                        "width": best.get("width"),
                        "height": best.get("height"),
                    }

        return None

    async def _get_photos_from_property_v2(
        self, zpid: str | None = None, url: str | None = None
    ) -> dict[str, Any] | None:
        """
        Fallback: fetch photos from property-v2 response when dedicated /photos endpoint fails.
        Property-v2 often includes the same photo data and may succeed when /photos returns 502.
        """
        if not zpid and not url:
            return None
        result = await self.zillow.get_property_details(zpid=zpid, url=url)
        if not result.success or not isinstance(result.data, dict):
            return None
        raw_photos = (
            result.data.get("photos")
            or result.data.get("responsivePhotos")
            or result.data.get("images")
            or result.data.get("hugePhotos")
            or []
        )
        if not raw_photos:
            return None
        normalized_photos = []
        for photo in raw_photos:
            normalized = self._normalize_photo(photo)
            if normalized:
                normalized_photos.append(normalized)
        if not normalized_photos:
            return None
        logger.info(f"Photos fallback: got {len(normalized_photos)} photos from property-v2")
        return {
            "success": True,
            "zpid": zpid,
            "url": url,
            "photos": normalized_photos,
            "total_count": len(normalized_photos),
            "fetched_at": datetime.now(UTC).isoformat(),
        }

    async def get_property_photos(self, zpid: str | None = None, url: str | None = None) -> dict[str, Any]:
        """
        Fetch property photos from Zillow via AXESSO API.

        Uses dedicated /photos endpoint first; on failure (e.g. 502), falls back to
        property-v2 response which often includes photos.

        Args:
            zpid: Zillow Property ID
            url: Property URL on Zillow

        Returns:
            Dict with photos data, normalized to frontend expected format
        """
        logger.info(f"Fetching photos - zpid: {zpid}, url: {url}")

        try:
            # Use the dedicated /photos endpoint via ZillowClient
            result = await self.zillow.get_photos(zpid=zpid, url=url)

            if result.success and result.data:
                # Handle different response structures from AXESSO
                raw_photos = []
                if isinstance(result.data, dict):
                    # Primary: photos array from property-v2
                    raw_photos = result.data.get("photos", [])
                    # Alternative: responsivePhotos
                    if not raw_photos:
                        raw_photos = result.data.get("responsivePhotos", [])
                    # Alternative: images
                    if not raw_photos:
                        raw_photos = result.data.get("images", [])
                    # Alternative: hugePhotos
                    if not raw_photos:
                        raw_photos = result.data.get("hugePhotos", [])
                elif isinstance(result.data, list):
                    raw_photos = result.data

                # Normalize each photo to frontend expected format
                normalized_photos = []
                for photo in raw_photos:
                    normalized = self._normalize_photo(photo)
                    if normalized:
                        normalized_photos.append(normalized)

                logger.info(f"Normalized {len(normalized_photos)} photos from {len(raw_photos)} raw photos")

                return {
                    "success": True,
                    "zpid": zpid,
                    "url": url,
                    "photos": normalized_photos,
                    "total_count": len(normalized_photos),
                    "fetched_at": datetime.now(UTC).isoformat(),
                }
            else:
                # Dedicated /photos endpoint failed (e.g. 502). Fallback: try property-v2,
                # which often includes photos and uses a different AXESSO path.
                logger.warning(f"Photo fetch failed: {result.error}; trying property-v2 fallback")
                fallback = await self._get_photos_from_property_v2(zpid=zpid, url=url)
                if fallback:
                    return fallback
                return {
                    "success": False,
                    "zpid": zpid,
                    "url": url,
                    "error": result.error or "Failed to fetch photos from AXESSO API",
                    "photos": [],
                    "total_count": 0,
                    "fetched_at": datetime.now(UTC).isoformat(),
                }
        except Exception as e:
            logger.error(f"Error fetching photos: {e}")
            # Try property-v2 fallback on any error when we have zpid
            if zpid or url:
                try:
                    fallback = await self._get_photos_from_property_v2(zpid=zpid, url=url)
                    if fallback:
                        return fallback
                except Exception as fallback_e:
                    logger.warning(f"Property-v2 photo fallback failed: {fallback_e}")
            return {
                "success": False,
                "zpid": zpid,
                "url": url,
                "error": str(e),
                "photos": [],
                "total_count": 0,
                "fetched_at": datetime.now(UTC).isoformat(),
            }

    async def get_market_data(self, location: str) -> dict[str, Any]:
        """
        Fetch rental market data from Zillow via AXESSO API.

        Args:
            location: City, State format (e.g., "Delray Beach, FL")

        Returns:
            Dict with market data including median rent, trends, etc.
        """
        candidates = self._build_market_location_candidates(location)
        logger.info(f"Fetching market data for location: {location} (candidates: {candidates})")

        last_error = None

        for candidate in candidates or [location]:
            try:
                result = await self.zillow.get_market_data(location=candidate)
            except Exception as e:
                logger.error(f"Error fetching market data for {candidate}: {e}")
                last_error = str(e)
                continue

            if result.success and result.data:
                logger.info(f"Market data fetch successful for: {candidate}")
                return {
                    "success": True,
                    "location": candidate,
                    "data": result.data,
                    "fetched_at": datetime.now(UTC).isoformat(),
                }

            last_error = result.error or "Failed to fetch market data from AXESSO API"
            if result.error and "Invalid location" not in result.error:
                break

        logger.warning(f"Market data fetch failed: {last_error}")
        return {
            "success": False,
            "location": location,
            "error": last_error,
            "data": None,
            "fetched_at": datetime.now(UTC).isoformat(),
        }

    async def get_similar_rent(
        self,
        zpid: str | None = None,
        url: str | None = None,
        address: str | None = None,
        limit: int = 10,
        offset: int = 0,
        exclude_zpids: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Fetch similar rental properties from Zillow via AXESSO API.

        Args:
            zpid: Zillow Property ID
            url: Property URL on Zillow
            address: Property address
            limit: Number of results to return
            offset: Number of results to skip
            exclude_zpids: List of zpids to exclude from results

        Returns:
            Dict with similar rental properties and pagination metadata
        """
        logger.info(f"Fetching similar rentals - zpid: {zpid}, address: {address}, limit: {limit}, offset: {offset}")

        try:
            resolved_zpid = zpid
            if not resolved_zpid and address and not url:
                resolved_zpid = await self._resolve_zpid_from_address(address)

            query_zpid = resolved_zpid
            query_address = address if not query_zpid and not url else None

            result = await self.zillow.get_similar_rentals(zpid=query_zpid, url=url, address=query_address)

            if result.success and result.data:
                logger.info("Similar rent fetch successful")
                if isinstance(result.data, list):
                    results = result.data
                else:
                    # AXESSO similar-rent may use different keys than similar-sold
                    raw = result.data
                    results = (
                        raw.get("similarProperties")
                        or raw.get("properties")
                        or raw.get("results")
                        or raw.get("rentals")
                        or raw.get("rentalComps")
                        or raw.get("similarRentals")
                        or []
                    )
                    if "results" in raw and isinstance(raw.get("results"), list):
                        rlen = len(raw["results"])
                        logger.info("Similar rent: raw['results'] length = %d", rlen)
                        if rlen > 0:
                            first = raw["results"][0]
                            if isinstance(first, dict):
                                first_keys = list(first.keys())
                                logger.info("Similar rent: first item keys = %s", first_keys)
                                if "property" in first and isinstance(first["property"], dict):
                                    logger.info(
                                        "Similar rent: first item.property keys = %s",
                                        list(first["property"].keys()),
                                    )
                                if "listing" in first and isinstance(first["listing"], dict):
                                    logger.info(
                                        "Similar rent: first item.listing keys = %s",
                                        list(first["listing"].keys()),
                                    )
                    if not results and isinstance(raw, dict):
                        for key in ("data", "items", "rentalList", "rental_list", "forRent", "listings"):
                            val = raw.get(key)
                            if isinstance(val, list):
                                results = val
                                logger.info("Similar rent: using list from key %s (%d items)", key, len(results))
                                break
                        if not results:
                            key_types = {k: type(v).__name__ for k, v in raw.items()}
                            logger.info(
                                "Similar rent: response success but no list found; top-level keys: %s; value types: %s",
                                list(raw.keys()),
                                key_types,
                            )
                if not isinstance(results, list):
                    results = []

                # Filter out excluded zpids
                if exclude_zpids:
                    exclude_set = set(str(z) for z in exclude_zpids)
                    results = [r for r in results if str(r.get("zpid", r.get("id", ""))) not in exclude_set]

                # Store total before pagination for metadata
                total_available = len(results)

                # Apply pagination
                paginated_results = results[offset : offset + limit]

                return {
                    "success": True,
                    "results": paginated_results,
                    "total_count": len(paginated_results),
                    "total_available": total_available,
                    "offset": offset,
                    "limit": limit,
                    "has_more": (offset + limit) < total_available,
                    "fetched_at": datetime.now(UTC).isoformat(),
                }
            else:
                logger.warning(f"Similar rent fetch failed: {result.error}")
                return {
                    "success": False,
                    "error": result.error or "Failed to fetch similar rentals from AXESSO API",
                    "results": [],
                    "total_count": 0,
                    "total_available": 0,
                    "offset": offset,
                    "limit": limit,
                    "has_more": False,
                    "fetched_at": datetime.now(UTC).isoformat(),
                }
        except Exception as e:
            logger.error(f"Error fetching similar rentals: {e}")
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "total_count": 0,
                "total_available": 0,
                "offset": offset,
                "limit": limit,
                "has_more": False,
                "fetched_at": datetime.now(UTC).isoformat(),
            }

    async def get_similar_sold(
        self,
        zpid: str | None = None,
        url: str | None = None,
        address: str | None = None,
        limit: int = 10,
        offset: int = 0,
        exclude_zpids: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Fetch similar sold properties from Zillow via AXESSO API.

        Args:
            zpid: Zillow Property ID
            url: Property URL on Zillow
            address: Property address
            limit: Number of results to return
            offset: Number of results to skip
            exclude_zpids: List of zpids to exclude from results

        Returns:
            Dict with similar sold properties and pagination metadata
        """
        logger.info(f"Fetching similar sold - zpid: {zpid}, address: {address}, limit: {limit}, offset: {offset}")

        try:
            resolved_zpid = zpid
            if not resolved_zpid and address and not url:
                resolved_zpid = await self._resolve_zpid_from_address(address)

            query_zpid = resolved_zpid
            query_address = address if not query_zpid and not url else None

            result = await self.zillow.get_similar_sold(zpid=query_zpid, url=url, address=query_address)

            if result.success and result.data:
                logger.info("Similar sold fetch successful")
                if isinstance(result.data, list):
                    results = result.data
                else:
                    results = result.data.get(
                        "similarProperties", result.data.get("properties", result.data.get("results", []))
                    )

                # Filter out excluded zpids
                if exclude_zpids:
                    exclude_set = set(str(z) for z in exclude_zpids)
                    results = [r for r in results if str(r.get("zpid", r.get("id", ""))) not in exclude_set]

                # Store total before pagination for metadata
                total_available = len(results)

                # Apply pagination
                paginated_results = results[offset : offset + limit]

                return {
                    "success": True,
                    "results": paginated_results,
                    "total_count": len(paginated_results),
                    "total_available": total_available,
                    "offset": offset,
                    "limit": limit,
                    "has_more": (offset + limit) < total_available,
                    "fetched_at": datetime.now(UTC).isoformat(),
                }
            else:
                logger.warning(f"Similar sold fetch failed: {result.error}")
                return {
                    "success": False,
                    "error": result.error or "Failed to fetch similar sold from AXESSO API",
                    "results": [],
                    "total_count": 0,
                    "total_available": 0,
                    "offset": offset,
                    "limit": limit,
                    "has_more": False,
                    "fetched_at": datetime.now(UTC).isoformat(),
                }
        except Exception as e:
            logger.error(f"Error fetching similar sold: {e}")
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "total_count": 0,
                "total_available": 0,
                "offset": offset,
                "limit": limit,
                "has_more": False,
                "fetched_at": datetime.now(UTC).isoformat(),
            }

    def get_mock_property(self) -> PropertyResponse:
        """
        Return mock property data for testing/demo.
        Based on the Excel sample property.
        """
        timestamp = datetime.now(UTC)
        property_id = "demo-fl-12345"

        response = PropertyResponse(
            property_id=property_id,
            address=Address(
                street="123 Palm Beach Way",
                city="West Palm Beach",
                state="FL",
                zip_code="33486",
                county="Palm Beach County",
                full_address="123 Palm Beach Way, West Palm Beach, FL 33486",
            ),
            details=PropertyDetails(
                property_type="Single Family",
                bedrooms=4,
                bathrooms=2.5,
                square_footage=2450,
                lot_size=8000,
                year_built=1998,
                num_units=1,
            ),
            valuations=ValuationData(
                current_value_avm=425000,
                value_range_low=410000,
                value_range_high=440000,
                last_sale_price=385000,
                last_sale_date="2022-06-15",
                tax_assessed_value=380000,
                tax_assessment_year=2024,
                arv=465000,
                arv_flip=450000,
            ),
            rentals=RentalData(
                monthly_rent_ltr=2100,
                rent_range_low=1950,
                rent_range_high=2250,
                average_daily_rate=250,
                occupancy_rate=0.82,
                rent_per_sqft=0.86,
            ),
            market=MarketData(
                market_health_score=72, market_strength="Strong", property_taxes_annual=4500, hoa_fees_monthly=0
            ),
            provenance=ProvenanceMap(
                fields={
                    "current_value_avm": FieldProvenance(
                        source="rentcast",
                        fetched_at=timestamp.isoformat(),
                        confidence="high",
                        raw_values={"rentcast": 425000},
                        conflict_flag=False,
                    ),
                    "monthly_rent_ltr": FieldProvenance(
                        source="rentcast",
                        fetched_at=timestamp.isoformat(),
                        confidence="high",
                        raw_values={"rentcast": 2100},
                        conflict_flag=False,
                    ),
                    "average_daily_rate": FieldProvenance(
                        source="axesso",
                        fetched_at=timestamp.isoformat(),
                        confidence="medium",
                        raw_values={"axesso": 250},
                        conflict_flag=False,
                    ),
                }
            ),
            data_quality=DataQuality(
                completeness_score=85.0, missing_fields=["hoa_fees_monthly"], stale_fields=[], conflict_fields=[]
            ),
            fetched_at=timestamp,
        )

        return response


# Singleton instance
property_service = PropertyService()
