"""
RehabIntelligence - Intelligent Rehab Cost Estimation Engine

A sophisticated rehab estimation system that accounts for:
- Asset class detection (prevents the "Luxury Trap")
- Location-based labor cost adjustments (Florida markets)
- Age-based CapEx warnings with permit awareness
- Property condition assessment
- Holding cost calculations ("the silent killer")

Designed for real estate investors analyzing fix-and-flip and BRRRR opportunities.

Updated for 2025 South Florida construction costs.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class AssetClass(str, Enum):
    """Property asset class based on ARV and price per sqft."""
    STANDARD = "standard"           # Builder grade, Home Depot materials
    LUXURY = "luxury"               # High-end retail (Pottery Barn, West Elm)
    ULTRA_LUXURY = "ultra_luxury"   # Custom, imported, designer materials


class PropertyCondition(str, Enum):
    """Current property condition assessment."""
    DISTRESSED = "distressed"   # Major issues, likely full gut
    FAIR = "fair"               # Functional but dated, needs work
    GOOD = "good"               # Minor updates needed
    EXCELLENT = "excellent"     # Move-in ready, cosmetic only


class RehabIntensity(str, Enum):
    """Scope of rehab work."""
    COSMETIC = "cosmetic"       # Paint, flooring, fixtures
    LIGHT = "light"             # Cosmetic + kitchen/bath updates
    MEDIUM = "medium"           # Full kitchen/bath remodel + systems check
    FULL = "full"               # Full gut renovation
    LUXURY_UPGRADE = "luxury_upgrade"  # High-end finishes on full rehab


# ============================================
# LOCATION FACTORS - Florida Markets (2025)
# ============================================
# Labor and material cost multipliers by zip code
# Base factor of 1.0 = State average

LOCATION_FACTORS: Dict[str, Dict[str, float]] = {
    # Palm Beach County - Premium Markets
    "33480": {"factor": 1.45, "market": "Palm Beach Island"},
    "33483": {"factor": 1.40, "market": "Delray Beach (Beach)"},
    "33444": {"factor": 1.35, "market": "Delray Beach"},
    "33445": {"factor": 1.30, "market": "Delray Beach (West)"},
    "33446": {"factor": 1.30, "market": "Delray Beach (West)"},
    "33484": {"factor": 1.35, "market": "Delray Beach (Linton)"},
    "33432": {"factor": 1.40, "market": "Boca Raton (Beach)"},
    "33431": {"factor": 1.35, "market": "Boca Raton"},
    "33433": {"factor": 1.30, "market": "Boca Raton (West)"},
    "33434": {"factor": 1.30, "market": "Boca Raton (West)"},
    "33487": {"factor": 1.35, "market": "Boca Raton (Highland Beach)"},
    "33486": {"factor": 1.35, "market": "Boca Raton"},
    "33496": {"factor": 1.35, "market": "Boca Raton (West)"},
    "33498": {"factor": 1.30, "market": "Boca Raton (West)"},
    "33460": {"factor": 1.30, "market": "Lake Worth Beach"},
    "33461": {"factor": 1.25, "market": "Lake Worth"},
    "33462": {"factor": 1.25, "market": "Lake Worth"},
    "33463": {"factor": 1.25, "market": "Lake Worth (West)"},
    "33401": {"factor": 1.35, "market": "West Palm Beach (Downtown)"},
    "33405": {"factor": 1.35, "market": "West Palm Beach (South)"},
    "33407": {"factor": 1.25, "market": "West Palm Beach (North)"},
    "33409": {"factor": 1.25, "market": "West Palm Beach"},
    "33411": {"factor": 1.20, "market": "West Palm Beach (Royal Palm)"},
    "33412": {"factor": 1.20, "market": "West Palm Beach (Loxahatchee)"},
    "33413": {"factor": 1.20, "market": "West Palm Beach (West)"},
    "33414": {"factor": 1.30, "market": "Wellington"},
    "33415": {"factor": 1.20, "market": "West Palm Beach (West)"},
    "33417": {"factor": 1.25, "market": "West Palm Beach"},
    "33418": {"factor": 1.35, "market": "Palm Beach Gardens (North)"},
    "33410": {"factor": 1.35, "market": "Palm Beach Gardens"},
    "33408": {"factor": 1.30, "market": "North Palm Beach"},
    "33403": {"factor": 1.30, "market": "Palm Beach Gardens"},
    "33404": {"factor": 1.25, "market": "West Palm Beach (Riviera Beach)"},
    "33458": {"factor": 1.35, "market": "Jupiter"},
    "33469": {"factor": 1.40, "market": "Jupiter (Beach)"},
    "33477": {"factor": 1.40, "market": "Jupiter (Inlet)"},
    "33478": {"factor": 1.25, "market": "Jupiter (West)"},
    
    # Broward County
    "33301": {"factor": 1.35, "market": "Fort Lauderdale (Downtown)"},
    "33304": {"factor": 1.40, "market": "Fort Lauderdale (Beach)"},
    "33305": {"factor": 1.35, "market": "Fort Lauderdale (Victoria Park)"},
    "33306": {"factor": 1.35, "market": "Fort Lauderdale (Coral Ridge)"},
    "33308": {"factor": 1.40, "market": "Fort Lauderdale (Lauderdale-by-the-Sea)"},
    "33062": {"factor": 1.40, "market": "Pompano Beach (Beach)"},
    "33060": {"factor": 1.25, "market": "Pompano Beach"},
    "33064": {"factor": 1.25, "market": "Pompano Beach (West)"},
    "33309": {"factor": 1.25, "market": "Fort Lauderdale (West)"},
    "33311": {"factor": 1.15, "market": "Fort Lauderdale (Northwest)"},
    "33313": {"factor": 1.20, "market": "Fort Lauderdale (Lauderhill)"},
    "33314": {"factor": 1.20, "market": "Fort Lauderdale (Davie)"},
    "33316": {"factor": 1.35, "market": "Fort Lauderdale (Las Olas)"},
    "33317": {"factor": 1.25, "market": "Plantation"},
    "33322": {"factor": 1.20, "market": "Plantation (West)"},
    "33324": {"factor": 1.25, "market": "Plantation"},
    "33325": {"factor": 1.25, "market": "Weston"},
    "33326": {"factor": 1.30, "market": "Weston"},
    "33327": {"factor": 1.30, "market": "Weston"},
    "33328": {"factor": 1.25, "market": "Davie"},
    "33330": {"factor": 1.30, "market": "Cooper City"},
    "33331": {"factor": 1.30, "market": "Weston"},
    "33332": {"factor": 1.30, "market": "Southwest Ranches"},
    "33334": {"factor": 1.30, "market": "Oakland Park"},
    "33351": {"factor": 1.20, "market": "Sunrise"},
    
    # Miami-Dade County
    "33139": {"factor": 1.50, "market": "Miami Beach (South Beach)"},
    "33140": {"factor": 1.45, "market": "Miami Beach (Mid-Beach)"},
    "33141": {"factor": 1.40, "market": "Miami Beach (North Beach)"},
    "33154": {"factor": 1.45, "market": "Bay Harbor Islands"},
    "33160": {"factor": 1.40, "market": "Sunny Isles Beach"},
    "33180": {"factor": 1.35, "market": "Aventura"},
    "33131": {"factor": 1.45, "market": "Miami (Brickell)"},
    "33129": {"factor": 1.40, "market": "Miami (Coconut Grove)"},
    "33133": {"factor": 1.40, "market": "Miami (Coconut Grove)"},
    "33134": {"factor": 1.40, "market": "Coral Gables"},
    "33143": {"factor": 1.35, "market": "Coral Gables (South)"},
    "33146": {"factor": 1.40, "market": "Coral Gables"},
    "33156": {"factor": 1.35, "market": "Pinecrest"},
    "33157": {"factor": 1.30, "market": "Palmetto Bay"},
    "33158": {"factor": 1.35, "market": "Palmetto Bay"},
    "33176": {"factor": 1.25, "market": "Kendall"},
    "33183": {"factor": 1.20, "market": "Kendall (West)"},
    "33186": {"factor": 1.20, "market": "Kendall (South)"},
    
    # Default for unlisted Florida zips
    "default": {"factor": 1.15, "market": "Florida Average"},
}


# ============================================
# 2025 CONSTRUCTION COSTS - SOUTH FLORIDA
# ============================================
# Base costs at "Standard" grade, multiplied by asset class

@dataclass
class BaseCosts:
    """2025 South Florida construction costs - Standard grade baseline."""
    
    # WET ROOMS - Kitchen
    kitchen_full_remodel: float = 28000      # Full gut and replace
    kitchen_cosmetic: float = 12000          # Reface, counters, appliances
    cabinets: float = 8000                   # Cabinet replacement only
    countertops: float = 4500                # Countertop replacement only
    appliances_package: float = 5500         # All appliances
    backsplash: float = 1500                 # Tile backsplash
    kitchen_sink_faucet: float = 1200        # Sink and faucet
    
    # WET ROOMS - Bathrooms
    full_bath_remodel: float = 14000         # Full gut and replace
    full_bath_cosmetic: float = 6000         # Vanity, fixtures, tile refresh
    half_bath_remodel: float = 7000          # Full half bath
    half_bath_cosmetic: float = 3000         # Refresh half bath
    vanity_sink: float = 1200                # Vanity replacement
    toilet: float = 450                      # Toilet replacement
    tub_shower: float = 3500                 # Tub/shower replacement
    shower_glass: float = 2000               # Frameless glass enclosure
    
    # DRY ROOMS - Flooring (per sqft)
    flooring_lvp: float = 7.50               # Luxury vinyl plank installed
    flooring_tile: float = 12.00             # Porcelain tile installed
    flooring_hardwood: float = 14.00         # Engineered hardwood
    flooring_carpet: float = 5.00            # Carpet installed
    
    # DRY ROOMS - Walls (per sqft)
    interior_paint: float = 3.50             # Paint per sqft of wall
    drywall_repair: float = 650              # Per room average
    texture_removal: float = 4.00            # Per sqft (popcorn, etc.)
    
    # EXTERIOR
    exterior_paint: float = 6500             # Full exterior paint
    roof_shingle_sqft: float = 6.00          # Asphalt shingle per sqft roof
    roof_tile_sqft: float = 14.00            # Tile roof per sqft
    roof_metal_sqft: float = 16.00           # Standing seam metal per sqft
    roof_flat_sqft: float = 10.00            # Flat/modified bitumen per sqft
    siding_sqft: float = 12.00               # Siding per sqft
    windows_each: float = 750                # Impact window each
    front_door: float = 2500                 # Entry door with hardware
    garage_door: float = 2800                # Single garage door
    landscaping: float = 4500                # Basic landscaping
    pool_resurface: float = 8500             # Pool resurfacing
    pool_equipment: float = 5500             # Pool pump, filter, heater
    fence_linear_ft: float = 45              # Privacy fence per linear ft
    driveway_sqft: float = 8.00              # Concrete driveway per sqft
    
    # MAJOR SYSTEMS - HVAC
    hvac_ton: float = 3800                   # Per ton installed (FL premium)
    hvac_ductwork: float = 2500              # Duct repair/modification
    water_heater_tank: float = 1800          # Standard tank
    water_heater_tankless: float = 3500      # Tankless unit
    
    # MAJOR SYSTEMS - Electrical
    electrical_panel: float = 3500           # 200A panel upgrade
    electrical_rewire_sqft: float = 6.50     # Full rewire per sqft
    gfci_outlets: float = 180                # GFCI outlet each
    ceiling_fan: float = 350                 # Ceiling fan installed
    recessed_lights: float = 225             # Per can light
    
    # MAJOR SYSTEMS - Plumbing
    plumbing_repipe_sqft: float = 8.00       # Full repipe per sqft
    water_line: float = 3500                 # Main water line replacement
    sewer_line: float = 6500                 # Main sewer line replacement
    water_softener: float = 2500             # Water softener system
    
    # STRUCTURAL
    foundation_repair: float = 8500          # Average foundation repair
    termite_treatment: float = 1800          # Whole house treatment
    mold_remediation_sqft: float = 25.00     # Per sqft affected
    
    # PERMITS & SOFT COSTS
    permit_minor: float = 800                # Minor permit
    permit_major: float = 3500               # Major renovation permit
    dumpster_load: float = 650               # Per dumpster load
    deep_cleaning: float = 750               # Post-construction cleaning
    staging: float = 3500                    # Home staging for sale


# ============================================
# ASSET CLASS MULTIPLIERS
# ============================================
# These multiply base costs based on property value tier

ASSET_CLASS_MULTIPLIERS: Dict[AssetClass, float] = {
    AssetClass.STANDARD: 1.0,       # Home Depot / Builder Grade
    AssetClass.LUXURY: 2.0,         # Pottery Barn / West Elm / Sub-Zero
    AssetClass.ULTRA_LUXURY: 3.5,   # Custom / Imported / Designer
}


# ============================================
# CONDITION INTENSITY FACTORS
# ============================================
# How property condition affects scope

CONDITION_INTENSITY: Dict[PropertyCondition, Dict[str, float]] = {
    PropertyCondition.DISTRESSED: {
        "wet_room_factor": 1.0,      # Full remodel
        "dry_room_factor": 1.0,      # Full refinish
        "systems_check": True,       # Always check major systems
        "permit_tier": "major",
    },
    PropertyCondition.FAIR: {
        "wet_room_factor": 0.8,      # Moderate updates
        "dry_room_factor": 0.9,      # Most areas need work
        "systems_check": True,
        "permit_tier": "major",
    },
    PropertyCondition.GOOD: {
        "wet_room_factor": 0.5,      # Cosmetic updates
        "dry_room_factor": 0.6,      # Select areas
        "systems_check": False,
        "permit_tier": "minor",
    },
    PropertyCondition.EXCELLENT: {
        "wet_room_factor": 0.2,      # Minor touch-ups
        "dry_room_factor": 0.3,      # Light refresh
        "systems_check": False,
        "permit_tier": "minor",
    },
}


# ============================================
# CAPEX AGE THRESHOLDS
# ============================================
# When to flag major system replacement

CAPEX_AGE_THRESHOLDS = {
    "roof_shingle": 18,      # Asphalt shingle lifespan
    "roof_tile": 35,         # Tile roof lifespan
    "roof_metal": 45,        # Metal roof lifespan
    "hvac": 15,              # HVAC system lifespan
    "water_heater": 12,      # Water heater lifespan
    "electrical_panel": 30,  # Panel lifespan (or if fuse box)
    "windows": 25,           # Window lifespan
    "plumbing_galvanized": 50,  # Galvanized pipe (replace if present)
    "plumbing_polybutylene": 1, # Polybutylene (always replace)
    "plumbing_copper": 60,   # Copper pipe lifespan
}


@dataclass
class RehabBreakdown:
    """Detailed rehab cost breakdown."""
    kitchen: float = 0
    bathrooms: float = 0
    flooring: float = 0
    paint_walls: float = 0
    exterior: float = 0
    roof: float = 0
    hvac: float = 0
    electrical: float = 0
    plumbing: float = 0
    windows_doors: float = 0
    other: float = 0
    permits: float = 0
    contingency: float = 0
    
    @property
    def construction_total(self) -> float:
        """Total construction costs before contingency."""
        return (
            self.kitchen + self.bathrooms + self.flooring +
            self.paint_walls + self.exterior + self.roof +
            self.hvac + self.electrical + self.plumbing +
            self.windows_doors + self.other + self.permits
        )
    
    @property
    def total(self) -> float:
        """Total including contingency."""
        return self.construction_total + self.contingency
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "kitchen": round(self.kitchen),
            "bathrooms": round(self.bathrooms),
            "flooring": round(self.flooring),
            "paint_walls": round(self.paint_walls),
            "exterior": round(self.exterior),
            "roof": round(self.roof),
            "hvac": round(self.hvac),
            "electrical": round(self.electrical),
            "plumbing": round(self.plumbing),
            "windows_doors": round(self.windows_doors),
            "other": round(self.other),
            "permits": round(self.permits),
            "contingency": round(self.contingency),
            "construction_total": round(self.construction_total),
            "total": round(self.total),
        }


@dataclass
class HoldingCosts:
    """Monthly holding cost breakdown."""
    duration_months: int = 0
    monthly_interest: float = 0
    monthly_taxes: float = 0
    monthly_insurance: float = 0
    monthly_utilities: float = 0
    monthly_hoa: float = 0
    
    @property
    def monthly_total(self) -> float:
        return (
            self.monthly_interest + self.monthly_taxes +
            self.monthly_insurance + self.monthly_utilities +
            self.monthly_hoa
        )
    
    @property
    def total_holding(self) -> float:
        return self.monthly_total * self.duration_months
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "duration_months": self.duration_months,
            "monthly_interest": round(self.monthly_interest),
            "monthly_taxes": round(self.monthly_taxes),
            "monthly_insurance": round(self.monthly_insurance),
            "monthly_utilities": round(self.monthly_utilities),
            "monthly_hoa": round(self.monthly_hoa),
            "monthly_total": round(self.monthly_total),
            "total_holding": round(self.total_holding),
        }


@dataclass
class CapExWarning:
    """Warning about potential CapEx item."""
    item: str
    age: int
    threshold: int
    estimated_cost: float
    priority: str  # "critical", "high", "medium", "low"
    notes: str


@dataclass
class RehabEstimate:
    """Complete rehab estimate result."""
    # Property context
    asset_class: AssetClass
    location_factor: float
    location_market: str
    condition: PropertyCondition
    
    # Cost breakdown
    breakdown: RehabBreakdown
    
    # Warnings and flags
    capex_warnings: List[CapExWarning] = field(default_factory=list)
    
    # Holding costs
    holding_costs: Optional[HoldingCosts] = None
    
    # Totals
    @property
    def total_rehab(self) -> float:
        return self.breakdown.total
    
    @property
    def total_project_cost(self) -> float:
        """Rehab + Holding costs = Total project cost."""
        holding = self.holding_costs.total_holding if self.holding_costs else 0
        return self.total_rehab + holding
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "asset_class": self.asset_class.value,
            "location_factor": self.location_factor,
            "location_market": self.location_market,
            "condition": self.condition.value,
            "breakdown": self.breakdown.to_dict(),
            "capex_warnings": [
                {
                    "item": w.item,
                    "age": w.age,
                    "threshold": w.threshold,
                    "estimated_cost": round(w.estimated_cost),
                    "priority": w.priority,
                    "notes": w.notes,
                }
                for w in self.capex_warnings
            ],
            "holding_costs": self.holding_costs.to_dict() if self.holding_costs else None,
            "total_rehab": round(self.total_rehab),
            "total_project_cost": round(self.total_project_cost),
        }


class RehabIntelligence:
    """
    Intelligent rehab cost estimation engine.
    
    Usage:
        ri = RehabIntelligence(
            sq_ft=2200,
            year_built=1985,
            arv=650000,
            zip_code="33483",
            bedrooms=4,
            bathrooms=3,
            condition="fair",
        )
        estimate = ri.calculate()
    """
    
    def __init__(
        self,
        sq_ft: int,
        year_built: int,
        arv: float,
        zip_code: str,
        bedrooms: int = 3,
        bathrooms: float = 2,
        condition: str = "fair",
        # Optional property features
        has_pool: bool = False,
        roof_type: str = None,  # "shingle", "tile", "metal", "flat"
        stories: int = 1,
        garage_spaces: int = 0,
        lot_sqft: int = None,
        hoa_monthly: float = 0,
        # Permit history (items recently replaced)
        recent_permits: List[str] = None,
        # Custom overrides
        custom_location_factor: float = None,
    ):
        self.sq_ft = sq_ft
        self.year_built = year_built
        self.arv = arv
        self.zip_code = str(zip_code)
        self.bedrooms = bedrooms
        self.bathrooms = bathrooms
        self.condition = PropertyCondition(condition.lower()) if isinstance(condition, str) else condition
        
        # Property features
        self.has_pool = has_pool
        self.roof_type = roof_type or "shingle"
        self.stories = stories
        self.garage_spaces = garage_spaces
        self.lot_sqft = lot_sqft or int(sq_ft * 3)  # Default 3x house size
        self.hoa_monthly = hoa_monthly
        
        # Permit history
        self.recent_permits = [p.lower() for p in (recent_permits or [])]
        
        # Current year for age calculations
        self.current_year = datetime.now().year
        self.property_age = self.current_year - year_built
        
        # Initialize costs
        self.costs = BaseCosts()
        
        # Determine asset class and multipliers
        self.asset_class, self.grade_multiplier = self._determine_asset_class()
        
        # Determine location factor
        if custom_location_factor:
            self.location_factor = custom_location_factor
            self.location_market = "Custom"
        else:
            loc_data = LOCATION_FACTORS.get(
                self.zip_code,
                LOCATION_FACTORS["default"]
            )
            self.location_factor = loc_data["factor"]
            self.location_market = loc_data["market"]
        
        # Get condition factors
        self.condition_factors = CONDITION_INTENSITY[self.condition]
        
        logger.info(
            f"RehabIntelligence initialized: {sq_ft}sqft, {year_built} "
            f"({self.property_age}yo), ARV ${arv:,.0f}, "
            f"Class: {self.asset_class.value}, Location: {self.location_market} ({self.location_factor}x)"
        )
    
    def _determine_asset_class(self) -> Tuple[AssetClass, float]:
        """
        Determine asset class based on ARV and price per sqft.
        Prevents the 'Luxury Trap' by scaling material quality appropriately.
        """
        price_per_sqft = self.arv / self.sq_ft if self.sq_ft > 0 else 0
        
        if self.arv > 2_000_000 or price_per_sqft > 700:
            return AssetClass.ULTRA_LUXURY, ASSET_CLASS_MULTIPLIERS[AssetClass.ULTRA_LUXURY]
        elif self.arv > 750_000 or price_per_sqft > 400:
            return AssetClass.LUXURY, ASSET_CLASS_MULTIPLIERS[AssetClass.LUXURY]
        else:
            return AssetClass.STANDARD, ASSET_CLASS_MULTIPLIERS[AssetClass.STANDARD]
    
    def _apply_multipliers(self, base_cost: float) -> float:
        """Apply grade and location multipliers to base cost."""
        return base_cost * self.grade_multiplier * self.location_factor
    
    def calculate(
        self,
        contingency_pct: float = 0.10,
        include_holding_costs: bool = True,
        holding_loan_rate: float = 0.10,
        holding_ltv: float = 0.70,
    ) -> RehabEstimate:
        """
        Calculate complete rehab estimate.
        
        Args:
            contingency_pct: Contingency percentage (default 10%)
            include_holding_costs: Whether to calculate holding costs
            holding_loan_rate: Annual loan interest rate for holding calc
            holding_ltv: Loan-to-value ratio for holding calc
        
        Returns:
            RehabEstimate with full breakdown and warnings
        """
        breakdown = RehabBreakdown()
        warnings = []
        
        # Get condition factors
        wet_factor = self.condition_factors["wet_room_factor"]
        dry_factor = self.condition_factors["dry_room_factor"]
        check_systems = self.condition_factors["systems_check"]
        permit_tier = self.condition_factors["permit_tier"]
        
        # ============================================
        # KITCHEN
        # ============================================
        if wet_factor >= 0.8:
            # Full remodel
            kitchen_cost = self._apply_multipliers(self.costs.kitchen_full_remodel)
        else:
            # Cosmetic update
            kitchen_cost = self._apply_multipliers(self.costs.kitchen_cosmetic) * wet_factor
        breakdown.kitchen = kitchen_cost
        
        # ============================================
        # BATHROOMS
        # ============================================
        # Assume 2/3 are full baths, 1/3 are half baths
        full_baths = max(1, int(self.bathrooms * 0.67))
        half_baths = max(0, self.bathrooms - full_baths)
        
        if wet_factor >= 0.8:
            bath_cost = (
                (full_baths * self._apply_multipliers(self.costs.full_bath_remodel)) +
                (half_baths * self._apply_multipliers(self.costs.half_bath_remodel))
            )
        else:
            bath_cost = (
                (full_baths * self._apply_multipliers(self.costs.full_bath_cosmetic) * wet_factor) +
                (half_baths * self._apply_multipliers(self.costs.half_bath_cosmetic) * wet_factor)
            )
        breakdown.bathrooms = bath_cost
        
        # ============================================
        # FLOORING
        # ============================================
        # Apply to 85% of sqft (exclude garage, bathrooms)
        flooring_sqft = self.sq_ft * 0.85 * dry_factor
        
        if self.asset_class == AssetClass.ULTRA_LUXURY:
            flooring_cost = flooring_sqft * self.costs.flooring_hardwood * self.location_factor
        elif self.asset_class == AssetClass.LUXURY:
            # Mix of tile and hardwood
            flooring_cost = flooring_sqft * (
                (self.costs.flooring_tile + self.costs.flooring_hardwood) / 2
            ) * self.location_factor
        else:
            flooring_cost = flooring_sqft * self.costs.flooring_lvp * self.location_factor
        breakdown.flooring = flooring_cost
        
        # ============================================
        # PAINT & WALLS
        # ============================================
        # Wall sqft is roughly 3.5x floor sqft (8ft ceilings, typical room layout)
        wall_sqft = self.sq_ft * 3.5 * dry_factor
        paint_cost = wall_sqft * self.costs.interior_paint * self.location_factor
        
        # Add drywall repair for distressed/fair condition
        if self.condition in [PropertyCondition.DISTRESSED, PropertyCondition.FAIR]:
            rooms = self.bedrooms + 3  # Bedrooms + living, dining, kitchen
            drywall_cost = rooms * self.costs.drywall_repair * self.location_factor
            paint_cost += drywall_cost
        
        breakdown.paint_walls = paint_cost
        
        # ============================================
        # EXTERIOR
        # ============================================
        exterior_cost = 0
        
        # Exterior paint (if condition warrants)
        if dry_factor >= 0.5:
            exterior_cost += self._apply_multipliers(self.costs.exterior_paint)
        
        # Landscaping
        if self.condition in [PropertyCondition.DISTRESSED, PropertyCondition.FAIR]:
            exterior_cost += self._apply_multipliers(self.costs.landscaping)
        
        # Pool
        if self.has_pool:
            if self.property_age > 15 and "pool" not in self.recent_permits:
                exterior_cost += self._apply_multipliers(self.costs.pool_resurface)
                warnings.append(CapExWarning(
                    item="Pool",
                    age=self.property_age,
                    threshold=15,
                    estimated_cost=self.costs.pool_resurface * self.grade_multiplier * self.location_factor,
                    priority="medium",
                    notes="Pool may need resurfacing. Included in estimate."
                ))
        
        breakdown.exterior = exterior_cost
        
        # ============================================
        # ROOF (CAPEX)
        # ============================================
        roof_cost = 0
        roof_threshold = CAPEX_AGE_THRESHOLDS.get(f"roof_{self.roof_type}", 18)
        
        if self.property_age > roof_threshold and "roof" not in self.recent_permits:
            # Roof area is ~1.2x living area (pitch and overhang)
            roof_sqft = self.sq_ft * 1.2 * self.stories
            
            if self.roof_type == "tile":
                roof_cost = roof_sqft * self.costs.roof_tile_sqft * self.location_factor
            elif self.roof_type == "metal":
                roof_cost = roof_sqft * self.costs.roof_metal_sqft * self.location_factor
            elif self.roof_type == "flat":
                roof_cost = roof_sqft * self.costs.roof_flat_sqft * self.location_factor
            else:  # shingle default
                # For luxury homes, upgrade to tile
                if self.asset_class in [AssetClass.LUXURY, AssetClass.ULTRA_LUXURY]:
                    roof_cost = roof_sqft * self.costs.roof_tile_sqft * self.location_factor
                else:
                    roof_cost = roof_sqft * self.costs.roof_shingle_sqft * self.location_factor
            
            warnings.append(CapExWarning(
                item="Roof",
                age=self.property_age,
                threshold=roof_threshold,
                estimated_cost=roof_cost,
                priority="critical",
                notes=f"Roof is {self.property_age} years old ({self.roof_type}). Replacement budgeted."
            ))
        
        breakdown.roof = roof_cost
        
        # ============================================
        # HVAC (CAPEX)
        # ============================================
        hvac_cost = 0
        hvac_threshold = CAPEX_AGE_THRESHOLDS["hvac"]
        
        if (self.property_age > hvac_threshold or check_systems) and "hvac" not in self.recent_permits:
            # Tonnage based on sqft (1 ton per 400-500 sqft in FL)
            tons = max(2, self.sq_ft / 450)
            hvac_cost = tons * self.costs.hvac_ton * self.location_factor
            
            warnings.append(CapExWarning(
                item="HVAC",
                age=self.property_age,
                threshold=hvac_threshold,
                estimated_cost=hvac_cost,
                priority="critical" if self.property_age > hvac_threshold else "high",
                notes=f"HVAC system is {self.property_age} years old. {tons:.1f} ton system budgeted."
            ))
        
        breakdown.hvac = hvac_cost
        
        # ============================================
        # ELECTRICAL
        # ============================================
        electrical_cost = 0
        
        # Panel upgrade if old or check_systems
        if self.property_age > CAPEX_AGE_THRESHOLDS["electrical_panel"] or (check_systems and self.property_age > 25):
            electrical_cost += self.costs.electrical_panel * self.location_factor
            warnings.append(CapExWarning(
                item="Electrical Panel",
                age=self.property_age,
                threshold=CAPEX_AGE_THRESHOLDS["electrical_panel"],
                estimated_cost=self.costs.electrical_panel * self.location_factor,
                priority="high",
                notes="Electrical panel may need upgrade. Verify if fuse box or undersized."
            ))
        
        # Add outlets and lights for rehab
        if self.condition in [PropertyCondition.DISTRESSED, PropertyCondition.FAIR]:
            # GFCI outlets in wet areas
            electrical_cost += 6 * self.costs.gfci_outlets * self.location_factor
            # Ceiling fans
            electrical_cost += self.bedrooms * self.costs.ceiling_fan * self.location_factor
            # Recessed lights
            electrical_cost += 12 * self.costs.recessed_lights * self.location_factor
        
        breakdown.electrical = electrical_cost
        
        # ============================================
        # PLUMBING
        # ============================================
        plumbing_cost = 0
        
        # Check for problematic pipe materials (would need property data)
        # For now, flag if very old
        if self.year_built < 1975 and "plumbing" not in self.recent_permits:
            plumbing_cost = self.sq_ft * self.costs.plumbing_repipe_sqft * self.location_factor
            warnings.append(CapExWarning(
                item="Plumbing",
                age=self.property_age,
                threshold=50,
                estimated_cost=plumbing_cost,
                priority="critical",
                notes="Pre-1975 home may have galvanized pipes. Full repipe budgeted."
            ))
        elif self.year_built >= 1978 and self.year_built <= 1995:
            # Polybutylene era
            plumbing_cost = self.sq_ft * self.costs.plumbing_repipe_sqft * self.location_factor * 0.7
            warnings.append(CapExWarning(
                item="Plumbing",
                age=self.property_age,
                threshold=1,
                estimated_cost=plumbing_cost,
                priority="high",
                notes="1978-1995 build - verify if polybutylene pipes. Repipe may be needed."
            ))
        
        # Water heater
        if self.property_age > CAPEX_AGE_THRESHOLDS["water_heater"] and "water_heater" not in self.recent_permits:
            wh_cost = self.costs.water_heater_tankless if self.asset_class != AssetClass.STANDARD else self.costs.water_heater_tank
            plumbing_cost += wh_cost * self.location_factor
            warnings.append(CapExWarning(
                item="Water Heater",
                age=self.property_age,
                threshold=CAPEX_AGE_THRESHOLDS["water_heater"],
                estimated_cost=wh_cost * self.location_factor,
                priority="medium",
                notes="Water heater likely needs replacement."
            ))
        
        breakdown.plumbing = plumbing_cost
        
        # ============================================
        # WINDOWS & DOORS
        # ============================================
        windows_doors_cost = 0
        
        if self.property_age > CAPEX_AGE_THRESHOLDS["windows"] and "windows" not in self.recent_permits:
            # Estimate window count based on sqft
            window_count = max(8, self.sq_ft // 150)
            windows_cost = window_count * self._apply_multipliers(self.costs.windows_each)
            windows_doors_cost += windows_cost
            
            warnings.append(CapExWarning(
                item="Windows",
                age=self.property_age,
                threshold=CAPEX_AGE_THRESHOLDS["windows"],
                estimated_cost=windows_cost,
                priority="high",
                notes=f"Windows are {self.property_age} years old. {window_count} impact windows budgeted."
            ))
        
        # Front door for rehab
        if self.condition in [PropertyCondition.DISTRESSED, PropertyCondition.FAIR]:
            windows_doors_cost += self._apply_multipliers(self.costs.front_door)
            
            # Garage doors
            if self.garage_spaces > 0:
                windows_doors_cost += self.garage_spaces * self._apply_multipliers(self.costs.garage_door)
        
        breakdown.windows_doors = windows_doors_cost
        
        # ============================================
        # OTHER COSTS
        # ============================================
        other_cost = 0
        
        # Dumpsters based on rehab scope
        dumpster_count = 2 if dry_factor < 0.5 else 4 if dry_factor < 0.8 else 6
        other_cost += dumpster_count * self.costs.dumpster_load
        
        # Cleaning
        other_cost += self.costs.deep_cleaning * self.location_factor
        
        # Termite treatment for older homes
        if self.property_age > 20:
            other_cost += self.costs.termite_treatment
        
        breakdown.other = other_cost
        
        # ============================================
        # PERMITS
        # ============================================
        if permit_tier == "major":
            breakdown.permits = self.costs.permit_major
        else:
            breakdown.permits = self.costs.permit_minor
        
        # ============================================
        # CONTINGENCY
        # ============================================
        breakdown.contingency = breakdown.construction_total * contingency_pct
        
        # ============================================
        # HOLDING COSTS
        # ============================================
        holding_costs = None
        if include_holding_costs:
            holding_costs = self._calculate_holding_costs(
                breakdown.total,
                holding_loan_rate,
                holding_ltv
            )
        
        # Create result
        estimate = RehabEstimate(
            asset_class=self.asset_class,
            location_factor=self.location_factor,
            location_market=self.location_market,
            condition=self.condition,
            breakdown=breakdown,
            capex_warnings=warnings,
            holding_costs=holding_costs,
        )
        
        logger.info(
            f"Rehab estimate complete: ${estimate.total_rehab:,.0f} rehab, "
            f"${estimate.total_project_cost:,.0f} total project cost"
        )
        
        return estimate
    
    def _calculate_holding_costs(
        self,
        rehab_budget: float,
        loan_rate: float,
        ltv: float,
    ) -> HoldingCosts:
        """
        Calculate holding costs during rehab period.
        The "silent killer" of flip profits.
        """
        # Timeline based on budget size and scope
        if rehab_budget > 250_000:
            months = 10
        elif rehab_budget > 150_000:
            months = 8
        elif rehab_budget > 75_000:
            months = 6
        elif rehab_budget > 40_000:
            months = 4
        else:
            months = 3
        
        # Loan amount (purchase + rehab)
        loan_amount = self.arv * ltv
        
        # Monthly interest (interest-only during rehab)
        monthly_interest = (loan_amount * loan_rate) / 12
        
        # Monthly property tax (FL average ~1.8% of value)
        annual_tax = self.arv * 0.018
        monthly_taxes = annual_tax / 12
        
        # Monthly insurance (FL average ~1.0% due to hurricane risk)
        annual_insurance = self.arv * 0.010
        monthly_insurance = annual_insurance / 12
        
        # Monthly utilities (based on size)
        if self.sq_ft > 4000:
            monthly_utilities = 900
        elif self.sq_ft > 2500:
            monthly_utilities = 600
        elif self.sq_ft > 1500:
            monthly_utilities = 400
        else:
            monthly_utilities = 300
        
        return HoldingCosts(
            duration_months=months,
            monthly_interest=monthly_interest,
            monthly_taxes=monthly_taxes,
            monthly_insurance=monthly_insurance,
            monthly_utilities=monthly_utilities,
            monthly_hoa=self.hoa_monthly,
        )
    
    def generate_line_items(self) -> List[Dict[str, Any]]:
        """
        Generate line items compatible with the frontend RehabEstimator.
        This bridges RehabIntelligence with the existing manual system.
        
        Returns list of items in format:
        [{"itemId": "cabinets", "quantity": 1, "tier": "mid", "cost": 8000}, ...]
        """
        estimate = self.calculate(contingency_pct=0, include_holding_costs=False)
        breakdown = estimate.breakdown
        
        # Map to existing REHAB_CATEGORIES item IDs
        items = []
        
        # Determine tier based on asset class
        tier = "high" if self.asset_class == AssetClass.ULTRA_LUXURY else \
               "mid" if self.asset_class == AssetClass.LUXURY else "low"
        
        # Kitchen items
        if breakdown.kitchen > 0:
            items.append({
                "itemId": "cabinets",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.kitchen * 0.4),
            })
            items.append({
                "itemId": "countertops",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.kitchen * 0.25),
            })
            items.append({
                "itemId": "appliances",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.kitchen * 0.25),
            })
            items.append({
                "itemId": "backsplash",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.kitchen * 0.1),
            })
        
        # Bathroom items
        if breakdown.bathrooms > 0:
            full_baths = max(1, int(self.bathrooms * 0.67))
            items.append({
                "itemId": "full_bath",
                "quantity": full_baths,
                "tier": tier,
                "cost": round(breakdown.bathrooms * 0.8),
            })
            if self.bathrooms > 2:
                items.append({
                    "itemId": "half_bath",
                    "quantity": 1,
                    "tier": tier,
                    "cost": round(breakdown.bathrooms * 0.2),
                })
        
        # Flooring
        if breakdown.flooring > 0:
            flooring_sqft = int(self.sq_ft * 0.85 * self.condition_factors["dry_room_factor"])
            items.append({
                "itemId": "lvp" if self.asset_class == AssetClass.STANDARD else "hardwood",
                "quantity": flooring_sqft,
                "tier": tier,
                "cost": round(breakdown.flooring),
            })
        
        # Paint
        if breakdown.paint_walls > 0:
            wall_sqft = int(self.sq_ft * 3.5 * self.condition_factors["dry_room_factor"])
            items.append({
                "itemId": "interior_paint",
                "quantity": wall_sqft,
                "tier": tier,
                "cost": round(breakdown.paint_walls * 0.8),
            })
            if self.condition in [PropertyCondition.DISTRESSED, PropertyCondition.FAIR]:
                items.append({
                    "itemId": "drywall_repair",
                    "quantity": self.bedrooms + 3,
                    "tier": tier,
                    "cost": round(breakdown.paint_walls * 0.2),
                })
        
        # Exterior
        if breakdown.exterior > 0:
            items.append({
                "itemId": "exterior_paint",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.exterior * 0.6),
            })
            items.append({
                "itemId": "landscaping",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.exterior * 0.4),
            })
        
        # Roof
        if breakdown.roof > 0:
            items.append({
                "itemId": "roof",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.roof),
            })
        
        # HVAC
        if breakdown.hvac > 0:
            items.append({
                "itemId": "hvac",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.hvac),
            })
        
        # Water heater (from plumbing)
        wh_cost = None
        for w in estimate.capex_warnings:
            if w.item == "Water Heater":
                wh_cost = w.estimated_cost
                break
        if wh_cost:
            items.append({
                "itemId": "water_heater",
                "quantity": 1,
                "tier": tier,
                "cost": round(wh_cost),
            })
        
        # Electrical
        if breakdown.electrical > 0:
            items.append({
                "itemId": "electrical_panel",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.electrical),
            })
        
        # Plumbing
        plumbing_non_wh = breakdown.plumbing - (wh_cost or 0)
        if plumbing_non_wh > 5000:
            items.append({
                "itemId": "plumbing_repipe",
                "quantity": 1,
                "tier": tier,
                "cost": round(plumbing_non_wh),
            })
        
        # Windows
        for w in estimate.capex_warnings:
            if w.item == "Windows":
                window_count = max(8, self.sq_ft // 150)
                items.append({
                    "itemId": "windows",
                    "quantity": window_count,
                    "tier": tier,
                    "cost": round(w.estimated_cost),
                })
                break
        
        # Front door
        if breakdown.windows_doors > 0 and breakdown.roof == 0:  # Not just windows
            items.append({
                "itemId": "front_door",
                "quantity": 1,
                "tier": tier,
                "cost": round(self.costs.front_door * self.grade_multiplier * self.location_factor),
            })
        
        # Permits
        if breakdown.permits > 0:
            items.append({
                "itemId": "permits",
                "quantity": 1,
                "tier": tier,
                "cost": round(breakdown.permits),
            })
        
        # Dumpster
        items.append({
            "itemId": "dumpster",
            "quantity": 4,
            "tier": "mid",
            "cost": round(self.costs.dumpster_load * 4),
        })
        
        # Cleaning
        items.append({
            "itemId": "cleaning",
            "quantity": 1,
            "tier": tier,
            "cost": round(self.costs.deep_cleaning * self.location_factor),
        })
        
        return items


def create_rehab_estimate(
    property_data: Dict[str, Any],
    condition: str = "fair",
    recent_permits: List[str] = None,
    contingency_pct: float = 0.10,
) -> Dict[str, Any]:
    """
    Factory function to create a rehab estimate from property data.
    
    Args:
        property_data: NormalizedProperty-compatible dict with:
            - square_footage: int
            - year_built: int
            - current_value_avm or arv: float
            - zip_code: str
            - bedrooms: int
            - bathrooms: float
            - has_pool: bool (optional)
            - roof_type: str (optional)
            - stories: int (optional)
            - garage_spaces: int (optional)
            - lot_size: int (optional)
            - hoa_monthly: float (optional)
        condition: Property condition ("distressed", "fair", "good", "excellent")
        recent_permits: List of recently permitted items
        contingency_pct: Contingency percentage
    
    Returns:
        RehabEstimate as dict
    """
    ri = RehabIntelligence(
        sq_ft=property_data.get("square_footage", 1500),
        year_built=property_data.get("year_built", 2000),
        arv=property_data.get("arv") or property_data.get("current_value_avm", 400000),
        zip_code=property_data.get("zip_code", "33401"),
        bedrooms=property_data.get("bedrooms", 3),
        bathrooms=property_data.get("bathrooms", 2),
        condition=condition,
        has_pool=property_data.get("has_pool", False),
        roof_type=property_data.get("roof_type"),
        stories=property_data.get("stories", 1),
        garage_spaces=property_data.get("garage_spaces", 0),
        lot_sqft=property_data.get("lot_size"),
        hoa_monthly=property_data.get("hoa_monthly", 0),
        recent_permits=recent_permits,
    )
    
    estimate = ri.calculate(contingency_pct=contingency_pct)
    return estimate.to_dict()

