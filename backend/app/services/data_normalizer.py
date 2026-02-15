"""
DealGapIQ Data Normalizer

Intelligent data merging and normalization layer that combines RentCast and Zillow (AXESSO)
data into a unified schema optimized for real estate investment analysis.

METHODOLOGY:
1. RentCast is PRIMARY for property records, tax data, and market statistics
2. Zillow is PRIMARY for Zestimates, school data, and walkability scores
3. Conflicting data uses weighted averaging based on data source reliability
4. Missing data is flagged with confidence scores

DATA QUALITY PRINCIPLES:
- Every field has provenance tracking (which source provided it)
- Conflicts are flagged for manual review when variance > 15%
- Stale data (>30 days) is marked appropriately
- Completeness scores help prioritize data gaps
"""
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class DataSource(str, Enum):
    """Data source identifiers."""
    RENTCAST = "rentcast"
    ZILLOW = "zillow"
    MERGED = "merged"
    CALCULATED = "calculated"
    USER_INPUT = "user_input"
    MISSING = "missing"


class ConfidenceLevel(str, Enum):
    """Data confidence levels."""
    HIGH = "high"           # Single authoritative source or sources agree
    MEDIUM = "medium"       # Sources conflict but merged, or secondary source
    LOW = "low"             # Only one secondary source or stale data
    MISSING = "missing"     # No data available


@dataclass
class FieldProvenance:
    """Tracks the source and quality of each data field."""
    source: DataSource
    confidence: ConfidenceLevel
    fetched_at: datetime
    raw_values: Dict[str, Any] = field(default_factory=dict)
    conflict_flag: bool = False
    conflict_pct: float = 0.0
    notes: str = ""


@dataclass
class NormalizedProperty:
    """
    Canonical property data model with all fields from both sources.
    
    This is the OUTPUT schema - all investment calculations use this structure.
    """
    # Identity
    property_id: Optional[str] = None
    zpid: Optional[str] = None
    
    # Address
    formatted_address: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Property Characteristics
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_footage: Optional[int] = None
    lot_size: Optional[int] = None
    year_built: Optional[int] = None
    stories: Optional[int] = None
    
    # Features
    has_pool: Optional[bool] = None
    has_garage: Optional[bool] = None
    garage_spaces: Optional[int] = None
    has_heating: Optional[bool] = None
    heating_type: Optional[str] = None
    has_cooling: Optional[bool] = None
    cooling_type: Optional[str] = None
    has_fireplace: Optional[bool] = None
    exterior_type: Optional[str] = None
    roof_type: Optional[str] = None
    view_type: Optional[str] = None
    
    # Valuations - PRIMARY INVESTOR DATA
    current_value_avm: Optional[float] = None      # Best estimate of current value
    value_range_low: Optional[float] = None
    value_range_high: Optional[float] = None
    zestimate: Optional[float] = None              # Zillow specific
    rentcast_avm: Optional[float] = None           # RentCast specific
    
    # Rental Data - CRITICAL FOR CASH FLOW
    monthly_rent_estimate: Optional[float] = None   # Best rent estimate
    rent_range_low: Optional[float] = None
    rent_range_high: Optional[float] = None
    rent_zestimate: Optional[float] = None          # Zillow specific
    rentcast_rent: Optional[float] = None           # RentCast specific
    
    # Rental Market Statistics - Extended for investor analysis
    rental_rentcast_estimate: Optional[float] = None  # RentCast property estimate
    rental_zillow_estimate: Optional[float] = None    # Zillow rentZestimate
    rental_iq_estimate: Optional[float] = None        # DealGapIQ proprietary (avg of both)
    rental_market_avg: Optional[float] = None         # Market average rent
    rental_market_median: Optional[float] = None      # Market median rent
    rental_market_min: Optional[float] = None         # Market minimum rent
    rental_market_max: Optional[float] = None         # Market maximum rent
    rental_market_rent_per_sqft: Optional[float] = None  # Market avg rent/sqft
    rental_days_on_market: Optional[int] = None       # Rental median DOM
    rental_total_listings: Optional[int] = None       # Total rental listings
    rental_new_listings: Optional[int] = None         # New rental listings
    rent_trend: Optional[str] = None                  # "up", "down", "stable"
    rent_trend_pct: Optional[float] = None            # YoY percentage change
    
    # Transaction History
    last_sale_price: Optional[float] = None
    last_sale_date: Optional[datetime] = None
    
    # Tax Data
    tax_assessed_value: Optional[float] = None
    tax_assessed_land: Optional[float] = None
    tax_assessed_improvements: Optional[float] = None
    annual_property_tax: Optional[float] = None
    tax_year: Optional[int] = None
    
    # HOA/Fees
    hoa_monthly: Optional[float] = None
    
    # Ownership
    owner_name: Optional[str] = None
    owner_type: Optional[str] = None
    owner_occupied: Optional[bool] = None
    
    # Location Scores - ZILLOW PRIMARY
    walk_score: Optional[int] = None
    transit_score: Optional[int] = None
    bike_score: Optional[int] = None
    
    # Schools - ZILLOW PRIMARY
    school_rating_avg: Optional[float] = None
    elementary_school_rating: Optional[int] = None
    middle_school_rating: Optional[int] = None
    high_school_rating: Optional[int] = None
    
    # Market Context - Extended for Buyer/Seller Analysis
    market_median_price: Optional[float] = None
    market_avg_price_sqft: Optional[float] = None
    market_days_on_market: Optional[int] = None       # Median days on market
    market_avg_days_on_market: Optional[float] = None # Average days on market (NEW)
    market_min_days_on_market: Optional[int] = None   # Min days on market (NEW)
    market_max_days_on_market: Optional[int] = None   # Max days on market (NEW)
    market_total_listings: Optional[int] = None
    market_new_listings: Optional[int] = None         # New listings count (NEW)
    market_absorption_rate: Optional[float] = None    # Calculated: new/total (NEW)
    market_temperature: Optional[str] = None          # hot, warm, cold (NEW)
    
    # Comparables Counts
    sale_comps_count: Optional[int] = None
    rent_comps_count: Optional[int] = None
    sold_comps_count: Optional[int] = None
    
    # Listing Status - CRITICAL FOR PRICE DISPLAY
    listing_status: Optional[str] = None          # FOR_SALE, FOR_RENT, OFF_MARKET, SOLD, PENDING
    is_off_market: bool = True                    # Whether property is currently off-market
    seller_type: Optional[str] = None             # Agent, FSBO, Foreclosure, BankOwned, Auction
    is_foreclosure: bool = False
    is_bank_owned: bool = False
    is_fsbo: bool = False
    is_auction: bool = False
    is_new_construction: bool = False
    list_price: Optional[float] = None            # Actual listing price if actively listed
    days_on_market: Optional[int] = None
    time_on_market: Optional[str] = None
    date_sold: Optional[str] = None
    brokerage_name: Optional[str] = None
    listing_agent_name: Optional[str] = None
    mls_id: Optional[str] = None
    
    # Seller Motivation Indicators - Extended data for motivation scoring
    is_pre_foreclosure: bool = False              # Pre-foreclosure status
    is_withdrawn: bool = False                    # Was previously listed but withdrawn
    price_reduction_count: int = 0                # Number of price reductions
    total_price_reduction_pct: Optional[float] = None  # Total % reduced from original
    is_non_owner_occupied: Optional[bool] = None  # Absentee ownership flag
    owner_mailing_state: Optional[str] = None     # Owner's mailing address state (for out-of-state detection)
    property_description: Optional[str] = None    # Full description for keyword analysis
    selling_soon_percentile: Optional[float] = None  # Zillow's sell likelihood prediction
    favorite_count: Optional[int] = None          # Number of users who favorited
    page_view_count: Optional[int] = None         # Property page views
    
    # Metadata
    data_fetched_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    provenance: Dict[str, FieldProvenance] = field(default_factory=dict)
    data_quality_score: float = 0.0
    missing_fields: List[str] = field(default_factory=list)
    conflict_fields: List[str] = field(default_factory=list)


class DealGapIQNormalizer:
    """
    Main normalization engine that combines RentCast and Zillow data.
    
    Priority Matrix:
    ┌──────────────────────────┬──────────────┬─────────────┬──────────────┐
    │ Data Category            │ Primary      │ Secondary   │ Weight       │
    ├──────────────────────────┼──────────────┼─────────────┼──────────────┤
    │ Property Records         │ RentCast     │ Zillow      │ 70/30        │
    │ Property Value (AVM)     │ RentCast     │ Zillow      │ 55/45        │
    │ Rent Estimate            │ RentCast     │ Zillow      │ 60/40        │
    │ Tax Data                 │ RentCast     │ Zillow      │ 80/20        │
    │ Owner Info               │ RentCast     │ N/A         │ 100/0        │
    │ School Ratings           │ Zillow       │ N/A         │ 0/100        │
    │ Walk/Transit Scores      │ Zillow       │ N/A         │ 0/100        │
    │ Zestimate History        │ Zillow       │ N/A         │ 0/100        │
    │ Market Statistics        │ RentCast     │ Zillow      │ 60/40        │
    │ Sale Comparables         │ Both         │ Both        │ 50/50 merge  │
    │ Rent Comparables         │ Both         │ Both        │ 50/50 merge  │
    └──────────────────────────┴──────────────┴─────────────┴──────────────┘
    """
    
    # Conflict threshold - if values differ by more than this %, flag as conflict
    CONFLICT_THRESHOLD = 0.15
    
    # Data staleness threshold (days)
    STALE_THRESHOLD_DAYS = 30
    
    # Source weights for merging
    WEIGHTS = {
        "property_records": {"rentcast": 0.70, "zillow": 0.30},
        "valuation": {"rentcast": 0.55, "zillow": 0.45},
        "rent": {"rentcast": 0.60, "zillow": 0.40},
        "tax": {"rentcast": 0.80, "zillow": 0.20},
        "market": {"rentcast": 0.60, "zillow": 0.40},
    }
    
    def __init__(self):
        self.timestamp = datetime.now(timezone.utc)
    
    def normalize(
        self,
        rentcast_data: Optional[Dict[str, Any]],
        zillow_data: Optional[Dict[str, Any]]
    ) -> NormalizedProperty:
        """
        Main normalization entry point.
        
        Args:
            rentcast_data: Raw RentCast API response data
            zillow_data: Raw Zillow (AXESSO) API response data
        
        Returns:
            NormalizedProperty with merged data and provenance tracking
        """
        result = NormalizedProperty()
        result.data_fetched_at = self.timestamp
        
        # Extract nested data structures
        rc = self._flatten_rentcast(rentcast_data) if rentcast_data else {}
        zl = self._flatten_zillow(zillow_data) if zillow_data else {}
        
        # Merge each category
        self._merge_identity(result, rc, zl)
        self._merge_address(result, rc, zl)
        self._merge_characteristics(result, rc, zl)
        self._merge_features(result, rc, zl)
        self._merge_valuations(result, rc, zl)
        self._merge_rental(result, rc, zl)
        self._merge_tax(result, rc, zl)
        self._merge_ownership(result, rc, zl)
        self._merge_scores(result, rc, zl)
        self._merge_schools(result, rc, zl)
        self._merge_market(result, rc, zl)
        self._merge_rental_market(result, rc, zl)  # Rental market stats for investor analysis
        self._merge_comps_counts(result, rc, zl)
        self._merge_listing_status(result, rc, zl)  # Listing status for price display
        self._merge_owner_location(result, rc, zl)  # Owner location for out-of-state detection
        
        # Calculate data quality
        self._calculate_quality_score(result)
        
        return result
    
    def _flatten_rentcast(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Flatten RentCast nested structure for easier access."""
        flat = {}
        
        # Handle endpoints wrapper from our fetch script
        if "endpoints" in data:
            endpoints = data["endpoints"]
            
            # Properties endpoint
            props = endpoints.get("properties", {}).get("data", [])
            if props and isinstance(props, list) and len(props) > 0:
                flat["property"] = props[0]
            
            # AVM endpoint
            avm = endpoints.get("avm_value", {}).get("data", {})
            if avm:
                flat["avm"] = avm
            
            # Rent endpoint
            rent = endpoints.get("rent_estimate", {}).get("data", {})
            if rent:
                flat["rent"] = rent
            
            # Market stats
            market = endpoints.get("market_stats", {}).get("data", {})
            if market:
                flat["market"] = market
            
            # Listings
            sale_listings = endpoints.get("sale_listings", {}).get("data", [])
            flat["sale_listings"] = sale_listings if sale_listings else []
            
            rent_listings = endpoints.get("rental_listings", {}).get("data", [])
            flat["rental_listings"] = rent_listings if rent_listings else []
        else:
            # Direct data structure
            flat["property"] = data
        
        return flat
    
    def _flatten_zillow(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Flatten Zillow nested structure for easier access."""
        flat = {}
        
        if not data:
            return flat
        
        # Handle our comprehensive fetch structure
        # First check for search response (has zpid)
        if "search" in data:
            search_item = data["search"]
            if hasattr(search_item, 'data') and search_item.data:
                # search-by-address returns full property data directly
                flat["property"] = search_item.data
            elif hasattr(search_item, 'success') and search_item.success:
                flat["property"] = getattr(search_item, 'data', None)
        
        if "property_details" in data:
            pd = data.get("property_details")
            if pd is not None:
                if hasattr(pd, 'data') and pd.data:
                    flat["property"] = pd.data
                elif isinstance(pd, dict) and pd.get("data"):
                    flat["property"] = pd["data"]
                elif isinstance(pd, dict):
                    flat["property"] = pd
        
        # Other endpoints
        for key in ["price_tax_history", "zestimate_history", "rent_estimate",
                    "similar_for_sale", "similar_rentals", "similar_sold",
                    "schools", "accessibility_scores", "market_data"]:
            if key in data:
                item = data[key]
                if item is None:
                    continue
                if hasattr(item, 'data'):
                    flat[key] = item.data
                elif isinstance(item, dict) and "data" in item:
                    flat[key] = item["data"]
                else:
                    flat[key] = item
        
        if "zpid" in data:
            flat["zpid"] = data["zpid"]
        
        return flat
    
    def _set_field(
        self,
        result: NormalizedProperty,
        field_name: str,
        value: Any,
        source: DataSource,
        confidence: ConfidenceLevel,
        raw_values: Dict[str, Any] = None,
        conflict: bool = False,
        conflict_pct: float = 0.0
    ):
        """Set a field value with provenance tracking."""
        setattr(result, field_name, value)
        result.provenance[field_name] = FieldProvenance(
            source=source,
            confidence=confidence,
            fetched_at=self.timestamp,
            raw_values=raw_values or {},
            conflict_flag=conflict,
            conflict_pct=conflict_pct
        )
        
        if conflict:
            result.conflict_fields.append(field_name)
    
    def _merge_numeric(
        self,
        rc_value: Optional[float],
        zl_value: Optional[float],
        weights: Dict[str, float]
    ) -> Tuple[Optional[float], DataSource, ConfidenceLevel, bool, float]:
        """
        Merge numeric values from two sources.
        
        Returns: (merged_value, source, confidence, is_conflict, conflict_pct)
        """
        if rc_value is None and zl_value is None:
            return None, DataSource.MISSING, ConfidenceLevel.MISSING, False, 0.0
        
        if rc_value is not None and zl_value is None:
            return rc_value, DataSource.RENTCAST, ConfidenceLevel.HIGH, False, 0.0
        
        if rc_value is None and zl_value is not None:
            return zl_value, DataSource.ZILLOW, ConfidenceLevel.HIGH, False, 0.0
        
        # Both have values - check for conflict
        if rc_value == 0:
            return zl_value, DataSource.ZILLOW, ConfidenceLevel.HIGH, False, 0.0
        
        conflict_pct = abs(rc_value - zl_value) / rc_value
        is_conflict = conflict_pct > self.CONFLICT_THRESHOLD
        
        if is_conflict:
            # Weighted merge
            rc_weight = weights.get("rentcast", 0.5)
            zl_weight = weights.get("zillow", 0.5)
            merged = (rc_value * rc_weight) + (zl_value * zl_weight)
            return merged, DataSource.MERGED, ConfidenceLevel.MEDIUM, True, conflict_pct
        else:
            # Close enough - use primary (RentCast)
            return rc_value, DataSource.RENTCAST, ConfidenceLevel.HIGH, False, conflict_pct
    
    def _merge_identity(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """Merge identity fields."""
        prop = rc.get("property", {}) or {}
        zl_prop = zl.get("property", {}) or {}
        
        # Property ID from RentCast
        if prop.get("id"):
            self._set_field(result, "property_id", prop["id"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        # ZPID from Zillow
        zpid = zl.get("zpid") or zl_prop.get("zpid")
        if zpid:
            self._set_field(result, "zpid", str(zpid),
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
    
    def _merge_address(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """Merge address fields - RentCast primary."""
        prop = rc.get("property", {}) or {}
        zl_prop = zl.get("property", {}) or {}
        
        # Formatted address
        addr = prop.get("formattedAddress") or zl_prop.get("address")
        if addr:
            source = DataSource.RENTCAST if prop.get("formattedAddress") else DataSource.ZILLOW
            self._set_field(result, "formatted_address", addr, source, ConfidenceLevel.HIGH)
        
        # Street
        street = prop.get("addressLine1") or zl_prop.get("streetAddress")
        if street:
            source = DataSource.RENTCAST if prop.get("addressLine1") else DataSource.ZILLOW
            self._set_field(result, "street_address", street, source, ConfidenceLevel.HIGH)
        
        # City
        city = prop.get("city") or zl_prop.get("city")
        if city:
            source = DataSource.RENTCAST if prop.get("city") else DataSource.ZILLOW
            self._set_field(result, "city", city, source, ConfidenceLevel.HIGH)
        
        # State
        state = prop.get("state") or zl_prop.get("state")
        if state:
            source = DataSource.RENTCAST if prop.get("state") else DataSource.ZILLOW
            self._set_field(result, "state", state, source, ConfidenceLevel.HIGH)
        
        # Zip
        zipcode = prop.get("zipCode") or zl_prop.get("zipcode")
        if zipcode:
            source = DataSource.RENTCAST if prop.get("zipCode") else DataSource.ZILLOW
            self._set_field(result, "zip_code", zipcode, source, ConfidenceLevel.HIGH)
        
        # County - RentCast only
        if prop.get("county"):
            self._set_field(result, "county", prop["county"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        # Coordinates
        lat = prop.get("latitude") or zl_prop.get("latitude")
        lng = prop.get("longitude") or zl_prop.get("longitude")
        if lat:
            self._set_field(result, "latitude", lat,
                          DataSource.RENTCAST if prop.get("latitude") else DataSource.ZILLOW,
                          ConfidenceLevel.HIGH)
        if lng:
            self._set_field(result, "longitude", lng,
                          DataSource.RENTCAST if prop.get("longitude") else DataSource.ZILLOW,
                          ConfidenceLevel.HIGH)
    
    def _merge_characteristics(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """Merge property characteristics - RentCast primary."""
        prop = rc.get("property", {}) or {}
        zl_prop = zl.get("property", {}) or {}
        
        # Property type
        ptype = prop.get("propertyType") or zl_prop.get("homeType")
        if ptype:
            source = DataSource.RENTCAST if prop.get("propertyType") else DataSource.ZILLOW
            self._set_field(result, "property_type", ptype, source, ConfidenceLevel.HIGH)
        
        # Bedrooms - exact match expected
        rc_beds = prop.get("bedrooms")
        zl_beds = zl_prop.get("bedrooms")
        if rc_beds is not None or zl_beds is not None:
            value, source, conf, conflict, pct = self._merge_numeric(
                rc_beds, zl_beds, {"rentcast": 1.0, "zillow": 0.0}
            )
            self._set_field(result, "bedrooms", int(value) if value else None,
                          source, conf, {"rentcast": rc_beds, "zillow": zl_beds},
                          conflict, pct)
        
        # Bathrooms
        rc_baths = prop.get("bathrooms")
        zl_baths = zl_prop.get("bathrooms")
        if rc_baths is not None or zl_baths is not None:
            value, source, conf, conflict, pct = self._merge_numeric(
                rc_baths, zl_baths, {"rentcast": 1.0, "zillow": 0.0}
            )
            self._set_field(result, "bathrooms", value,
                          source, conf, {"rentcast": rc_baths, "zillow": zl_baths},
                          conflict, pct)
        
        # Square footage - may vary, use merge
        rc_sqft = prop.get("squareFootage")
        zl_sqft = zl_prop.get("livingArea")
        if rc_sqft is not None or zl_sqft is not None:
            value, source, conf, conflict, pct = self._merge_numeric(
                rc_sqft, zl_sqft, self.WEIGHTS["property_records"]
            )
            self._set_field(result, "square_footage", int(value) if value else None,
                          source, conf, {"rentcast": rc_sqft, "zillow": zl_sqft},
                          conflict, pct)
        
        # Lot size
        rc_lot = prop.get("lotSize")
        zl_lot = zl_prop.get("lotAreaValue")
        if rc_lot is not None or zl_lot is not None:
            value, source, conf, conflict, pct = self._merge_numeric(
                rc_lot, zl_lot, self.WEIGHTS["property_records"]
            )
            self._set_field(result, "lot_size", int(value) if value else None,
                          source, conf, {"rentcast": rc_lot, "zillow": zl_lot},
                          conflict, pct)
        
        # Year built
        rc_year = prop.get("yearBuilt")
        zl_year = zl_prop.get("yearBuilt")
        if rc_year is not None or zl_year is not None:
            # Year should match exactly
            value = rc_year or zl_year
            source = DataSource.RENTCAST if rc_year else DataSource.ZILLOW
            conflict = rc_year and zl_year and rc_year != zl_year
            self._set_field(result, "year_built", value,
                          source, ConfidenceLevel.HIGH if not conflict else ConfidenceLevel.MEDIUM,
                          {"rentcast": rc_year, "zillow": zl_year}, conflict)
        
        # Stories
        rc_stories = prop.get("features", {}).get("floorCount")
        zl_stories = zl_prop.get("stories")
        if rc_stories or zl_stories:
            value = rc_stories or zl_stories
            source = DataSource.RENTCAST if rc_stories else DataSource.ZILLOW
            self._set_field(result, "stories", value, source, ConfidenceLevel.HIGH)
    
    def _merge_features(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """Merge property features."""
        prop = rc.get("property", {}) or {}
        features = prop.get("features", {}) or {}
        zl_prop = zl.get("property", {}) or {}
        
        # Pool
        has_pool = features.get("pool") or zl_prop.get("hasPool")
        if has_pool is not None:
            source = DataSource.RENTCAST if features.get("pool") is not None else DataSource.ZILLOW
            self._set_field(result, "has_pool", bool(has_pool), source, ConfidenceLevel.HIGH)
        
        # Garage
        has_garage = features.get("garage") or zl_prop.get("hasGarage")
        if has_garage is not None:
            source = DataSource.RENTCAST if features.get("garage") is not None else DataSource.ZILLOW
            self._set_field(result, "has_garage", bool(has_garage), source, ConfidenceLevel.HIGH)
        
        # Garage spaces
        spaces = features.get("garageSpaces") or zl_prop.get("parkingSpaces")
        if spaces:
            source = DataSource.RENTCAST if features.get("garageSpaces") else DataSource.ZILLOW
            self._set_field(result, "garage_spaces", spaces, source, ConfidenceLevel.HIGH)
        
        # HVAC - RentCast primary
        if features.get("heating") is not None:
            self._set_field(result, "has_heating", features["heating"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if features.get("heatingType"):
            self._set_field(result, "heating_type", features["heatingType"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if features.get("cooling") is not None:
            self._set_field(result, "has_cooling", features["cooling"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if features.get("coolingType"):
            self._set_field(result, "cooling_type", features["coolingType"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        # Other features - RentCast only
        if features.get("fireplace") is not None:
            self._set_field(result, "has_fireplace", features["fireplace"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if features.get("exteriorType"):
            self._set_field(result, "exterior_type", features["exteriorType"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if features.get("roofType"):
            self._set_field(result, "roof_type", features["roofType"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if features.get("viewType"):
            self._set_field(result, "view_type", features["viewType"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
    
    def _merge_valuations(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """
        Merge valuation data - CRITICAL FOR INVESTMENT ANALYSIS.
        
        Strategy:
        - Keep both Zestimate and RentCast AVM separately for comparison
        - Create merged "current_value_avm" as best estimate
        - Flag conflicts for investor review
        """
        avm = rc.get("avm", {}) or {}
        zl_prop = zl.get("property", {}) or {}
        
        rc_value = avm.get("price")
        zl_value = zl_prop.get("zestimate")
        
        # Store both individual values
        if rc_value:
            self._set_field(result, "rentcast_avm", float(rc_value),
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if zl_value:
            self._set_field(result, "zestimate", float(zl_value),
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
        
        # Create merged best estimate
        if rc_value or zl_value:
            value, source, conf, conflict, pct = self._merge_numeric(
                rc_value, zl_value, self.WEIGHTS["valuation"]
            )
            self._set_field(result, "current_value_avm", value,
                          source, conf, {"rentcast": rc_value, "zillow": zl_value},
                          conflict, pct)
        
        # Value ranges
        if avm.get("priceRangeLow"):
            self._set_field(result, "value_range_low", float(avm["priceRangeLow"]),
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if avm.get("priceRangeHigh"):
            self._set_field(result, "value_range_high", float(avm["priceRangeHigh"]),
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        # Last sale
        prop = rc.get("property", {})
        last_price = prop.get("lastSalePrice") or zl_prop.get("lastSoldPrice")
        if last_price:
            source = DataSource.RENTCAST if prop.get("lastSalePrice") else DataSource.ZILLOW
            self._set_field(result, "last_sale_price", float(last_price),
                          source, ConfidenceLevel.HIGH)
        
        last_date = prop.get("lastSaleDate") or zl_prop.get("lastSoldDate")
        if last_date:
            source = DataSource.RENTCAST if prop.get("lastSaleDate") else DataSource.ZILLOW
            if isinstance(last_date, str):
                try:
                    last_date = datetime.fromisoformat(last_date.replace("Z", "+00:00"))
                except:
                    pass
            self._set_field(result, "last_sale_date", last_date,
                          source, ConfidenceLevel.HIGH)
    
    def _merge_rental(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """
        Merge rental data - CRITICAL FOR CASH FLOW ANALYSIS.
        """
        rent = rc.get("rent", {}) or {}
        zl_prop = zl.get("property", {}) or {}
        zl_rent = zl.get("rent_estimate", {}) or {}
        
        rc_rent = rent.get("rent") if rent else None
        zl_rent_val = (zl_rent.get("rentZestimate") if zl_rent else None) or (zl_prop.get("rentZestimate") if zl_prop else None)
        
        # Store both individual values
        if rc_rent:
            self._set_field(result, "rentcast_rent", float(rc_rent),
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if zl_rent_val:
            self._set_field(result, "rent_zestimate", float(zl_rent_val),
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
        
        # Create merged best estimate
        if rc_rent or zl_rent_val:
            value, source, conf, conflict, pct = self._merge_numeric(
                rc_rent, zl_rent_val, self.WEIGHTS["rent"]
            )
            self._set_field(result, "monthly_rent_estimate", value,
                          source, conf, {"rentcast": rc_rent, "zillow": zl_rent_val},
                          conflict, pct)
        
        # Rent ranges (RentCast only)
        if rent.get("rentRangeLow"):
            self._set_field(result, "rent_range_low", float(rent["rentRangeLow"]),
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if rent.get("rentRangeHigh"):
            self._set_field(result, "rent_range_high", float(rent["rentRangeHigh"]),
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
    
    def _merge_tax(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """Merge tax data - RentCast primary."""
        prop = rc.get("property", {}) or {}
        tax_assessments = prop.get("taxAssessments", {}) or {}
        property_taxes = prop.get("propertyTaxes", {}) or {}
        
        # Get most recent year
        if tax_assessments:
            years = sorted(tax_assessments.keys(), reverse=True)
            if years:
                latest = tax_assessments[years[0]]
                self._set_field(result, "tax_year", latest.get("year"),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
                self._set_field(result, "tax_assessed_value", latest.get("value"),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
                if latest.get("land"):
                    self._set_field(result, "tax_assessed_land", latest["land"],
                                  DataSource.RENTCAST, ConfidenceLevel.HIGH)
                if latest.get("improvements"):
                    self._set_field(result, "tax_assessed_improvements", latest["improvements"],
                                  DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        if property_taxes:
            years = sorted(property_taxes.keys(), reverse=True)
            if years:
                latest = property_taxes[years[0]]
                self._set_field(result, "annual_property_tax", latest.get("total"),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
    
    def _merge_ownership(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """Merge ownership data - RentCast only."""
        prop = rc.get("property", {}) or {}
        owner = prop.get("owner", {}) or {}
        
        if owner.get("names"):
            names = owner["names"]
            if isinstance(names, list) and len(names) > 0:
                self._set_field(result, "owner_name", ", ".join(names),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        if owner.get("type"):
            self._set_field(result, "owner_type", owner["type"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        if prop.get("ownerOccupied") is not None:
            self._set_field(result, "owner_occupied", prop["ownerOccupied"],
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
    
    def _merge_scores(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """Merge walkability scores - Zillow primary."""
        scores = zl.get("accessibility_scores", {}) or {}
        zl_prop = zl.get("property", {}) or {}
        
        walk = scores.get("walkScore") or zl_prop.get("walkScore")
        transit = scores.get("transitScore") or zl_prop.get("transitScore")
        bike = scores.get("bikeScore") or zl_prop.get("bikeScore")
        
        if walk is not None:
            self._set_field(result, "walk_score", int(walk),
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
        if transit is not None:
            self._set_field(result, "transit_score", int(transit),
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
        if bike is not None:
            self._set_field(result, "bike_score", int(bike),
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
    
    def _merge_schools(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """Merge school data - Zillow primary."""
        schools = zl.get("schools", {}) or {}
        
        if isinstance(schools, list) and len(schools) > 0:
            ratings = [s.get("rating") for s in schools if s.get("rating")]
            if ratings:
                avg = sum(ratings) / len(ratings)
                self._set_field(result, "school_rating_avg", round(avg, 1),
                              DataSource.ZILLOW, ConfidenceLevel.HIGH)
            
            # Extract by level
            for school in schools:
                level = school.get("level", "").lower()
                rating = school.get("rating")
                if rating:
                    if "elementary" in level:
                        self._set_field(result, "elementary_school_rating", rating,
                                      DataSource.ZILLOW, ConfidenceLevel.HIGH)
                    elif "middle" in level:
                        self._set_field(result, "middle_school_rating", rating,
                                      DataSource.ZILLOW, ConfidenceLevel.HIGH)
                    elif "high" in level:
                        self._set_field(result, "high_school_rating", rating,
                                      DataSource.ZILLOW, ConfidenceLevel.HIGH)
    
    def _merge_market(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """
        Merge market statistics from RentCast saleData.
        
        Key metrics for buyer/seller market analysis:
        - Days on Market (avg, median, min, max) - Higher = buyer's market
        - Listing counts (new vs total) - Used to calculate absorption rate
        - Market temperature classification based on metrics
        """
        market = rc.get("market", {}) or {}
        sale_data = market.get("saleData", {}) or {}
        
        if sale_data:
            # Price metrics
            if sale_data.get("medianPrice"):
                self._set_field(result, "market_median_price", sale_data["medianPrice"],
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if sale_data.get("averagePricePerSquareFoot"):
                self._set_field(result, "market_avg_price_sqft",
                              sale_data["averagePricePerSquareFoot"],
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            
            # Days on Market metrics - KEY for negotiation leverage
            if sale_data.get("medianDaysOnMarket"):
                self._set_field(result, "market_days_on_market",
                              int(sale_data["medianDaysOnMarket"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if sale_data.get("averageDaysOnMarket"):
                self._set_field(result, "market_avg_days_on_market",
                              float(sale_data["averageDaysOnMarket"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if sale_data.get("minDaysOnMarket"):
                self._set_field(result, "market_min_days_on_market",
                              int(sale_data["minDaysOnMarket"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if sale_data.get("maxDaysOnMarket"):
                self._set_field(result, "market_max_days_on_market",
                              int(sale_data["maxDaysOnMarket"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            
            # Listing inventory metrics
            total_listings = sale_data.get("totalListings")
            new_listings = sale_data.get("newListings")
            
            if total_listings:
                self._set_field(result, "market_total_listings",
                              int(total_listings),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if new_listings is not None:
                self._set_field(result, "market_new_listings",
                              int(new_listings),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            
            # Calculate absorption rate (new listings / total listings)
            # Higher absorption rate = faster market (seller's market)
            if total_listings and total_listings > 0 and new_listings is not None:
                absorption_rate = round(new_listings / total_listings, 4)
                self._set_field(result, "market_absorption_rate",
                              absorption_rate,
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            
            # Calculate market temperature based on days on market
            # Hot market: < 30 days median (seller's market)
            # Warm market: 30-60 days median (balanced)
            # Cold market: > 60 days median (buyer's market - more negotiation power)
            median_dom = sale_data.get("medianDaysOnMarket")
            if median_dom is not None:  # Use 'is not None' to handle 0 as valid value
                if median_dom < 30:
                    market_temp = "hot"
                elif median_dom <= 60:
                    market_temp = "warm"
                else:
                    market_temp = "cold"
                self._set_field(result, "market_temperature",
                              market_temp,
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
    
    def _merge_rental_market(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """
        Merge rental market statistics and calculate proprietary IQ estimate.
        
        Key metrics for rental investment analysis:
        - IQ Estimate: Proprietary average of RentCast and Zillow estimates
        - Market-wide rental stats (avg, median, min, max rent)
        - Rental market velocity (days on market, listing counts)
        - Rent trend based on year-over-year comparison
        """
        # Get property-specific estimates from both sources
        rent = rc.get("rent", {}) or {}
        zl_prop = zl.get("property", {}) or {}
        zl_rent = zl.get("rent_estimate", {}) or {}
        
        # RentCast property-specific rent estimate
        rc_rent = rent.get("rent") if rent else None
        
        # Zillow rentZestimate (check both locations)
        zl_rent_val = (
            (zl_rent.get("rentZestimate") if zl_rent else None) or 
            (zl_prop.get("rentZestimate") if zl_prop else None)
        )
        
        # Store individual estimates
        if rc_rent:
            self._set_field(result, "rental_rentcast_estimate", float(rc_rent),
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        if zl_rent_val:
            self._set_field(result, "rental_zillow_estimate", float(zl_rent_val),
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
        
        # Calculate IQ proprietary estimate (average of both sources when available)
        if rc_rent and zl_rent_val:
            iq_estimate = (float(rc_rent) + float(zl_rent_val)) / 2
            self._set_field(result, "rental_iq_estimate", round(iq_estimate, 2),
                          DataSource.MERGED, ConfidenceLevel.HIGH)
        elif rc_rent:
            self._set_field(result, "rental_iq_estimate", float(rc_rent),
                          DataSource.RENTCAST, ConfidenceLevel.MEDIUM)
        elif zl_rent_val:
            self._set_field(result, "rental_iq_estimate", float(zl_rent_val),
                          DataSource.ZILLOW, ConfidenceLevel.MEDIUM)
        
        # Extract market-wide rental stats from rentalData
        market = rc.get("market", {}) or {}
        rental_data = market.get("rentalData", {}) or {}
        
        if rental_data:
            # Market-wide rent metrics
            if rental_data.get("averageRent"):
                self._set_field(result, "rental_market_avg",
                              float(rental_data["averageRent"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if rental_data.get("medianRent"):
                self._set_field(result, "rental_market_median",
                              float(rental_data["medianRent"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if rental_data.get("minRent"):
                self._set_field(result, "rental_market_min",
                              float(rental_data["minRent"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if rental_data.get("maxRent"):
                self._set_field(result, "rental_market_max",
                              float(rental_data["maxRent"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if rental_data.get("averageRentPerSquareFoot"):
                self._set_field(result, "rental_market_rent_per_sqft",
                              float(rental_data["averageRentPerSquareFoot"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            
            # Rental market velocity metrics
            if rental_data.get("medianDaysOnMarket") is not None:
                self._set_field(result, "rental_days_on_market",
                              int(rental_data["medianDaysOnMarket"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if rental_data.get("totalListings") is not None:
                self._set_field(result, "rental_total_listings",
                              int(rental_data["totalListings"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
            if rental_data.get("newListings") is not None:
                self._set_field(result, "rental_new_listings",
                              int(rental_data["newListings"]),
                              DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        # Calculate rent trend from AXESSO medianRentPriceOverTime if available
        zl_market = zl.get("market_data", {}) or {}
        rent_over_time = zl_market.get("medianRentPriceOverTime", {}) or {}
        
        if rent_over_time:
            current_year_data = rent_over_time.get("currentYear", [])
            prev_year_data = rent_over_time.get("prevYear", [])
            
            # Calculate average rent for each year
            if current_year_data and prev_year_data:
                current_prices = [m.get("price", 0) for m in current_year_data if m.get("price")]
                prev_prices = [m.get("price", 0) for m in prev_year_data if m.get("price")]
                
                if current_prices and prev_prices:
                    current_avg = sum(current_prices) / len(current_prices)
                    prev_avg = sum(prev_prices) / len(prev_prices)
                    
                    # Calculate YoY percentage change
                    if prev_avg > 0:
                        pct_change = (current_avg - prev_avg) / prev_avg
                        self._set_field(result, "rent_trend_pct", round(pct_change, 4),
                                      DataSource.ZILLOW, ConfidenceLevel.HIGH)
                        
                        # Determine trend direction (±2% threshold)
                        if pct_change > 0.02:
                            trend = "up"
                        elif pct_change < -0.02:
                            trend = "down"
                        else:
                            trend = "stable"
                        self._set_field(result, "rent_trend", trend,
                                      DataSource.ZILLOW, ConfidenceLevel.HIGH)
    
    def _merge_comps_counts(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """Count available comparables."""
        avm = rc.get("avm", {}) or {}
        rent = rc.get("rent", {}) or {}
        
        avm_comps = avm.get("comparables", [])
        if avm_comps:
            self._set_field(result, "sale_comps_count", len(avm_comps),
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        rent_comps = rent.get("comparables", [])
        if rent_comps:
            self._set_field(result, "rent_comps_count", len(rent_comps),
                          DataSource.RENTCAST, ConfidenceLevel.HIGH)
        
        # Zillow sold comps
        sold = zl.get("similar_sold", [])
        if sold and isinstance(sold, list):
            self._set_field(result, "sold_comps_count", len(sold),
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
    
    def _merge_listing_status(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """
        Merge listing status data - Zillow is primary source.
        
        This determines:
        - Whether to show "List Price", "Rental Price", or "Est. Value"
        - Seller type (Agent, FSBO, Foreclosure, Bank Owned, Auction)
        - Property availability status
        """
        zl_prop = zl.get("property", {}) or {}
        
        # Primary listing status from Zillow homeStatus field
        home_status = zl_prop.get("homeStatus")  # FOR_SALE, FOR_RENT, SOLD, OFF_MARKET, PENDING
        if home_status:
            self._set_field(result, "listing_status", home_status,
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
        
        # Extract listingSubType for seller type determination
        listing_sub_type = zl_prop.get("listingSubType", {}) or {}
        
        # Also check listing_sub_type (alternate format in API)
        listing_sub_type_alt = zl_prop.get("listing_sub_type", {}) or {}
        
        # Seller type flags - check both formats
        is_foreclosure = listing_sub_type.get("isForeclosure", False) or listing_sub_type_alt.get("is_foreclosure", False)
        is_bank_owned = listing_sub_type.get("isBankOwned", False) or listing_sub_type_alt.get("is_bankOwned", False)
        is_fsbo = listing_sub_type.get("isFSBO", False) or listing_sub_type_alt.get("is_FSBO", False)
        is_auction = listing_sub_type.get("isForAuction", False) or listing_sub_type_alt.get("is_forAuction", False)
        
        # Store individual flags
        result.is_foreclosure = is_foreclosure
        result.is_bank_owned = is_bank_owned
        result.is_fsbo = is_fsbo
        result.is_auction = is_auction
        
        # ========================================
        # EXTENDED FORECLOSURE/DISTRESS DATA
        # ========================================
        foreclosure_types = zl_prop.get("foreclosureTypes", {}) or {}
        
        # Check for pre-foreclosure specifically
        is_pre_foreclosure = foreclosure_types.get("isPreforeclosure", False)
        result.is_pre_foreclosure = is_pre_foreclosure
        
        # Also check isPreforeclosureAuction
        if zl_prop.get("isPreforeclosureAuction", False):
            result.is_pre_foreclosure = True
            result.is_auction = True
        
        # If any foreclosure type detected, ensure flags are set
        if foreclosure_types.get("isAnyForeclosure", False):
            if not result.is_foreclosure and not result.is_bank_owned:
                result.is_foreclosure = True
        
        if foreclosure_types.get("isBankOwned", False):
            result.is_bank_owned = True
        
        # ========================================
        # WITHDRAWN/EXPIRED STATUS
        # ========================================
        if home_status and "WITHDRAWN" in home_status.upper():
            result.is_withdrawn = True
        # Also check keystoneHomeStatus
        keystone_status = zl_prop.get("keystoneHomeStatus", "")
        if keystone_status and "Withdrawn" in keystone_status:
            result.is_withdrawn = True
        
        # Check for new construction
        reso_facts = zl_prop.get("resoFacts", {}) or {}
        is_new_construction = reso_facts.get("isNewConstruction", False)
        result.is_new_construction = is_new_construction
        
        # ========================================
        # NON-OWNER OCCUPIED (ABSENTEE)
        # ========================================
        is_non_owner_occupied = zl_prop.get("isNonOwnerOccupied")
        if is_non_owner_occupied is not None:
            result.is_non_owner_occupied = is_non_owner_occupied
        
        # Determine seller type string
        seller_type = "Agent"  # Default
        if result.is_pre_foreclosure:
            seller_type = "PreForeclosure"
        elif is_foreclosure:
            seller_type = "Foreclosure"
        elif is_bank_owned:
            seller_type = "BankOwned"
        elif is_fsbo:
            seller_type = "FSBO"
        elif is_auction:
            seller_type = "Auction"
        elif is_new_construction:
            seller_type = "NewConstruction"
        
        self._set_field(result, "seller_type", seller_type,
                      DataSource.ZILLOW, ConfidenceLevel.HIGH)
        
        # Determine if property is off-market
        is_off_market = home_status in [None, "SOLD", "OFF_MARKET", "RECENTLY_SOLD"] or \
                        keystone_status in ["RecentlySold", "OffMarket"]
        
        # PENDING is still technically listed
        if home_status == "PENDING":
            is_off_market = False
        
        result.is_off_market = is_off_market
        
        # List price - only set if actively listed
        price = zl_prop.get("price")
        if not is_off_market and home_status in ["FOR_SALE", "FOR_RENT", "PENDING"]:
            self._set_field(result, "list_price", price,
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
        
        # Days on market
        days_on_zillow = zl_prop.get("daysOnZillow")
        if days_on_zillow is not None:
            self._set_field(result, "days_on_market", days_on_zillow,
                          DataSource.ZILLOW, ConfidenceLevel.HIGH)
        
        time_on_zillow = zl_prop.get("timeOnZillow")
        if time_on_zillow:
            result.time_on_market = time_on_zillow
        
        # Date sold (if applicable)
        date_sold = zl_prop.get("dateSold")
        if date_sold:
            # Convert from timestamp if needed
            if isinstance(date_sold, (int, float)):
                try:
                    result.date_sold = datetime.fromtimestamp(date_sold / 1000).isoformat()
                except:
                    result.date_sold = str(date_sold)
            else:
                result.date_sold = str(date_sold)
        
        # Brokerage and agent info
        brokerage = zl_prop.get("brokerageName")
        if brokerage:
            result.brokerage_name = brokerage
        
        attribution = zl_prop.get("attributionInfo", {}) or {}
        agent_name = attribution.get("agentName")
        if agent_name:
            result.listing_agent_name = agent_name
        
        mls_id = attribution.get("mlsId")
        if mls_id:
            result.mls_id = mls_id
        
        # ========================================
        # PRICE HISTORY - Count reductions
        # ========================================
        price_history = zl_prop.get("priceHistory", []) or []
        if price_history:
            price_reductions = 0
            original_price = None
            current_price = None
            
            for event in price_history:
                event_type = (event.get("event") or "").lower()
                price_change_rate = event.get("priceChangeRate")
                event_price = event.get("price")
                
                # Track original listing price
                if "listed" in event_type and original_price is None:
                    original_price = event_price
                
                # Count price reductions
                if price_change_rate is not None and price_change_rate < 0:
                    price_reductions += 1
                    current_price = event_price
                elif "price change" in event_type or "reduced" in event_type:
                    price_reductions += 1
                    current_price = event_price
            
            result.price_reduction_count = price_reductions
            
            # Calculate total reduction percentage
            if original_price and current_price and original_price > 0:
                total_reduction_pct = ((original_price - current_price) / original_price) * 100
                if total_reduction_pct > 0:
                    result.total_price_reduction_pct = round(total_reduction_pct, 2)
        
        # ========================================
        # PROPERTY DESCRIPTION (for keyword analysis)
        # ========================================
        description = zl_prop.get("description")
        if description:
            result.property_description = description
        
        # ========================================
        # ENGAGEMENT METRICS
        # ========================================
        favorite_count = zl_prop.get("favoriteCount")
        if favorite_count is not None:
            result.favorite_count = favorite_count
        
        page_view_count = zl_prop.get("pageViewCount")
        if page_view_count is not None:
            result.page_view_count = page_view_count
        
        # ========================================
        # SELLING SOON PREDICTION
        # ========================================
        selling_soon = zl_prop.get("sellingSoon", [])
        if selling_soon and isinstance(selling_soon, list) and len(selling_soon) > 0:
            # Get the first prediction
            first_prediction = selling_soon[0]
            percentile = first_prediction.get("percentile")
            if percentile is not None:
                result.selling_soon_percentile = float(percentile)
    
    def _merge_owner_location(self, result: NormalizedProperty, rc: Dict, zl: Dict):
        """
        Extract owner mailing address state from RentCast for out-of-state detection.
        """
        prop = rc.get("property", {}) or {}
        owner = prop.get("owner", {}) or {}
        mailing_address = owner.get("mailingAddress", {}) or {}
        
        # Get owner's mailing state
        owner_state = mailing_address.get("state")
        if owner_state:
            result.owner_mailing_state = owner_state
    
    def _calculate_quality_score(self, result: NormalizedProperty):
        """Calculate overall data quality score."""
        critical_fields = [
            "formatted_address", "property_type", "bedrooms", "bathrooms",
            "square_footage", "current_value_avm", "monthly_rent_estimate",
            "annual_property_tax", "last_sale_price"
        ]
        
        important_fields = [
            "year_built", "lot_size", "value_range_low", "value_range_high",
            "rent_range_low", "rent_range_high", "tax_assessed_value"
        ]
        
        nice_to_have = [
            "walk_score", "school_rating_avg", "has_pool", "has_garage",
            "owner_name", "market_median_price"
        ]
        
        critical_present = sum(1 for f in critical_fields if getattr(result, f) is not None)
        important_present = sum(1 for f in important_fields if getattr(result, f) is not None)
        nice_present = sum(1 for f in nice_to_have if getattr(result, f) is not None)
        
        # Weighted score
        score = (
            (critical_present / len(critical_fields)) * 60 +
            (important_present / len(important_fields)) * 30 +
            (nice_present / len(nice_to_have)) * 10
        )
        
        # Penalty for conflicts
        conflict_penalty = len(result.conflict_fields) * 2
        score = max(0, score - conflict_penalty)
        
        result.data_quality_score = round(score, 1)
        
        # Track missing critical fields
        result.missing_fields = [f for f in critical_fields if getattr(result, f) is None]


def create_normalizer() -> DealGapIQNormalizer:
    """Factory function for normalizer."""
    return DealGapIQNormalizer()

