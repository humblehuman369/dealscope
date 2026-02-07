"""
InvestIQ Unified Property Service

Orchestrates data fetching from RentCast and Zillow (AXESSO), normalizes the data,
and provides a single interface for investment analysis.

This is the MAIN entry point for property data in the application.
"""
import asyncio
import json
import csv
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone
from dataclasses import asdict
from pathlib import Path

from .api_clients import RentCastClient, create_api_clients, APIProvider
from .zillow_client import ZillowClient, create_zillow_client, ZillowAPIResponse
from .data_normalizer import (
    InvestIQNormalizer, NormalizedProperty, DataSource, ConfidenceLevel
)
from .calculators import calculate_seller_motivation, extract_condition_keywords

logger = logging.getLogger(__name__)


class UnifiedPropertyService:
    """
    Main service for fetching and analyzing property data.
    
    Features:
    - Parallel data fetching from RentCast and Zillow
    - Intelligent data normalization and conflict resolution
    - Investment metrics calculation
    - Data export to CSV/JSON
    - Caching support (optional)
    """
    
    def __init__(
        self,
        rentcast_api_key: str,
        rentcast_url: str,
        axesso_api_key: str,
        axesso_url: str = "https://api.axesso.de/zil"
    ):
        self.rentcast = RentCastClient(rentcast_api_key, rentcast_url)
        self.zillow = create_zillow_client(axesso_api_key, axesso_url)
        self.normalizer = InvestIQNormalizer()
    
    async def get_property(
        self,
        address: str,
        include_zillow_photos: bool = False
    ) -> Dict[str, Any]:
        """
        Get comprehensive property data from all sources.
        
        Args:
            address: Full property address
            include_zillow_photos: Whether to fetch Zillow photos
        
        Returns:
            Dict containing:
            - normalized: NormalizedProperty with merged data
            - raw: Raw responses from each API
            - investment_metrics: Calculated investment metrics
            - data_quality: Quality assessment
        """
        start_time = datetime.now(timezone.utc)
        
        # Fetch from both sources in parallel
        rentcast_task = self._fetch_all_rentcast(address)
        zillow_task = self._fetch_all_zillow(address, include_zillow_photos)
        
        rentcast_data, zillow_data = await asyncio.gather(
            rentcast_task, zillow_task, return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(rentcast_data, Exception):
            logger.error(f"RentCast fetch failed: {rentcast_data}")
            rentcast_data = None
        if isinstance(zillow_data, Exception):
            logger.error(f"Zillow fetch failed: {zillow_data}")
            zillow_data = None
        
        # Normalize and merge
        normalized = self.normalizer.normalize(rentcast_data, zillow_data)
        
        # Calculate investment metrics
        investment_metrics = self._calculate_investment_metrics(normalized)
        
        # Calculate seller motivation score
        seller_motivation = self._calculate_seller_motivation(normalized)
        
        # Build response
        elapsed_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        
        return {
            "normalized": self._property_to_dict(normalized),
            "raw": {
                "rentcast": rentcast_data,
                "zillow": self._zillow_responses_to_dict(zillow_data)
            },
            "investment_metrics": investment_metrics,
            "seller_motivation": seller_motivation,
            "data_quality": {
                "score": normalized.data_quality_score,
                "missing_fields": normalized.missing_fields,
                "conflict_fields": normalized.conflict_fields,
                "provenance_summary": self._summarize_provenance(normalized)
            },
            "metadata": {
                "address": address,
                "fetched_at": normalized.data_fetched_at.isoformat(),
                "fetch_duration_ms": round(elapsed_ms, 2),
                "rentcast_available": rentcast_data is not None,
                "zillow_available": zillow_data is not None
            }
        }
    
    async def _fetch_all_rentcast(self, address: str) -> Dict[str, Any]:
        """Fetch all RentCast data for an address."""
        results = {
            "api": "RentCast",
            "address": address,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "endpoints": {}
        }
        
        # Fetch all endpoints in parallel
        tasks = [
            ("properties", self.rentcast.get_property(address)),
            ("avm_value", self.rentcast.get_value_estimate(address)),
            ("rent_estimate", self.rentcast.get_rent_estimate(address)),
        ]
        
        # Extract zip code for market stats
        parts = address.split()
        zip_code = None
        for part in parts:
            if part.replace("-", "").isdigit() and len(part.replace("-", "")) >= 5:
                zip_code = part[:5]
                break
        
        if zip_code:
            tasks.append(("market_stats", self.rentcast.get_market_statistics(zip_code=zip_code)))
        
        task_names = [t[0] for t in tasks]
        task_coros = [t[1] for t in tasks]
        
        responses = await asyncio.gather(*task_coros, return_exceptions=True)
        
        for name, response in zip(task_names, responses):
            if isinstance(response, Exception):
                results["endpoints"][name] = {
                    "status_code": None,
                    "data": None,
                    "error": str(response)
                }
            else:
                results["endpoints"][name] = {
                    "status_code": 200 if response.success else 500,
                    "data": response.data,
                    "error": response.error
                }
        
        return results
    
    async def _fetch_all_zillow(
        self,
        address: str,
        include_photos: bool = False
    ) -> Dict[str, Any]:
        """Fetch all Zillow data for an address using AXESSO API."""
        return await self.zillow.get_complete_property_data(address, include_photos)
    
    def _calculate_seller_motivation(self, prop: NormalizedProperty) -> Dict[str, Any]:
        """
        Calculate seller motivation score from normalized property data.
        
        Uses multiple indicators to determine seller motivation level:
        - Days on Market
        - Price reductions
        - Listing status (withdrawn, foreclosure, etc.)
        - Ownership type (absentee, out-of-state)
        - Property condition (inferred from description)
        """
        # Extract condition keywords from description
        condition_keywords = extract_condition_keywords(prop.property_description)
        
        # Determine if likely vacant (absentee + not listed for rent)
        is_likely_vacant = None
        if prop.is_non_owner_occupied and prop.listing_status not in ["FOR_RENT"]:
            is_likely_vacant = True
        
        # Calculate seller motivation score
        motivation_result = calculate_seller_motivation(
            # Days on Market
            days_on_market=prop.days_on_market,
            market_median_dom=prop.market_days_on_market,
            # Price History
            price_reduction_count=prop.price_reduction_count,
            total_price_reduction_pct=prop.total_price_reduction_pct,
            # Listing Status
            listing_status=prop.listing_status,
            is_withdrawn=prop.is_withdrawn,
            # Distress Indicators
            is_foreclosure=prop.is_foreclosure,
            is_pre_foreclosure=prop.is_pre_foreclosure,
            is_bank_owned=prop.is_bank_owned,
            is_auction=prop.is_auction,
            # Ownership
            is_owner_occupied=prop.owner_occupied,
            is_absentee_owner=prop.is_non_owner_occupied,
            owner_state=prop.owner_mailing_state,
            property_state=prop.state,
            # Vacancy
            is_likely_vacant=is_likely_vacant,
            # Condition
            condition_keywords_found=condition_keywords if condition_keywords else None,
            # Inheritance indicator
            last_sale_price=prop.last_sale_price,
            # Engagement metrics
            favorite_count=prop.favorite_count,
            page_view_count=prop.page_view_count,
            selling_soon_percentile=prop.selling_soon_percentile,
            # FSBO
            is_fsbo=prop.is_fsbo,
            # Market context
            market_temperature=prop.market_temperature,
        )
        
        return motivation_result
    
    def _calculate_investment_metrics(self, prop: NormalizedProperty) -> Dict[str, Any]:
        """
        Calculate key investment metrics from normalized data.
        
        Metrics calculated:
        - Gross Rent Multiplier (GRM)
        - Cap Rate (estimated)
        - Cash-on-Cash ROI (estimated)
        - Price per Square Foot
        - Rent per Square Foot
        """
        metrics = {}
        
        value = prop.current_value_avm
        rent = prop.monthly_rent_estimate
        sqft = prop.square_footage
        annual_tax = prop.annual_property_tax
        
        # Gross Rent Multiplier
        if value and rent and rent > 0:
            annual_rent = rent * 12
            metrics["gross_rent_multiplier"] = round(value / annual_rent, 2)
        
        # Estimated Cap Rate
        # Assumes 35% expense ratio for quick estimate
        if value and rent and value > 0:
            annual_rent = rent * 12
            estimated_expenses = annual_rent * 0.35
            if annual_tax:
                estimated_expenses = annual_tax + (annual_rent * 0.15)  # Tax + 15% other
            noi = annual_rent - estimated_expenses
            metrics["estimated_cap_rate"] = round((noi / value) * 100, 2)
        
        # Price per Square Foot
        if value and sqft and sqft > 0:
            metrics["price_per_sqft"] = round(value / sqft, 2)
        
        # Rent per Square Foot
        if rent and sqft and sqft > 0:
            metrics["rent_per_sqft"] = round(rent / sqft, 2)
        
        # Monthly Cash Flow Estimate (with assumptions)
        if rent and annual_tax:
            monthly_tax = annual_tax / 12
            # Assume 8% for insurance, maintenance, vacancy
            other_expenses = rent * 0.08
            # Assume 25% down, 7% rate, 30yr
            if value:
                loan_amount = value * 0.75
                monthly_payment = self._calculate_mortgage(loan_amount, 0.07, 30)
                estimated_cash_flow = rent - monthly_tax - other_expenses - monthly_payment
                metrics["estimated_monthly_cash_flow"] = round(estimated_cash_flow, 2)
                
                # Cash on Cash ROI
                down_payment = value * 0.25
                closing_costs = value * 0.03
                total_cash_in = down_payment + closing_costs
                annual_cash_flow = estimated_cash_flow * 12
                if total_cash_in > 0:
                    metrics["estimated_cash_on_cash_roi"] = round(
                        (annual_cash_flow / total_cash_in) * 100, 2
                    )
        
        # Market comparison
        if prop.market_median_price and value:
            metrics["vs_market_median_pct"] = round(
                ((value - prop.market_median_price) / prop.market_median_price) * 100, 2
            )
        
        if prop.market_avg_price_sqft and sqft and value:
            expected_value = prop.market_avg_price_sqft * sqft
            metrics["vs_market_value_pct"] = round(
                ((value - expected_value) / expected_value) * 100, 2
            )
        
        # Valuation comparison (RentCast vs Zillow)
        if prop.rentcast_avm and prop.zestimate:
            variance = abs(prop.rentcast_avm - prop.zestimate) / prop.rentcast_avm * 100
            metrics["avm_variance_pct"] = round(variance, 2)
            metrics["avm_comparison"] = {
                "rentcast": prop.rentcast_avm,
                "zillow": prop.zestimate,
                "difference": prop.rentcast_avm - prop.zestimate,
                "recommended_value": prop.current_value_avm
            }
        
        # Rent comparison
        if prop.rentcast_rent and prop.rent_zestimate:
            variance = abs(prop.rentcast_rent - prop.rent_zestimate) / prop.rentcast_rent * 100
            metrics["rent_variance_pct"] = round(variance, 2)
            metrics["rent_comparison"] = {
                "rentcast": prop.rentcast_rent,
                "zillow": prop.rent_zestimate,
                "difference": prop.rentcast_rent - prop.rent_zestimate,
                "recommended_rent": prop.monthly_rent_estimate
            }
        
        return metrics
    
    def _calculate_mortgage(
        self,
        principal: float,
        annual_rate: float,
        years: int
    ) -> float:
        """Calculate monthly mortgage payment."""
        monthly_rate = annual_rate / 12
        num_payments = years * 12
        if monthly_rate == 0:
            return principal / num_payments
        return principal * (monthly_rate * (1 + monthly_rate)**num_payments) / \
               ((1 + monthly_rate)**num_payments - 1)
    
    def _property_to_dict(self, prop: NormalizedProperty) -> Dict[str, Any]:
        """Convert NormalizedProperty to dictionary."""
        result = {}
        for field_name in dir(prop):
            if field_name.startswith("_"):
                continue
            value = getattr(prop, field_name)
            if callable(value):
                continue
            
            # Handle special types
            if isinstance(value, datetime):
                result[field_name] = value.isoformat()
            elif hasattr(value, "__dict__"):
                # Skip complex objects like provenance
                continue
            elif field_name == "provenance":
                # Summarize provenance
                result["provenance"] = {
                    k: {
                        "source": v.source.value if hasattr(v.source, "value") else str(v.source),
                        "confidence": v.confidence.value if hasattr(v.confidence, "value") else str(v.confidence),
                        "conflict": v.conflict_flag
                    }
                    for k, v in value.items()
                }
            else:
                result[field_name] = value
        
        return result
    
    def _zillow_responses_to_dict(self, data: Optional[Dict]) -> Optional[Dict]:
        """Convert Zillow responses to serializable dict."""
        if data is None:
            return None
        
        result = {}
        for key, value in data.items():
            if isinstance(value, ZillowAPIResponse):
                result[key] = {
                    "success": value.success,
                    "endpoint": value.endpoint.value if hasattr(value.endpoint, "value") else str(value.endpoint),
                    "data": value.data,
                    "error": value.error,
                    "status_code": value.status_code
                }
            else:
                result[key] = value
        
        return result
    
    def _summarize_provenance(self, prop: NormalizedProperty) -> Dict[str, Any]:
        """Summarize data provenance."""
        sources = {"rentcast": 0, "zillow": 0, "merged": 0, "missing": 0}
        confidence = {"high": 0, "medium": 0, "low": 0, "missing": 0}
        
        for field, prov in prop.provenance.items():
            source_key = prov.source.value if hasattr(prov.source, "value") else str(prov.source)
            conf_key = prov.confidence.value if hasattr(prov.confidence, "value") else str(prov.confidence)
            
            if source_key in sources:
                sources[source_key] += 1
            if conf_key in confidence:
                confidence[conf_key] += 1
        
        return {
            "by_source": sources,
            "by_confidence": confidence,
            "total_fields": len(prop.provenance)
        }
    
    async def export_to_csv(
        self,
        address: str,
        output_path: str,
        include_raw: bool = False
    ) -> str:
        """
        Fetch property data and export to CSV.
        
        Args:
            address: Property address
            output_path: Path to save CSV
            include_raw: Whether to include raw API responses
        
        Returns:
            Path to created CSV file
        """
        data = await self.get_property(address)
        normalized = data["normalized"]
        metrics = data["investment_metrics"]
        quality = data["data_quality"]
        
        rows = []
        
        # Header section
        rows.append(["INVESTIQ PROPERTY ANALYSIS REPORT", "", ""])
        rows.append(["Generated", datetime.now(timezone.utc).isoformat(), ""])
        rows.append(["Address", address, ""])
        rows.append(["Data Quality Score", f"{quality['score']}%", ""])
        rows.append(["", "", ""])
        
        # Property Details
        rows.append(["PROPERTY DETAILS", "Value", "Source"])
        for key in ["property_type", "bedrooms", "bathrooms", "square_footage",
                   "lot_size", "year_built", "stories"]:
            value = normalized.get(key, "N/A")
            prov = normalized.get("provenance", {}).get(key, {})
            source = prov.get("source", "unknown")
            rows.append([key.replace("_", " ").title(), str(value), source])
        rows.append(["", "", ""])
        
        # Features
        rows.append(["FEATURES", "Value", "Source"])
        for key in ["has_pool", "has_garage", "garage_spaces", "has_heating",
                   "heating_type", "has_cooling", "cooling_type", "exterior_type",
                   "roof_type", "view_type"]:
            value = normalized.get(key, "N/A")
            prov = normalized.get("provenance", {}).get(key, {})
            source = prov.get("source", "unknown")
            rows.append([key.replace("_", " ").title(), str(value), source])
        rows.append(["", "", ""])
        
        # Valuations
        rows.append(["VALUATIONS", "Value", "Source"])
        rows.append(["Current AVM Estimate", f"${normalized.get('current_value_avm') or 0:,.0f}",
                    normalized.get("provenance", {}).get("current_value_avm", {}).get("source", "")])
        rows.append(["RentCast AVM", f"${normalized.get('rentcast_avm') or 0:,.0f}", "rentcast"])
        rows.append(["Zillow Zestimate", f"${normalized.get('zestimate') or 0:,.0f}", "zillow"])
        rows.append(["Value Range Low", f"${normalized.get('value_range_low') or 0:,.0f}", ""])
        rows.append(["Value Range High", f"${normalized.get('value_range_high') or 0:,.0f}", ""])
        rows.append(["Last Sale Price", f"${normalized.get('last_sale_price') or 0:,.0f}", ""])
        rows.append(["Last Sale Date", str(normalized.get("last_sale_date") or "N/A"), ""])
        rows.append(["", "", ""])
        
        # Rental
        rows.append(["RENTAL DATA", "Value", "Source"])
        rows.append(["Monthly Rent Estimate", f"${normalized.get('monthly_rent_estimate') or 0:,.0f}",
                    normalized.get("provenance", {}).get("monthly_rent_estimate", {}).get("source", "")])
        rows.append(["RentCast Rent", f"${normalized.get('rentcast_rent') or 0:,.0f}", "rentcast"])
        rows.append(["Zillow Rent Zestimate", f"${normalized.get('rent_zestimate') or 0:,.0f}", "zillow"])
        rows.append(["Rent Range Low", f"${normalized.get('rent_range_low') or 0:,.0f}", ""])
        rows.append(["Rent Range High", f"${normalized.get('rent_range_high') or 0:,.0f}", ""])
        rows.append(["", "", ""])
        
        # Tax
        rows.append(["TAX INFORMATION", "Value", "Source"])
        rows.append(["Annual Property Tax", f"${normalized.get('annual_property_tax') or 0:,.0f}", ""])
        rows.append(["Tax Assessed Value", f"${normalized.get('tax_assessed_value') or 0:,.0f}", ""])
        rows.append(["Tax Year", str(normalized.get("tax_year", "N/A")), ""])
        rows.append(["", "", ""])
        
        # Scores
        rows.append(["LOCATION SCORES", "Value", "Source"])
        rows.append(["Walk Score", str(normalized.get("walk_score", "N/A")), "zillow"])
        rows.append(["Transit Score", str(normalized.get("transit_score", "N/A")), "zillow"])
        rows.append(["Bike Score", str(normalized.get("bike_score", "N/A")), "zillow"])
        rows.append(["School Rating Avg", str(normalized.get("school_rating_avg", "N/A")), "zillow"])
        rows.append(["", "", ""])
        
        # Investment Metrics
        rows.append(["INVESTMENT METRICS", "Value", "Notes"])
        for key, value in metrics.items():
            if isinstance(value, dict):
                continue
            if isinstance(value, float):
                if "pct" in key or "roi" in key or "rate" in key:
                    rows.append([key.replace("_", " ").title(), f"{value}%", ""])
                elif value > 100:
                    rows.append([key.replace("_", " ").title(), f"${value:,.0f}", ""])
                else:
                    rows.append([key.replace("_", " ").title(), f"{value:.2f}", ""])
            else:
                rows.append([key.replace("_", " ").title(), str(value), ""])
        rows.append(["", "", ""])
        
        # AVM Comparison
        if "avm_comparison" in metrics:
            rows.append(["AVM COMPARISON", "Value", ""])
            comp = metrics["avm_comparison"]
            rows.append(["RentCast AVM", f"${comp.get('rentcast', 0):,.0f}", ""])
            rows.append(["Zillow Zestimate", f"${comp.get('zillow', 0):,.0f}", ""])
            rows.append(["Difference", f"${comp.get('difference', 0):,.0f}", ""])
            rows.append(["Recommended Value", f"${comp.get('recommended_value', 0):,.0f}", "Weighted merge"])
            rows.append(["", "", ""])
        
        # Data Quality
        rows.append(["DATA QUALITY", "Status", ""])
        rows.append(["Quality Score", f"{quality['score']}%", ""])
        rows.append(["Missing Fields", ", ".join(quality.get("missing_fields", [])) or "None", ""])
        rows.append(["Conflict Fields", ", ".join(quality.get("conflict_fields", [])) or "None", ""])
        
        # Write CSV
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerows(rows)
        
        return output_path
    
    async def export_to_json(
        self,
        address: str,
        output_path: str,
        include_raw: bool = True
    ) -> str:
        """
        Fetch property data and export to JSON.
        """
        data = await self.get_property(address)
        
        if not include_raw:
            del data["raw"]
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str)
        
        return output_path


def create_unified_service(
    rentcast_api_key: str,
    rentcast_url: str,
    axesso_api_key: str,
    axesso_url: str = "https://api.axesso.de/zil"
) -> UnifiedPropertyService:
    """Factory function for UnifiedPropertyService."""
    return UnifiedPropertyService(
        rentcast_api_key=rentcast_api_key,
        rentcast_url=rentcast_url,
        axesso_api_key=axesso_api_key,
        axesso_url=axesso_url
    )

