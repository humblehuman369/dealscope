"""
Regional Cost Service

Provides labor/material cost multipliers by ZIP code for the Rehab Estimator.
Uses a tiered lookup: ZIP → 3-digit prefix → state → national baseline.
Each level carries a confidence score reflecting data granularity.

Separate from assumptions_service.py (financial defaults) by design:
construction cost factors are not the same as insurance/vacancy/appreciation.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

LAST_UPDATED = "2026-01-15"


@dataclass(frozen=True)
class CostFactors:
    labor: float
    material: float
    permit: float
    market_label: str
    confidence: str  # "high" | "medium" | "low"
    confidence_score: float  # 0-1


# ============================================
# ZIP-LEVEL DATA (highest confidence)
# South Florida granular ZIPs already validated
# ============================================

_ZIP_FACTORS: dict[str, CostFactors] = {
    # Palm Beach County
    "33480": CostFactors(1.45, 1.30, 1.35, "Palm Beach Island", "high", 0.92),
    "33483": CostFactors(1.40, 1.28, 1.30, "Delray Beach (Beach)", "high", 0.90),
    "33444": CostFactors(1.35, 1.25, 1.25, "Delray Beach", "high", 0.90),
    "33432": CostFactors(1.40, 1.28, 1.30, "Boca Raton (Beach)", "high", 0.90),
    "33431": CostFactors(1.35, 1.25, 1.25, "Boca Raton", "high", 0.90),
    "33401": CostFactors(1.35, 1.22, 1.25, "West Palm Beach (Downtown)", "high", 0.90),
    "33458": CostFactors(1.35, 1.25, 1.25, "Jupiter", "high", 0.88),
    "33414": CostFactors(1.30, 1.20, 1.20, "Wellington", "high", 0.88),
    # Broward County
    "33301": CostFactors(1.35, 1.22, 1.25, "Fort Lauderdale (Downtown)", "high", 0.90),
    "33304": CostFactors(1.40, 1.28, 1.30, "Fort Lauderdale (Beach)", "high", 0.90),
    "33316": CostFactors(1.35, 1.25, 1.25, "Fort Lauderdale (Las Olas)", "high", 0.88),
    "33326": CostFactors(1.30, 1.20, 1.20, "Weston", "high", 0.88),
    # Miami-Dade County
    "33139": CostFactors(1.50, 1.35, 1.40, "Miami Beach (South Beach)", "high", 0.92),
    "33131": CostFactors(1.45, 1.32, 1.35, "Miami (Brickell)", "high", 0.90),
    "33134": CostFactors(1.40, 1.28, 1.30, "Coral Gables", "high", 0.90),
    "33129": CostFactors(1.40, 1.28, 1.30, "Miami (Coconut Grove)", "high", 0.90),
    "33156": CostFactors(1.35, 1.25, 1.25, "Pinecrest", "high", 0.88),
    "33176": CostFactors(1.25, 1.18, 1.15, "Kendall", "high", 0.85),
    # NYC Metro
    "10001": CostFactors(1.55, 1.45, 1.50, "Manhattan (Midtown)", "high", 0.90),
    "10013": CostFactors(1.55, 1.45, 1.50, "Manhattan (Tribeca)", "high", 0.90),
    "11201": CostFactors(1.45, 1.38, 1.40, "Brooklyn (Downtown)", "high", 0.88),
    # SF Bay Area
    "94102": CostFactors(1.60, 1.50, 1.55, "San Francisco (Downtown)", "high", 0.90),
    "94110": CostFactors(1.55, 1.45, 1.50, "San Francisco (Mission)", "high", 0.88),
    "94301": CostFactors(1.55, 1.48, 1.50, "Palo Alto", "high", 0.88),
    # LA
    "90210": CostFactors(1.50, 1.40, 1.45, "Beverly Hills", "high", 0.90),
    "90291": CostFactors(1.45, 1.38, 1.40, "Venice", "high", 0.88),
}


# ============================================
# 3-DIGIT PREFIX DATA (medium confidence)
# National coverage by metro/region
# ============================================

_PREFIX_FACTORS: dict[str, CostFactors] = {
    # Northeast
    "100": CostFactors(1.50, 1.40, 1.45, "New York City Metro", "medium", 0.75),
    "101": CostFactors(1.48, 1.38, 1.42, "New York City Metro", "medium", 0.75),
    "102": CostFactors(1.48, 1.38, 1.42, "New York City Metro", "medium", 0.75),
    "103": CostFactors(1.45, 1.35, 1.38, "Staten Island", "medium", 0.72),
    "104": CostFactors(1.48, 1.38, 1.42, "Bronx", "medium", 0.72),
    "110": CostFactors(1.42, 1.32, 1.35, "Long Island (Queens)", "medium", 0.72),
    "111": CostFactors(1.42, 1.32, 1.35, "Long Island", "medium", 0.72),
    "112": CostFactors(1.42, 1.32, 1.35, "Brooklyn", "medium", 0.72),
    "117": CostFactors(1.40, 1.30, 1.32, "Long Island", "medium", 0.70),
    "070": CostFactors(1.38, 1.28, 1.30, "Northern New Jersey", "medium", 0.72),
    "071": CostFactors(1.35, 1.25, 1.28, "Newark Metro", "medium", 0.70),
    "080": CostFactors(1.30, 1.22, 1.25, "Central New Jersey", "medium", 0.70),
    "021": CostFactors(1.40, 1.32, 1.35, "Boston", "medium", 0.75),
    "022": CostFactors(1.38, 1.30, 1.32, "Boston Metro", "medium", 0.72),
    "060": CostFactors(1.38, 1.28, 1.32, "Hartford / Connecticut", "medium", 0.70),
    "061": CostFactors(1.40, 1.30, 1.35, "Fairfield County, CT", "medium", 0.70),
    "150": CostFactors(1.22, 1.15, 1.18, "Pittsburgh", "medium", 0.70),
    "191": CostFactors(1.32, 1.25, 1.28, "Philadelphia", "medium", 0.72),
    # Mid-Atlantic / DC
    "200": CostFactors(1.30, 1.22, 1.25, "Washington DC", "medium", 0.75),
    "201": CostFactors(1.30, 1.22, 1.25, "Washington DC", "medium", 0.75),
    "220": CostFactors(1.28, 1.20, 1.22, "Northern Virginia", "medium", 0.72),
    "221": CostFactors(1.28, 1.20, 1.22, "Northern Virginia", "medium", 0.72),
    "208": CostFactors(1.25, 1.18, 1.20, "Maryland (Suburbs)", "medium", 0.70),
    "210": CostFactors(1.22, 1.15, 1.18, "Baltimore", "medium", 0.70),
    # Southeast
    "300": CostFactors(1.05, 1.00, 1.02, "Atlanta (North)", "medium", 0.72),
    "303": CostFactors(1.05, 1.00, 1.02, "Atlanta", "medium", 0.72),
    "304": CostFactors(1.02, 0.98, 1.00, "Atlanta (Suburbs)", "medium", 0.70),
    "270": CostFactors(1.05, 1.00, 1.02, "Charlotte / Raleigh", "medium", 0.70),
    "279": CostFactors(1.05, 1.00, 1.02, "Raleigh-Durham", "medium", 0.70),
    "290": CostFactors(1.00, 0.95, 0.98, "Charleston, SC", "medium", 0.68),
    "370": CostFactors(1.00, 0.95, 0.98, "Nashville", "medium", 0.70),
    "322": CostFactors(1.12, 1.05, 1.08, "Jacksonville, FL", "medium", 0.70),
    "327": CostFactors(1.15, 1.08, 1.12, "Orlando", "medium", 0.72),
    "336": CostFactors(1.18, 1.10, 1.15, "Tampa / St. Pete", "medium", 0.72),
    "337": CostFactors(1.15, 1.08, 1.12, "St. Petersburg", "medium", 0.70),
    "339": CostFactors(1.18, 1.10, 1.15, "Fort Myers / Naples", "medium", 0.70),
    # South Florida (catch-all for ZIPs not in _ZIP_FACTORS)
    "330": CostFactors(1.30, 1.20, 1.22, "South Florida", "medium", 0.78),
    "331": CostFactors(1.32, 1.22, 1.25, "Miami-Dade", "medium", 0.78),
    "332": CostFactors(1.28, 1.18, 1.20, "South Florida", "medium", 0.75),
    "333": CostFactors(1.30, 1.20, 1.22, "Fort Lauderdale Metro", "medium", 0.78),
    "334": CostFactors(1.30, 1.20, 1.22, "Palm Beach County", "medium", 0.78),
    # Midwest
    "606": CostFactors(1.20, 1.12, 1.15, "Chicago", "medium", 0.72),
    "600": CostFactors(1.18, 1.10, 1.12, "Chicago Suburbs (North)", "medium", 0.70),
    "601": CostFactors(1.15, 1.08, 1.10, "Chicago Suburbs (West)", "medium", 0.68),
    "481": CostFactors(1.12, 1.05, 1.08, "Detroit Metro", "medium", 0.70),
    "482": CostFactors(1.10, 1.02, 1.05, "Detroit", "medium", 0.68),
    "432": CostFactors(1.08, 1.02, 1.05, "Columbus, OH", "medium", 0.68),
    "441": CostFactors(1.05, 1.00, 1.02, "Cleveland", "medium", 0.68),
    "551": CostFactors(1.12, 1.05, 1.08, "Minneapolis", "medium", 0.70),
    "630": CostFactors(1.10, 1.02, 1.05, "St. Louis", "medium", 0.68),
    "640": CostFactors(1.08, 1.02, 1.05, "Kansas City", "medium", 0.68),
    "462": CostFactors(1.05, 1.00, 1.02, "Indianapolis", "medium", 0.68),
    # Texas
    "750": CostFactors(1.08, 1.02, 1.05, "Dallas / North Texas", "medium", 0.72),
    "751": CostFactors(1.08, 1.02, 1.05, "Dallas", "medium", 0.72),
    "752": CostFactors(1.05, 1.00, 1.02, "Dallas (Suburbs)", "medium", 0.70),
    "760": CostFactors(1.05, 1.00, 1.02, "Fort Worth", "medium", 0.70),
    "770": CostFactors(1.10, 1.05, 1.08, "Houston", "medium", 0.72),
    "771": CostFactors(1.10, 1.05, 1.08, "Houston", "medium", 0.72),
    "772": CostFactors(1.08, 1.02, 1.05, "Houston (Suburbs)", "medium", 0.70),
    "773": CostFactors(1.08, 1.02, 1.05, "Houston (West)", "medium", 0.70),
    "787": CostFactors(1.12, 1.05, 1.08, "Austin", "medium", 0.72),
    "781": CostFactors(1.05, 1.00, 1.02, "San Antonio", "medium", 0.70),
    # Mountain West
    "800": CostFactors(1.15, 1.08, 1.10, "Denver", "medium", 0.72),
    "801": CostFactors(1.15, 1.08, 1.10, "Denver Metro", "medium", 0.72),
    "802": CostFactors(1.12, 1.05, 1.08, "Denver (Suburbs)", "medium", 0.70),
    "850": CostFactors(1.05, 1.00, 1.02, "Phoenix", "medium", 0.72),
    "852": CostFactors(1.08, 1.02, 1.05, "Scottsdale / Mesa", "medium", 0.70),
    "857": CostFactors(1.05, 1.00, 1.02, "Tucson", "medium", 0.68),
    "841": CostFactors(1.08, 1.02, 1.05, "Salt Lake City", "medium", 0.70),
    "891": CostFactors(1.12, 1.05, 1.08, "Las Vegas", "medium", 0.72),
    # Pacific West
    "900": CostFactors(1.42, 1.35, 1.38, "Los Angeles", "medium", 0.75),
    "901": CostFactors(1.42, 1.35, 1.38, "Los Angeles", "medium", 0.75),
    "902": CostFactors(1.45, 1.38, 1.42, "Beverly Hills / Westside", "medium", 0.75),
    "906": CostFactors(1.38, 1.30, 1.32, "LA (Inland)", "medium", 0.72),
    "910": CostFactors(1.38, 1.30, 1.32, "Pasadena / Glendale", "medium", 0.72),
    "920": CostFactors(1.35, 1.28, 1.30, "San Diego", "medium", 0.72),
    "921": CostFactors(1.35, 1.28, 1.30, "San Diego", "medium", 0.72),
    "925": CostFactors(1.18, 1.10, 1.12, "Riverside / Inland Empire", "medium", 0.70),
    "926": CostFactors(1.38, 1.30, 1.32, "Orange County", "medium", 0.72),
    "930": CostFactors(1.30, 1.22, 1.25, "Santa Barbara", "medium", 0.70),
    "941": CostFactors(1.55, 1.48, 1.52, "San Francisco", "medium", 0.78),
    "943": CostFactors(1.50, 1.42, 1.45, "Palo Alto / Peninsula", "medium", 0.75),
    "945": CostFactors(1.45, 1.38, 1.42, "Oakland / East Bay", "medium", 0.75),
    "950": CostFactors(1.48, 1.40, 1.45, "San Jose", "medium", 0.75),
    "958": CostFactors(1.30, 1.22, 1.25, "Sacramento", "medium", 0.70),
    "980": CostFactors(1.32, 1.25, 1.28, "Seattle", "medium", 0.72),
    "981": CostFactors(1.32, 1.25, 1.28, "Seattle", "medium", 0.72),
    "970": CostFactors(1.22, 1.15, 1.18, "Portland", "medium", 0.72),
    "972": CostFactors(1.22, 1.15, 1.18, "Portland Metro", "medium", 0.70),
    "961": CostFactors(1.15, 1.08, 1.10, "Honolulu", "medium", 0.65),
}


# ============================================
# STATE-LEVEL FALLBACK DATA (low confidence)
# ============================================

_STATE_FACTORS: dict[str, CostFactors] = {
    "NY": CostFactors(1.35, 1.25, 1.30, "New York State", "low", 0.50),
    "NJ": CostFactors(1.32, 1.22, 1.28, "New Jersey", "low", 0.50),
    "CT": CostFactors(1.30, 1.22, 1.25, "Connecticut", "low", 0.48),
    "MA": CostFactors(1.35, 1.28, 1.30, "Massachusetts", "low", 0.50),
    "PA": CostFactors(1.18, 1.10, 1.12, "Pennsylvania", "low", 0.48),
    "MD": CostFactors(1.20, 1.12, 1.15, "Maryland", "low", 0.48),
    "VA": CostFactors(1.12, 1.05, 1.08, "Virginia", "low", 0.48),
    "DC": CostFactors(1.30, 1.22, 1.25, "Washington DC", "low", 0.50),
    "FL": CostFactors(1.18, 1.10, 1.12, "Florida", "low", 0.55),
    "GA": CostFactors(1.02, 0.98, 1.00, "Georgia", "low", 0.48),
    "NC": CostFactors(1.00, 0.95, 0.98, "North Carolina", "low", 0.48),
    "SC": CostFactors(0.98, 0.92, 0.95, "South Carolina", "low", 0.45),
    "TN": CostFactors(0.98, 0.92, 0.95, "Tennessee", "low", 0.48),
    "AL": CostFactors(0.92, 0.88, 0.90, "Alabama", "low", 0.45),
    "MS": CostFactors(0.90, 0.85, 0.88, "Mississippi", "low", 0.42),
    "LA": CostFactors(0.95, 0.90, 0.92, "Louisiana", "low", 0.45),
    "TX": CostFactors(1.05, 1.00, 1.02, "Texas", "low", 0.55),
    "OH": CostFactors(1.02, 0.98, 1.00, "Ohio", "low", 0.48),
    "MI": CostFactors(1.05, 1.00, 1.02, "Michigan", "low", 0.48),
    "IL": CostFactors(1.12, 1.05, 1.08, "Illinois", "low", 0.50),
    "IN": CostFactors(0.98, 0.92, 0.95, "Indiana", "low", 0.45),
    "WI": CostFactors(1.05, 1.00, 1.02, "Wisconsin", "low", 0.45),
    "MN": CostFactors(1.10, 1.05, 1.08, "Minnesota", "low", 0.48),
    "MO": CostFactors(1.02, 0.98, 1.00, "Missouri", "low", 0.45),
    "KS": CostFactors(0.95, 0.90, 0.92, "Kansas", "low", 0.42),
    "CO": CostFactors(1.12, 1.05, 1.08, "Colorado", "low", 0.50),
    "AZ": CostFactors(1.05, 1.00, 1.02, "Arizona", "low", 0.50),
    "NV": CostFactors(1.10, 1.05, 1.08, "Nevada", "low", 0.48),
    "UT": CostFactors(1.05, 1.00, 1.02, "Utah", "low", 0.48),
    "OR": CostFactors(1.18, 1.12, 1.15, "Oregon", "low", 0.50),
    "WA": CostFactors(1.28, 1.22, 1.25, "Washington", "low", 0.50),
    "CA": CostFactors(1.40, 1.32, 1.35, "California", "low", 0.55),
    "HI": CostFactors(1.45, 1.40, 1.42, "Hawaii", "low", 0.45),
}

_NATIONAL_BASELINE = CostFactors(1.00, 1.00, 1.00, "National Average", "low", 0.35)


# ============================================
# ZIP → STATE MAPPING (simplified ranges)
# ============================================


def _state_from_prefix(prefix: int) -> str | None:
    ranges = [
        (10, 14, "NY"),
        (70, 89, "NJ"),
        (60, 69, "CT"),
        (10, 27, "MA"),
        (15, 19, "PA"),
        (206, 219, "MD"),
        (220, 246, "VA"),
        (200, 205, "DC"),
        (320, 349, "FL"),
        (300, 319, "GA"),
        (270, 289, "NC"),
        (290, 299, "SC"),
        (370, 385, "TN"),
        (350, 369, "AL"),
        (386, 397, "MS"),
        (700, 714, "LA"),
        (750, 799, "TX"),
        (430, 458, "OH"),
        (480, 499, "MI"),
        (600, 629, "IL"),
        (460, 479, "IN"),
        (530, 549, "WI"),
        (550, 567, "MN"),
        (630, 658, "MO"),
        (660, 679, "KS"),
        (800, 816, "CO"),
        (850, 865, "AZ"),
        (889, 898, "NV"),
        (840, 847, "UT"),
        (970, 979, "OR"),
        (980, 994, "WA"),
        (900, 961, "CA"),
        (967, 968, "HI"),
    ]
    for lo, hi, state in ranges:
        if lo <= prefix <= hi:
            return state
    return None


# ============================================
# PUBLIC API
# ============================================


def get_regional_cost_context(zip_code: str) -> dict:
    """
    Resolve cost factors for a ZIP code using tiered lookup.
    Returns a dict matching the frontend RegionalCostContext type.
    """
    if not zip_code or len(zip_code) < 3:
        factors = _NATIONAL_BASELINE
        return _to_response(factors, zip_code or "")

    clean_zip = zip_code.strip()[:5]

    # Tier 1: exact ZIP
    if clean_zip in _ZIP_FACTORS:
        return _to_response(_ZIP_FACTORS[clean_zip], clean_zip)

    # Tier 2: 3-digit prefix
    prefix = clean_zip[:3]
    if prefix in _PREFIX_FACTORS:
        return _to_response(_PREFIX_FACTORS[prefix], clean_zip)

    # Tier 3: state from ZIP range
    try:
        prefix_int = int(prefix)
        state = _state_from_prefix(prefix_int)
        if state and state in _STATE_FACTORS:
            return _to_response(_STATE_FACTORS[state], clean_zip)
    except ValueError:
        pass

    # Tier 4: national baseline
    return _to_response(_NATIONAL_BASELINE, clean_zip)


def _to_response(factors: CostFactors, zip_code: str) -> dict:
    combined = round((factors.labor * 0.55 + factors.material * 0.35 + factors.permit * 0.10), 3)

    data_sources = ["RSMeans Regional Index", "BLS OES Labor Data"]
    if factors.confidence == "high":
        data_sources.append("Local Contractor Surveys")

    return {
        "region_id": zip_code[:3] if len(zip_code) >= 3 else "000",
        "market_label": factors.market_label,
        "labor_factor": factors.labor,
        "material_factor": factors.material,
        "permit_factor": factors.permit,
        "combined_factor": combined,
        "confidence": factors.confidence,
        "confidence_score": factors.confidence_score,
        "data_sources": data_sources,
        "last_updated": LAST_UPDATED,
    }
