"""
Comps Calculator Service - Appraisal-style valuation calculations.

Provides weighted hybrid calculations combining:
- Adjusted price method (accounts for property differences)
- Price-per-sqft method (normalized comparison)
- Similarity weighting (higher weight for more similar comps)
"""

import logging
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class AdjustmentFactors:
    """Configuration for property adjustment calculations."""

    # Price adjustments per unit difference
    sqft_adjustment_per_sqft: float = 100.0  # $ per sqft difference
    bedroom_adjustment: float = 15000.0  # $ per bedroom difference
    bathroom_adjustment: float = 10000.0  # $ per bathroom difference
    age_adjustment_per_year: float = 1500.0  # $ per year age difference
    lot_adjustment_per_acre: float = 25000.0  # $ per acre difference

    # Method weights for hybrid calculation
    adjusted_price_weight: float = 0.40
    price_per_sqft_weight: float = 0.40
    hybrid_blend_weight: float = 0.20

    # Similarity scoring weights
    location_weight: float = 0.25
    size_weight: float = 0.25
    bed_bath_weight: float = 0.20
    age_weight: float = 0.15
    lot_weight: float = 0.15


@dataclass
class CompAdjustment:
    """Individual comp adjustment breakdown."""

    comp_id: str
    comp_address: str
    base_price: float
    size_adjustment: float
    bedroom_adjustment: float
    bathroom_adjustment: float
    age_adjustment: float
    lot_adjustment: float
    total_adjustment: float
    adjusted_price: float
    price_per_sqft: float
    similarity_score: float
    weight: float  # Normalized weight based on similarity


@dataclass
class AppraisalResult:
    """Complete appraisal calculation result."""

    market_value: int
    arv: int
    confidence: int
    range_low: int
    range_high: int

    # Methodology breakdown
    adjusted_price_value: float
    price_per_sqft_value: float
    weighted_average_ppsf: float

    # Individual comp adjustments
    comp_adjustments: list[dict[str, Any]]

    # Metadata
    comp_count: int
    avg_similarity: float
    methodology: str = "weighted_hybrid"


class CompsCalculator:
    """
    Calculator for appraisal-style valuations using comparable sales.

    Implements a weighted hybrid methodology that:
    1. Calculates adjusted prices for each comp (accounting for differences)
    2. Calculates price-per-sqft values for each comp
    3. Applies similarity weighting (more similar comps get higher weight)
    4. Blends the methods for a final market value estimate
    """

    def __init__(self, factors: AdjustmentFactors | None = None):
        self.factors = factors or AdjustmentFactors()

    def calculate_similarity_score(self, subject: dict[str, Any], comp: dict[str, Any]) -> dict[str, float]:
        """
        Calculate similarity score between subject property and comp.

        Returns breakdown of similarity by category.
        """
        scores = {}

        # Location score (based on distance)
        distance = comp.get("distance", 1.0)
        scores["location"] = max(0, min(100, 100 - (distance * 20)))

        # Size score (based on sqft difference)
        subject_sqft = subject.get("sqft", subject.get("squareFootage", 1500))
        comp_sqft = comp.get("sqft", comp.get("squareFootage", comp.get("livingArea", 1500)))
        if subject_sqft > 0 and comp_sqft > 0:
            sqft_diff_pct = abs(subject_sqft - comp_sqft) / subject_sqft * 100
            scores["size"] = max(0, 100 - sqft_diff_pct)
        else:
            scores["size"] = 70

        # Bed/Bath score
        subject_beds = subject.get("beds", subject.get("bedrooms", 3))
        subject_baths = subject.get("baths", subject.get("bathrooms", 2))
        comp_beds = comp.get("beds", comp.get("bedrooms", 3))
        comp_baths = comp.get("baths", comp.get("bathrooms", 2))

        bed_diff = abs(subject_beds - comp_beds)
        bath_diff = abs(subject_baths - comp_baths)

        if bed_diff == 0 and bath_diff == 0:
            scores["bed_bath"] = 100
        elif bed_diff <= 1 and bath_diff <= 1:
            scores["bed_bath"] = 85
        else:
            scores["bed_bath"] = max(50, 100 - (bed_diff * 15) - (bath_diff * 10))

        # Age score
        subject_year = subject.get("yearBuilt", subject.get("year_built", 2000))
        comp_year = comp.get("yearBuilt", comp.get("year_built", 2000))
        year_diff = abs(subject_year - comp_year)
        scores["age"] = max(0, 100 - (year_diff * 2))

        # Lot score
        subject_lot = subject.get("lotSize", subject.get("lot_size", 0.25))
        comp_lot = comp.get("lotSize", comp.get("lot_size", 0.25))
        if subject_lot > 0 and comp_lot > 0:
            lot_diff_pct = abs(subject_lot - comp_lot) / subject_lot * 100
            scores["lot"] = max(0, 100 - lot_diff_pct)
        else:
            scores["lot"] = 80

        # Calculate overall weighted score
        f = self.factors
        scores["overall"] = (
            scores["location"] * f.location_weight
            + scores["size"] * f.size_weight
            + scores["bed_bath"] * f.bed_bath_weight
            + scores["age"] * f.age_weight
            + scores["lot"] * f.lot_weight
        )

        return scores

    def calculate_adjustments(self, subject: dict[str, Any], comp: dict[str, Any]) -> dict[str, float]:
        """
        Calculate price adjustments for a comp relative to subject.

        Positive adjustments increase comp's value (comp is inferior).
        Negative adjustments decrease comp's value (comp is superior).
        """
        f = self.factors
        adjustments = {}

        # Size adjustment (larger subject = positive adjustment)
        subject_sqft = subject.get("sqft", subject.get("squareFootage", 1500))
        comp_sqft = comp.get("sqft", comp.get("squareFootage", comp.get("livingArea", 1500)))
        sqft_diff = subject_sqft - comp_sqft
        adjustments["size"] = sqft_diff * f.sqft_adjustment_per_sqft

        # Bedroom adjustment
        subject_beds = subject.get("beds", subject.get("bedrooms", 3))
        comp_beds = comp.get("beds", comp.get("bedrooms", 3))
        adjustments["bedroom"] = (subject_beds - comp_beds) * f.bedroom_adjustment

        # Bathroom adjustment
        subject_baths = subject.get("baths", subject.get("bathrooms", 2))
        comp_baths = comp.get("baths", comp.get("bathrooms", 2))
        adjustments["bathroom"] = (subject_baths - comp_baths) * f.bathroom_adjustment

        # Age adjustment (newer subject = positive adjustment)
        subject_year = subject.get("yearBuilt", subject.get("year_built", 2000))
        comp_year = comp.get("yearBuilt", comp.get("year_built", 2000))
        adjustments["age"] = (subject_year - comp_year) * f.age_adjustment_per_year

        # Lot size adjustment
        subject_lot = subject.get("lotSize", subject.get("lot_size", 0.25))
        comp_lot = comp.get("lotSize", comp.get("lot_size", 0.25))
        adjustments["lot"] = (subject_lot - comp_lot) * f.lot_adjustment_per_acre

        # Total
        adjustments["total"] = sum(
            [
                adjustments["size"],
                adjustments["bedroom"],
                adjustments["bathroom"],
                adjustments["age"],
                adjustments["lot"],
            ]
        )

        return adjustments

    def calculate_weighted_hybrid_value(
        self, subject: dict[str, Any], selected_comps: list[dict[str, Any]], rehab_premium_pct: float = 0.15
    ) -> AppraisalResult:
        """
        Calculate market value and ARV using weighted hybrid methodology.

        Args:
            subject: Subject property details
            selected_comps: List of selected comparable properties
            rehab_premium_pct: Premium to add for ARV calculation (default 15%)

        Returns:
            AppraisalResult with complete breakdown
        """
        if not selected_comps:
            return AppraisalResult(
                market_value=0,
                arv=0,
                confidence=0,
                range_low=0,
                range_high=0,
                adjusted_price_value=0,
                price_per_sqft_value=0,
                weighted_average_ppsf=0,
                comp_adjustments=[],
                comp_count=0,
                avg_similarity=0,
            )

        subject_sqft = subject.get("sqft", subject.get("squareFootage", 1500))
        comp_adjustments = []

        # Calculate adjustments and similarity for each comp
        for comp in selected_comps:
            # Get comp price
            comp_price = comp.get("price", comp.get("salePrice", comp.get("soldPrice", 0)))
            comp_sqft = comp.get("sqft", comp.get("squareFootage", comp.get("livingArea", 1500)))

            # Calculate similarity
            similarity = self.calculate_similarity_score(subject, comp)

            # Calculate adjustments
            adjustments = self.calculate_adjustments(subject, comp)

            # Price per sqft
            ppsf = comp_price / comp_sqft if comp_sqft > 0 else 0

            comp_adjustment = CompAdjustment(
                comp_id=str(comp.get("zpid", comp.get("id", ""))),
                comp_address=comp.get("address", comp.get("streetAddress", "Unknown")),
                base_price=comp_price,
                size_adjustment=adjustments["size"],
                bedroom_adjustment=adjustments["bedroom"],
                bathroom_adjustment=adjustments["bathroom"],
                age_adjustment=adjustments["age"],
                lot_adjustment=adjustments["lot"],
                total_adjustment=adjustments["total"],
                adjusted_price=comp_price + adjustments["total"],
                price_per_sqft=ppsf,
                similarity_score=similarity["overall"],
                weight=0,  # Will be calculated after all similarities are known
            )
            comp_adjustments.append(comp_adjustment)

        # Calculate weights based on similarity scores
        total_similarity = sum(ca.similarity_score for ca in comp_adjustments)
        if total_similarity > 0:
            for ca in comp_adjustments:
                ca.weight = ca.similarity_score / total_similarity
        else:
            # Equal weights if no similarity scores
            equal_weight = 1.0 / len(comp_adjustments)
            for ca in comp_adjustments:
                ca.weight = equal_weight

        # Method 1: Weighted adjusted price average
        weighted_adjusted_avg = sum(ca.adjusted_price * ca.weight for ca in comp_adjustments)

        # Method 2: Weighted price-per-sqft
        weighted_ppsf = sum(ca.price_per_sqft * ca.weight for ca in comp_adjustments)
        sqft_value = weighted_ppsf * subject_sqft

        # Hybrid blend
        f = self.factors
        market_value = (
            weighted_adjusted_avg * f.adjusted_price_weight
            + sqft_value * f.price_per_sqft_weight
            + ((weighted_adjusted_avg + sqft_value) / 2) * f.hybrid_blend_weight
        )

        # Calculate range
        adjusted_prices = [ca.adjusted_price for ca in comp_adjustments]
        range_low = min(adjusted_prices) if adjusted_prices else 0
        range_high = max(adjusted_prices) if adjusted_prices else 0

        # Calculate ARV (market value + rehab premium)
        rehab_cost = subject.get("rehabCost", subject.get("rehab_cost", 0))
        if rehab_cost > 0:
            arv = market_value + (rehab_cost * (1 + rehab_premium_pct))
        else:
            # Default ARV calculation: 15% premium over market value
            arv = market_value * (1 + rehab_premium_pct)

        # Calculate confidence score
        avg_similarity = sum(ca.similarity_score for ca in comp_adjustments) / len(comp_adjustments)
        comp_count_score = min(len(comp_adjustments) * 15, 40)  # Max 40 points
        similarity_score = (avg_similarity / 100) * 40  # Max 40 points
        base_score = 20  # Base 20 points
        confidence = min(100, round(comp_count_score + similarity_score + base_score))

        # Convert comp adjustments to dicts for JSON serialization
        comp_adjustments_dicts = [
            {
                "comp_id": ca.comp_id,
                "comp_address": ca.comp_address,
                "base_price": round(ca.base_price),
                "size_adjustment": round(ca.size_adjustment),
                "bedroom_adjustment": round(ca.bedroom_adjustment),
                "bathroom_adjustment": round(ca.bathroom_adjustment),
                "age_adjustment": round(ca.age_adjustment),
                "lot_adjustment": round(ca.lot_adjustment),
                "total_adjustment": round(ca.total_adjustment),
                "adjusted_price": round(ca.adjusted_price),
                "price_per_sqft": round(ca.price_per_sqft, 2),
                "similarity_score": round(ca.similarity_score, 1),
                "weight": round(ca.weight, 4),
            }
            for ca in comp_adjustments
        ]

        return AppraisalResult(
            market_value=round(market_value),
            arv=round(arv),
            confidence=confidence,
            range_low=round(range_low),
            range_high=round(range_high),
            adjusted_price_value=round(weighted_adjusted_avg),
            price_per_sqft_value=round(sqft_value),
            weighted_average_ppsf=round(weighted_ppsf, 2),
            comp_adjustments=comp_adjustments_dicts,
            comp_count=len(comp_adjustments),
            avg_similarity=round(avg_similarity, 1),
        )

    def calculate_rent_value(
        self, subject: dict[str, Any], selected_comps: list[dict[str, Any]], improvement_premium_pct: float = 0.10
    ) -> dict[str, Any]:
        """
        Calculate rental value using weighted hybrid methodology.

        Args:
            subject: Subject property details
            selected_comps: List of selected comparable rentals
            improvement_premium_pct: Premium to add for improved rent calculation

        Returns:
            Dict with market rent, improved rent, and breakdown
        """
        if not selected_comps:
            return {
                "market_rent": 0,
                "improved_rent": 0,
                "confidence": 0,
                "range_low": 0,
                "range_high": 0,
                "rent_per_sqft": 0,
                "comp_adjustments": [],
                "comp_count": 0,
                "avg_similarity": 0,
            }

        subject_sqft = subject.get("sqft", subject.get("squareFootage", 1500))
        comp_adjustments = []

        # Rental adjustment factors (different from sales)
        sqft_rent_adj_per_sqft = 0.50  # $ per sqft difference per month
        bedroom_rent_adj = 150.0  # $ per bedroom difference per month
        bathroom_rent_adj = 75.0  # $ per bathroom difference per month

        for comp in selected_comps:
            # Get comp rent
            comp_rent = comp.get("price", comp.get("rent", comp.get("monthlyRent", 0)))
            comp_sqft = comp.get("sqft", comp.get("squareFootage", comp.get("livingArea", 1500)))

            # Calculate similarity
            similarity = self.calculate_similarity_score(subject, comp)

            # Calculate rent adjustments
            subject_beds = subject.get("beds", subject.get("bedrooms", 3))
            subject_baths = subject.get("baths", subject.get("bathrooms", 2))
            comp_beds = comp.get("beds", comp.get("bedrooms", 3))
            comp_baths = comp.get("baths", comp.get("bathrooms", 2))

            size_adj = (subject_sqft - comp_sqft) * sqft_rent_adj_per_sqft
            bed_adj = (subject_beds - comp_beds) * bedroom_rent_adj
            bath_adj = (subject_baths - comp_baths) * bathroom_rent_adj
            total_adj = size_adj + bed_adj + bath_adj

            # Rent per sqft
            rent_per_sqft = comp_rent / comp_sqft if comp_sqft > 0 else 0

            comp_adjustments.append(
                {
                    "comp_id": str(comp.get("zpid", comp.get("id", ""))),
                    "comp_address": comp.get("address", comp.get("streetAddress", "Unknown")),
                    "base_rent": comp_rent,
                    "size_adjustment": round(size_adj),
                    "bedroom_adjustment": round(bed_adj),
                    "bathroom_adjustment": round(bath_adj),
                    "total_adjustment": round(total_adj),
                    "adjusted_rent": round(comp_rent + total_adj),
                    "rent_per_sqft": round(rent_per_sqft, 2),
                    "similarity_score": round(similarity["overall"], 1),
                    "weight": 0,
                }
            )

        # Calculate weights
        total_similarity = sum(ca["similarity_score"] for ca in comp_adjustments)
        if total_similarity > 0:
            for ca in comp_adjustments:
                ca["weight"] = round(ca["similarity_score"] / total_similarity, 4)
        else:
            equal_weight = round(1.0 / len(comp_adjustments), 4)
            for ca in comp_adjustments:
                ca["weight"] = equal_weight

        # Calculate weighted averages
        weighted_adjusted_rent = sum(ca["adjusted_rent"] * ca["weight"] for ca in comp_adjustments)
        weighted_rent_per_sqft = sum(ca["rent_per_sqft"] * ca["weight"] for ca in comp_adjustments)
        sqft_rent = weighted_rent_per_sqft * subject_sqft

        # Hybrid blend
        market_rent = (weighted_adjusted_rent * 0.5) + (sqft_rent * 0.5)

        # Calculate range
        adjusted_rents = [ca["adjusted_rent"] for ca in comp_adjustments]
        range_low = min(adjusted_rents) if adjusted_rents else 0
        range_high = max(adjusted_rents) if adjusted_rents else 0

        # Improved rent
        improved_rent = market_rent * (1 + improvement_premium_pct)

        # Confidence
        avg_similarity = sum(ca["similarity_score"] for ca in comp_adjustments) / len(comp_adjustments)
        comp_count_score = min(len(comp_adjustments) * 15, 40)
        similarity_score = (avg_similarity / 100) * 40
        confidence = min(100, round(comp_count_score + similarity_score + 20))

        return {
            "market_rent": round(market_rent),
            "improved_rent": round(improved_rent),
            "confidence": confidence,
            "range_low": round(range_low),
            "range_high": round(range_high),
            "rent_per_sqft": round(weighted_rent_per_sqft, 2),
            "comp_adjustments": comp_adjustments,
            "comp_count": len(comp_adjustments),
            "avg_similarity": round(avg_similarity, 1),
        }


# Singleton instance
comps_calculator = CompsCalculator()


def get_comps_calculator() -> CompsCalculator:
    """Get the singleton CompsCalculator instance."""
    return comps_calculator
