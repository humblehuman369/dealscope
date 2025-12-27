"""
Property service - orchestrates data fetching, normalization, and calculations.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import hashlib
import json
import uuid
import logging

from app.services.api_clients import (
    RentCastClient, AXESSOClient, DataNormalizer, create_api_clients
)
from app.services.zillow_client import ZillowClient, ZillowDataExtractor, create_zillow_client
from app.services.calculators import (
    calculate_ltr, calculate_str, calculate_brrrr,
    calculate_flip, calculate_house_hack, calculate_wholesale
)
from app.schemas import (
    PropertyResponse, AnalyticsResponse, AllAssumptions,
    StrategyType, Address, PropertyDetails, ValuationData,
    RentalData, MarketData, ProvenanceMap, DataQuality,
    LTRResults, STRResults, BRRRRResults, FlipResults,
    HouseHackResults, WholesaleResults, FieldProvenance
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class PropertyService:
    """
    Main service for property data operations.
    Handles API calls, data normalization, caching, and calculations.
    """
    
    def __init__(self):
        self.rentcast, self.axesso, self.normalizer = create_api_clients(
            rentcast_api_key=settings.RENTCAST_API_KEY,
            rentcast_url=settings.RENTCAST_URL,
            axesso_api_key=settings.AXESSO_API_KEY,
            axesso_url=settings.AXESSO_URL
        )
        
        # Use the comprehensive ZillowClient for Zillow data
        self.zillow = create_zillow_client(
            api_key=settings.AXESSO_API_KEY,
            base_url=settings.AXESSO_URL
        )
        
        # In-memory cache (replace with Redis in production)
        self._property_cache: Dict[str, Dict] = {}
        self._calculation_cache: Dict[str, Dict] = {}
    
    def _generate_property_id(self, address: str) -> str:
        """Generate consistent property ID from address."""
        normalized = address.lower().strip()
        return hashlib.md5(normalized.encode()).hexdigest()[:16]
    
    def _generate_assumptions_hash(self, assumptions: AllAssumptions) -> str:
        """Generate hash of assumptions for cache key."""
        assumptions_json = json.dumps(assumptions.model_dump(), sort_keys=True)
        return hashlib.md5(assumptions_json.encode()).hexdigest()[:12]
    
    async def search_property(self, address: str) -> PropertyResponse:
        """
        Search for property by address.
        Fetches from both APIs, normalizes, and returns unified response.
        """
        property_id = self._generate_property_id(address)
        timestamp = datetime.utcnow()
        
        # Check cache first
        if property_id in self._property_cache:
            cached = self._property_cache[property_id]
            cache_age = (timestamp - cached["fetched_at"]).total_seconds()
            if cache_age < 86400:  # 24 hour cache
                return cached["data"]
        
        # Fetch from RentCast
        rc_property = await self.rentcast.get_property(address)
        rc_value = await self.rentcast.get_value_estimate(address)
        rc_rent = await self.rentcast.get_rent_estimate(address)
        
        # Merge RentCast responses
        rentcast_data = {}
        if rc_property.success and rc_property.data:
            rentcast_data.update(rc_property.data[0] if isinstance(rc_property.data, list) else rc_property.data)
        if rc_value.success and rc_value.data:
            rentcast_data.update(rc_value.data)
        if rc_rent.success and rc_rent.data:
            rentcast_data.update(rc_rent.data)
        
        # Fetch from Zillow via AXESSO
        # The search-by-address endpoint returns all property data including Zestimate
        axesso_data = None
        zillow_zpid = None  # Store ZPID for photos API
        try:
            logger.info(f"Fetching Zillow data for: {address}")
            zillow_response = await self.zillow.search_by_address(address)
            
            if zillow_response.success and zillow_response.data:
                axesso_data = zillow_response.data
                zillow_zpid = axesso_data.get('zpid')
                zestimate = axesso_data.get('zestimate')
                rent_zestimate = axesso_data.get('rentZestimate')
                logger.info(f"Zillow data retrieved - zpid: {zillow_zpid}, zestimate: ${zestimate}, rentZestimate: ${rent_zestimate}")
            else:
                logger.warning(f"Zillow search failed for: {address} - {zillow_response.error}")
        except Exception as e:
            logger.error(f"Error fetching Zillow data: {e}")
        
        # Normalize and merge data
        normalized, provenance = self.normalizer.normalize(
            rentcast_data or None,
            axesso_data,
            timestamp
        )
        
        # Calculate data quality
        data_quality = self.normalizer.calculate_data_quality(normalized, provenance)
        
        # Build address object
        address_obj = self._parse_address(address, rentcast_data)
        
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
                num_units=normalized.get("num_units", 1)
            ),
            valuations=ValuationData(
                current_value_avm=normalized.get("current_value_avm"),
                value_range_low=normalized.get("value_range_low"),
                value_range_high=normalized.get("value_range_high"),
                last_sale_price=normalized.get("last_sale_price"),
                last_sale_date=normalized.get("last_sale_date"),
                tax_assessed_value=normalized.get("tax_assessed_value"),
                arv=self._estimate_arv(normalized),
                arv_flip=self._estimate_arv_flip(normalized),
                # Raw Zestimate data for frontend default calculations
                zestimate=normalized.get("zestimate"),
                zestimate_high_pct=normalized.get("zestimate_high_pct"),
                zestimate_low_pct=normalized.get("zestimate_low_pct")
            ),
            rentals=RentalData(
                monthly_rent_ltr=normalized.get("monthly_rent_ltr"),
                rent_range_low=normalized.get("rent_range_low"),
                rent_range_high=normalized.get("rent_range_high"),
                average_daily_rate=normalized.get("average_daily_rate") or self._estimate_adr(normalized),
                occupancy_rate=normalized.get("occupancy_rate") or 0.75,
                # Raw Zillow averageRent for frontend
                average_rent=normalized.get("average_rent")
            ),
            market=MarketData(
                property_taxes_annual=normalized.get("property_taxes_annual") or self._estimate_taxes(normalized),
                hoa_fees_monthly=normalized.get("hoa_fees_monthly", 0),
                # Mortgage rates for frontend
                mortgage_rate_arm5=normalized.get("mortgage_rate_arm5"),
                mortgage_rate_30yr=normalized.get("mortgage_rate_30yr")
            ),
            provenance=ProvenanceMap(fields={
                k: FieldProvenance(**v) if isinstance(v, dict) else v 
                for k, v in provenance.items()
            }),
            data_quality=DataQuality(**data_quality),
            fetched_at=timestamp
        )
        
        # Cache result
        self._property_cache[property_id] = {
            "data": response,
            "fetched_at": timestamp
        }
        
        return response
    
    def _parse_address(self, address: str, data: Dict = None) -> Address:
        """Parse address into components."""
        # Try to get structured address from API data
        if data:
            return Address(
                street=data.get("addressLine1", address.split(",")[0] if "," in address else address),
                city=data.get("city", ""),
                state=data.get("state", ""),
                zip_code=data.get("zipCode", ""),
                county=data.get("county"),
                full_address=data.get("formattedAddress", address)
            )
        
        # Fallback parsing
        parts = address.split(",")
        return Address(
            street=parts[0].strip() if len(parts) > 0 else address,
            city=parts[1].strip() if len(parts) > 1 else "",
            state=parts[2].strip().split()[0] if len(parts) > 2 else "",
            zip_code=parts[2].strip().split()[1] if len(parts) > 2 and len(parts[2].strip().split()) > 1 else "",
            county=None,
            full_address=address
        )
    
    def _estimate_arv(self, data: Dict) -> Optional[float]:
        """Estimate ARV for BRRRR strategy."""
        avm = data.get("current_value_avm")
        if avm:
            # ARV typically 10-15% above current market for distressed properties
            return avm * 1.10
        return None
    
    def _estimate_arv_flip(self, data: Dict) -> Optional[float]:
        """Estimate ARV for Fix & Flip."""
        avm = data.get("current_value_avm")
        if avm:
            # Conservative flip ARV
            return avm * 1.06
        return None
    
    def _estimate_adr(self, data: Dict) -> Optional[float]:
        """Estimate ADR from LTR rent if STR data unavailable."""
        monthly_rent = data.get("monthly_rent_ltr")
        if monthly_rent:
            # STR ADR is typically 2-3x daily equivalent of monthly rent
            daily_equivalent = monthly_rent / 30
            return daily_equivalent * 2.5
        return 200  # Default fallback
    
    def _estimate_taxes(self, data: Dict) -> float:
        """Estimate annual property taxes."""
        avm = data.get("current_value_avm")
        if avm:
            # Typical 1-1.5% of value
            return avm * 0.012
        return 4500  # Default fallback
    
    async def calculate_analytics(
        self,
        property_id: str,
        assumptions: AllAssumptions,
        strategies: Optional[List[StrategyType]] = None
    ) -> AnalyticsResponse:
        """
        Calculate investment analytics for all or specified strategies.
        """
        # Get property data from cache
        if property_id not in self._property_cache:
            raise ValueError(f"Property {property_id} not found. Search first.")
        
        property_data = self._property_cache[property_id]["data"]
        assumptions_hash = self._generate_assumptions_hash(assumptions)
        
        # Check calculation cache
        cache_key = f"{property_id}:{assumptions_hash}"
        if cache_key in self._calculation_cache:
            return self._calculation_cache[cache_key]
        
        # Determine which strategies to calculate
        all_strategies = [
            StrategyType.LONG_TERM_RENTAL,
            StrategyType.SHORT_TERM_RENTAL,
            StrategyType.BRRRR,
            StrategyType.FIX_AND_FLIP,
            StrategyType.HOUSE_HACK,
            StrategyType.WHOLESALE
        ]
        strategies_to_calc = strategies or all_strategies
        
        # Extract values with defaults
        purchase_price = assumptions.financing.purchase_price or property_data.valuations.current_value_avm or 425000
        monthly_rent = property_data.rentals.monthly_rent_ltr or 2100
        property_taxes = property_data.market.property_taxes_annual or 4500
        hoa = property_data.market.hoa_fees_monthly or 0
        adr = property_data.rentals.average_daily_rate or 250
        occupancy = property_data.rentals.occupancy_rate or 0.75
        arv = property_data.valuations.arv or purchase_price * 1.10
        arv_flip = property_data.valuations.arv_flip or purchase_price * 1.06
        
        results = AnalyticsResponse(
            property_id=property_id,
            assumptions_hash=assumptions_hash,
            calculated_at=datetime.utcnow()
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
                rent_growth_rate=assumptions.rent_growth_rate
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
                furniture_setup_cost=assumptions.str.furniture_setup_cost,
                platform_fees_pct=assumptions.str.platform_fees_pct,
                str_management_pct=assumptions.str.str_management_pct,
                cleaning_cost_per_turnover=assumptions.str.cleaning_cost_per_turnover,
                cleaning_fee_revenue=assumptions.str.cleaning_fee_revenue,
                avg_length_of_stay_days=assumptions.str.avg_length_of_stay_days,
                supplies_monthly=assumptions.str.supplies_monthly,
                additional_utilities_monthly=assumptions.str.additional_utilities_monthly,
                insurance_annual=assumptions.str.str_insurance_annual
            )
            results.str = STRResults(**str_result)
        
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
                refinance_closing_costs=assumptions.brrrr.refinance_closing_costs
            )
            results.brrrr = BRRRRResults(**brrrr_result)
        
        if StrategyType.FIX_AND_FLIP in strategies_to_calc:
            flip_result = calculate_flip(
                market_value=purchase_price,
                arv=arv_flip,
                purchase_discount_pct=0.20,
                hard_money_ltv=assumptions.flip.hard_money_ltv,
                hard_money_rate=assumptions.flip.hard_money_rate,
                closing_costs_pct=assumptions.financing.closing_costs_pct,
                renovation_budget=60500,  # Flip typically needs more
                contingency_pct=assumptions.rehab.contingency_pct,
                holding_period_months=assumptions.flip.holding_period_months,
                property_taxes_annual=property_taxes,
                selling_costs_pct=assumptions.flip.selling_costs_pct
            )
            results.flip = FlipResults(**flip_result)
        
        if StrategyType.HOUSE_HACK in strategies_to_calc:
            house_hack_result = calculate_house_hack(
                purchase_price=purchase_price,
                monthly_rent_per_room=assumptions.house_hack.room_rent_monthly,
                rooms_rented=assumptions.house_hack.units_rented_out,
                property_taxes_annual=property_taxes,
                owner_unit_market_rent=assumptions.house_hack.owner_unit_market_rent,
                down_payment_pct=assumptions.house_hack.fha_down_payment_pct,
                interest_rate=0.065,  # FHA rates typically lower
                loan_term_years=assumptions.financing.loan_term_years,
                closing_costs_pct=assumptions.financing.closing_costs_pct,
                fha_mip_rate=assumptions.house_hack.fha_mip_rate,
                insurance_annual=assumptions.operating.insurance_annual
            )
            results.house_hack = HouseHackResults(**house_hack_result)
        
        if StrategyType.WHOLESALE in strategies_to_calc:
            wholesale_result = calculate_wholesale(
                arv=arv_flip,
                estimated_rehab_costs=50000,
                assignment_fee=assumptions.wholesale.assignment_fee,
                marketing_costs=assumptions.wholesale.marketing_costs,
                earnest_money_deposit=assumptions.wholesale.earnest_money_deposit,
                days_to_close=assumptions.wholesale.days_to_close
            )
            results.wholesale = WholesaleResults(**wholesale_result)
        
        # Cache results
        self._calculation_cache[cache_key] = results
        
        return results
    
    def _normalize_photo(self, photo: Dict[str, Any]) -> Optional[Dict[str, Any]]:
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
                "height": photo.get("height")
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
                        "height": best_source.get("height")
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
                        "height": best_source.get("height")
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
                        "height": best.get("height")
                    }
        
        return None
    
    async def get_property_photos(
        self, 
        zpid: Optional[str] = None, 
        url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch property photos from Zillow via AXESSO API.
        
        Note: AXESSO doesn't have a dedicated photos endpoint.
        Photos are fetched from the property-v2 endpoint response.
        
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
                    "fetched_at": datetime.utcnow().isoformat()
                }
            else:
                logger.warning(f"Photo fetch failed: {result.error}")
                return {
                    "success": False,
                    "zpid": zpid,
                    "url": url,
                    "error": result.error or "Failed to fetch photos from AXESSO API",
                    "photos": [],
                    "total_count": 0,
                    "fetched_at": datetime.utcnow().isoformat()
                }
        except Exception as e:
            logger.error(f"Error fetching photos: {e}")
            return {
                "success": False,
                "zpid": zpid,
                "url": url,
                "error": str(e),
                "photos": [],
                "total_count": 0,
                "fetched_at": datetime.utcnow().isoformat()
            }
    
    def get_mock_property(self) -> PropertyResponse:
        """
        Return mock property data for testing/demo.
        Based on the Excel sample property.
        """
        timestamp = datetime.utcnow()
        property_id = "demo-fl-12345"
        
        response = PropertyResponse(
            property_id=property_id,
            address=Address(
                street="123 Palm Beach Way",
                city="West Palm Beach",
                state="FL",
                zip_code="33486",
                county="Palm Beach County",
                full_address="123 Palm Beach Way, West Palm Beach, FL 33486"
            ),
            details=PropertyDetails(
                property_type="Single Family",
                bedrooms=4,
                bathrooms=2.5,
                square_footage=2450,
                lot_size=8000,
                year_built=1998,
                num_units=1
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
                arv_flip=450000
            ),
            rentals=RentalData(
                monthly_rent_ltr=2100,
                rent_range_low=1950,
                rent_range_high=2250,
                average_daily_rate=250,
                occupancy_rate=0.82,
                rent_per_sqft=0.86
            ),
            market=MarketData(
                market_health_score=72,
                market_strength="Strong",
                property_taxes_annual=4500,
                hoa_fees_monthly=0
            ),
            provenance=ProvenanceMap(fields={
                "current_value_avm": FieldProvenance(
                    source="rentcast",
                    fetched_at=timestamp.isoformat(),
                    confidence="high",
                    raw_values={"rentcast": 425000},
                    conflict_flag=False
                ),
                "monthly_rent_ltr": FieldProvenance(
                    source="rentcast",
                    fetched_at=timestamp.isoformat(),
                    confidence="high",
                    raw_values={"rentcast": 2100},
                    conflict_flag=False
                ),
                "average_daily_rate": FieldProvenance(
                    source="axesso",
                    fetched_at=timestamp.isoformat(),
                    confidence="medium",
                    raw_values={"axesso": 250},
                    conflict_flag=False
                )
            }),
            data_quality=DataQuality(
                completeness_score=85.0,
                missing_fields=["hoa_fees_monthly"],
                stale_fields=[],
                conflict_fields=[]
            ),
            fetched_at=timestamp
        )
        
        # Cache it
        self._property_cache[property_id] = {
            "data": response,
            "fetched_at": timestamp
        }
        
        return response


# Singleton instance
property_service = PropertyService()
