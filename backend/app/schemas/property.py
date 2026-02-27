"""
Pydantic schemas for API request/response validation.

NOTE: Default values are imported from app.core.defaults.
Do NOT hardcode default values in this file.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

# Import centralized defaults - SINGLE SOURCE OF TRUTH
from app.core.defaults import BRRRR, FINANCING, FLIP, GROWTH, HOUSE_HACK, OPERATING, REHAB, STR, WHOLESALE

# ============================================
# ENUMS
# ============================================


class PropertyType(StrEnum):
    SINGLE_FAMILY = "Single Family"
    CONDO = "Condo"
    TOWNHOUSE = "Townhouse"
    MULTI_FAMILY = "Multi-Family"
    APARTMENT = "Apartment"
    MOBILE_HOME = "Mobile Home"
    LAND = "Land"
    OTHER = "Other"


class DataSource(StrEnum):
    RENTCAST = "rentcast"
    AXESSO = "axesso"
    MERGED = "merged"
    ASSUMPTION = "assumption"
    USER_OVERRIDE = "user_override"
    MISSING = "missing"


class Confidence(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RiskLevel(StrEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class StrategyType(StrEnum):
    LONG_TERM_RENTAL = "ltr"
    SHORT_TERM_RENTAL = "str"
    BRRRR = "brrrr"
    FIX_AND_FLIP = "flip"
    HOUSE_HACK = "house_hack"
    WHOLESALE = "wholesale"


class ListingStatus(StrEnum):
    """Property listing status from Zillow homeStatus field."""

    FOR_SALE = "FOR_SALE"
    FOR_RENT = "FOR_RENT"
    OFF_MARKET = "OFF_MARKET"
    SOLD = "SOLD"
    PENDING = "PENDING"
    OTHER = "OTHER"


class SellerType(StrEnum):
    """Type of seller/listing source derived from listingSubType fields."""

    AGENT = "Agent"  # Listed by agent (isFSBA = true or default)
    FSBO = "FSBO"  # For Sale By Owner (isFSBO = true)
    FORECLOSURE = "Foreclosure"  # Bank foreclosure (isForeclosure = true)
    BANK_OWNED = "BankOwned"  # REO/Bank owned (isBankOwned = true)
    AUCTION = "Auction"  # Auction listing (isForAuction = true)
    NEW_CONSTRUCTION = "NewConstruction"  # New construction
    UNKNOWN = "Unknown"  # Unknown or not specified


# ============================================
# PROVENANCE
# ============================================


class FieldProvenance(BaseModel):
    """Tracks the origin and confidence of each data field."""

    source: str  # Changed to str to accept string values from normalizer
    fetched_at: str  # Changed to str to accept ISO format strings
    confidence: str  # Changed to str to accept string values
    raw_values: dict[str, Any] | None = None
    conflict_flag: bool = False


class ProvenanceMap(BaseModel):
    """Maps field names to their provenance data."""

    fields: dict[str, FieldProvenance] = {}


# ============================================
# PROPERTY DATA
# ============================================


class Address(BaseModel):
    """Standardized address structure."""

    street: str
    city: str
    state: str
    zip_code: str
    county: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    full_address: str


class PropertyDetails(BaseModel):
    """Core property details from API data."""

    property_type: str | None = None  # Changed from PropertyType enum for API flexibility
    bedrooms: int | None = None
    bathrooms: float | None = None
    square_footage: int | None = None
    lot_size: int | None = None
    year_built: int | None = None
    num_units: int | None = 1
    stories: int | None = None
    features: list[str] | None = []
    # HVAC
    heating_type: str | None = None
    cooling_type: str | None = None
    has_heating: bool | None = None
    has_cooling: bool | None = None
    # Parking
    has_garage: bool | None = None
    garage_spaces: int | None = None
    parking_type: str | None = None
    # Construction
    exterior_type: str | None = None
    roof_type: str | None = None
    foundation_type: str | None = None
    # Fireplace
    has_fireplace: bool | None = None
    fireplace_count: int | None = None
    # Pool
    has_pool: bool | None = None
    # View
    view_type: str | None = None

    @field_validator(
        "square_footage",
        "lot_size",
        "bedrooms",
        "year_built",
        "num_units",
        "stories",
        "garage_spaces",
        "fireplace_count",
        mode="before",
    )
    @classmethod
    def convert_float_to_int(cls, v):
        """Convert float values to int (API sometimes returns floats for int fields)."""
        if v is None:
            return None
        if isinstance(v, float):
            return round(v)
        return v


class ValuationData(BaseModel):
    """Property valuation information."""

    current_value_avm: float | None = None
    value_iq_estimate: float | None = None
    rentcast_avm: float | None = None
    value_range_low: float | None = None
    value_range_high: float | None = None
    price_confidence: Confidence | None = None
    price_per_sqft: float | None = None
    tax_assessed_value: float | None = None
    tax_assessment_year: int | None = None
    last_sale_price: float | None = None
    last_sale_date: str | None = None
    arv: float | None = None
    arv_flip: float | None = None
    zestimate: float | None = None
    zestimate_high_pct: float | None = None
    zestimate_low_pct: float | None = None
    redfin_estimate: float | None = None
    market_price: float | None = None


class RentTrend(StrEnum):
    """Rental market trend indicator."""

    UP = "up"  # Rents increasing year-over-year
    DOWN = "down"  # Rents decreasing year-over-year
    STABLE = "stable"  # Rents relatively flat (within +/- 2%)


class RentalMarketStatistics(BaseModel):
    """
    Rental market statistics for investment analysis.

    Provides comprehensive rental data including:
    - Property-specific estimates from multiple sources
    - Market-wide rental statistics
    - Trend indicators for rental market direction
    """

    # Property-specific estimates (null = unavailable, never fabricated)
    rentcast_estimate: float | None = None  # RentCast rent estimate
    zillow_estimate: float | None = None  # Zillow rentZestimate
    redfin_estimate: float | None = None  # Redfin rental estimate
    iq_estimate: float | None = None  # DealGapIQ: avg of available sources

    # Estimate range (from RentCast)
    estimate_low: float | None = None
    estimate_high: float | None = None

    # Market-wide rental stats (from RentCast rentalData)
    market_avg_rent: float | None = None
    market_median_rent: float | None = None
    market_min_rent: float | None = None
    market_max_rent: float | None = None
    market_rent_per_sqft: float | None = None

    # Rental market velocity
    rental_days_on_market: int | None = None
    rental_total_listings: int | None = None
    rental_new_listings: int | None = None

    # Trend indicator
    rent_trend: str | None = None  # "up", "down", "stable"
    trend_pct_change: float | None = None  # Year-over-year % change


class RentalData(BaseModel):
    """Rental income data for LTR and STR."""

    monthly_rent_ltr: float | None = None
    rent_range_low: float | None = None
    rent_range_high: float | None = None
    rent_confidence: Confidence | None = None
    average_daily_rate: float | None = None
    occupancy_rate: float | None = None
    rent_per_sqft: float | None = None
    # Raw Zillow rental data
    average_rent: float | None = None
    # Comprehensive rental market statistics
    rental_stats: RentalMarketStatistics | None = None


class MarketTemperature(StrEnum):
    """Market temperature classification for buyer/seller analysis."""

    HOT = "hot"  # Seller's market - low days on market, high absorption
    WARM = "warm"  # Balanced market
    COLD = "cold"  # Buyer's market - high days on market, low absorption


class MarketStatistics(BaseModel):
    """
    Market health indicators for investment analysis.

    These metrics help determine:
    - Is it a buyer's or seller's market?
    - How much negotiation leverage does an investor have?
    - How quickly will a flip sell?
    """

    # Days on Market metrics - key indicator of market velocity
    median_days_on_market: int | None = None
    avg_days_on_market: float | None = None
    min_days_on_market: int | None = None
    max_days_on_market: int | None = None

    # Listing inventory metrics
    total_listings: int | None = None
    new_listings: int | None = None

    # Calculated metrics
    absorption_rate: float | None = None  # new_listings / total_listings (higher = faster market)
    market_temperature: str | None = None  # "hot", "warm", "cold"

    # Price metrics
    median_price: float | None = None
    avg_price_per_sqft: float | None = None


class MarketData(BaseModel):
    """Local market indicators."""

    market_health_score: int | None = None
    market_strength: str | None = None
    property_taxes_annual: float | None = None
    hoa_fees_monthly: float | None = None
    # Mortgage rate data for frontend calculations
    mortgage_rate_arm5: float | None = None
    mortgage_rate_30yr: float | None = None
    # Market statistics for buyer/seller analysis
    market_stats: MarketStatistics | None = None


class DataQuality(BaseModel):
    """Data quality indicators."""

    completeness_score: float = Field(ge=0, le=100)
    missing_fields: list[str] = []
    stale_fields: list[str] = []
    conflict_fields: list[str] = []


class ListingInfo(BaseModel):
    """
    Listing status information for property display.

    This determines whether to show:
    - "List Price" (FOR_SALE, active listing)
    - "Rental Price" (FOR_RENT)
    - "Est. Value" (OFF_MARKET, SOLD)
    """

    # Primary listing status
    listing_status: str | None = None  # FOR_SALE, FOR_RENT, OFF_MARKET, SOLD, PENDING

    # Is property currently off-market (not actively listed)
    is_off_market: bool | None = True

    # Seller/listing type indicators
    seller_type: str | None = None  # Agent, FSBO, Foreclosure, BankOwned, Auction
    is_foreclosure: bool | None = False
    is_bank_owned: bool | None = False
    is_fsbo: bool | None = False
    is_auction: bool | None = False
    is_new_construction: bool | None = False

    # Pricing - only set if property is actively listed
    list_price: float | None = None  # Actual asking price if listed

    # Time on market
    days_on_market: int | None = None
    time_on_market: str | None = None  # e.g., "45 days"

    # Last sale info (for sold/off-market properties)
    last_sold_price: float | None = None
    date_sold: str | None = None

    # Listing agent/brokerage
    brokerage_name: str | None = None
    listing_agent_name: str | None = None
    mls_id: str | None = None


# ============================================
# SELLER MOTIVATION INDICATORS
# ============================================


class MotivationSignalStrength(StrEnum):
    """Signal strength for seller motivation indicators."""

    HIGH = "high"  # Strong indicator of motivated seller
    MEDIUM_HIGH = "medium-high"
    MEDIUM = "medium"
    LOW = "low"  # Weak indicator or counter-indicator


class SellerMotivationIndicator(BaseModel):
    """
    Individual seller motivation indicator with score and metadata.

    Each indicator represents a signal that may indicate seller motivation
    to accept below-market offers.
    """

    name: str  # e.g., "Days on Market"
    detected: bool = False  # Whether this indicator is present
    score: int = 0  # Individual score (0-100)
    signal_strength: MotivationSignalStrength = MotivationSignalStrength.LOW
    weight: float = 1.0  # Weight in composite calculation
    description: str = ""  # Human-readable explanation
    raw_value: Any | None = None  # Raw data value (e.g., 145 days)
    source: str | None = None  # Data source (AXESSO, RentCast)


class SellerMotivationScore(BaseModel):
    """
    Comprehensive seller motivation analysis for a property.

    The Seller Motivation Score helps investors identify properties where
    sellers may be more willing to negotiate, accept lower offers, or
    close quickly.

    Score ranges:
    - 80-100: Very High Motivation (excellent negotiation leverage)
    - 60-79: High Motivation (strong leverage)
    - 40-59: Moderate Motivation (some leverage)
    - 20-39: Low Motivation (limited leverage)
    - 0-19: Very Low Motivation (minimal leverage expected)
    """

    # Composite score
    score: int = 0  # Weighted composite score (0-100)
    grade: str = "C"  # Letter grade (A+, A, B, C, D, F)
    label: str = "Unknown"  # Human-readable label
    color: str = "#9ca3af"  # UI color for display

    # Individual indicators
    indicators: list[SellerMotivationIndicator] = []

    # Summary counts
    high_signals_count: int = 0  # Count of HIGH strength signals detected
    total_signals_detected: int = 0  # Total indicators that are detected=True

    # Key insights for negotiation
    negotiation_leverage: str = "unknown"  # high, medium, low, unknown
    recommended_discount_range: str = "0-5%"  # Suggested starting discount
    key_leverage_points: list[str] = []  # Top 3 leverage points for negotiation

    # Market context (if available)
    dom_vs_market_avg: float | None = None  # Property DOM / Market median DOM
    market_temperature: str | None = None  # hot, warm, cold

    # Metadata
    data_completeness: float = 0.0  # % of indicators with data
    calculated_at: str | None = None


# ============================================
# ASSUMPTIONS
# ============================================


class FinancingAssumptions(BaseModel):
    """Loan and financing assumptions."""

    purchase_price: float | None = None
    down_payment_pct: float = Field(default_factory=lambda: FINANCING.down_payment_pct)
    interest_rate: float = Field(default_factory=lambda: FINANCING.interest_rate)
    loan_term_years: int = Field(default_factory=lambda: FINANCING.loan_term_years)
    closing_costs_pct: float = Field(default_factory=lambda: FINANCING.closing_costs_pct)
    loan_origination_points: float = 0.0
    pmi_rate: float = 0.0085  # If down payment < 20%


class OperatingAssumptions(BaseModel):
    """Operating expense assumptions."""

    vacancy_rate: float = Field(default_factory=lambda: OPERATING.vacancy_rate)
    property_management_pct: float = Field(default_factory=lambda: OPERATING.property_management_pct)
    maintenance_pct: float = Field(default_factory=lambda: OPERATING.maintenance_pct)
    capex_pct: float = Field(default_factory=lambda: OPERATING.capex_pct)
    insurance_pct: float = Field(default_factory=lambda: OPERATING.insurance_pct)
    insurance_annual: float | None = None  # Calculated from insurance_pct if not provided
    utilities_monthly: float = Field(default_factory=lambda: OPERATING.utilities_monthly)
    landscaping_annual: float = Field(default_factory=lambda: OPERATING.landscaping_annual)
    pest_control_annual: float = Field(default_factory=lambda: OPERATING.pest_control_annual)
    other_expenses_annual: float = 0.0


class STRAssumptions(BaseModel):
    """Short-term rental specific assumptions."""

    platform_fees_pct: float = Field(default_factory=lambda: STR.platform_fees_pct)
    str_management_pct: float = Field(default_factory=lambda: STR.str_management_pct)
    cleaning_cost_per_turnover: float = Field(default_factory=lambda: STR.cleaning_cost_per_turnover)
    cleaning_fee_revenue: float = Field(default_factory=lambda: STR.cleaning_fee_revenue)
    avg_length_of_stay_days: int = Field(default_factory=lambda: STR.avg_length_of_stay_days)
    supplies_monthly: float = Field(default_factory=lambda: STR.supplies_monthly)
    additional_utilities_monthly: float = Field(default_factory=lambda: STR.additional_utilities_monthly)
    furniture_setup_cost: float = Field(default_factory=lambda: STR.furniture_setup_cost)
    str_insurance_pct: float = Field(default_factory=lambda: STR.str_insurance_pct)
    str_insurance_annual: float | None = None  # Calculated from str_insurance_pct if not provided
    buy_discount_pct: float = Field(default_factory=lambda: BRRRR.buy_discount_pct)


class RehabAssumptions(BaseModel):
    """Renovation and rehab assumptions."""

    renovation_budget_pct: float = Field(default_factory=lambda: REHAB.renovation_budget_pct)
    renovation_budget: float | None = None  # Calculated from renovation_budget_pct if not provided
    contingency_pct: float = Field(default_factory=lambda: REHAB.contingency_pct)
    holding_period_months: int = Field(default_factory=lambda: REHAB.holding_period_months)
    holding_costs_pct: float = Field(default_factory=lambda: REHAB.holding_costs_pct)
    monthly_holding_costs: float | None = None  # Calculated from holding_costs_pct if not provided


class BRRRRAssumptions(BaseModel):
    """BRRRR-specific assumptions."""

    buy_discount_pct: float = Field(default_factory=lambda: BRRRR.buy_discount_pct)
    purchase_discount_pct: float | None = None  # Deprecated, use buy_discount_pct
    refinance_ltv: float = Field(default_factory=lambda: BRRRR.refinance_ltv)
    refinance_interest_rate: float = Field(default_factory=lambda: BRRRR.refinance_interest_rate)
    refinance_term_years: int = Field(default_factory=lambda: BRRRR.refinance_term_years)
    refinance_closing_costs_pct: float = Field(default_factory=lambda: BRRRR.refinance_closing_costs_pct)
    refinance_closing_costs: float | None = None  # Calculated from refinance_closing_costs_pct if not provided
    post_rehab_rent_increase_pct: float = Field(default_factory=lambda: BRRRR.post_rehab_rent_increase_pct)


class FlipAssumptions(BaseModel):
    """Fix & Flip specific assumptions."""

    hard_money_ltv: float = Field(default_factory=lambda: FLIP.hard_money_ltv)
    hard_money_rate: float = Field(default_factory=lambda: FLIP.hard_money_rate)
    selling_costs_pct: float = Field(default_factory=lambda: FLIP.selling_costs_pct)
    holding_period_months: int = Field(default_factory=lambda: FLIP.holding_period_months)
    purchase_discount_pct: float = Field(default_factory=lambda: FLIP.purchase_discount_pct)


class HouseHackAssumptions(BaseModel):
    """House hacking specific assumptions."""

    fha_down_payment_pct: float = Field(default_factory=lambda: HOUSE_HACK.fha_down_payment_pct)
    fha_interest_rate: float = Field(default_factory=lambda: HOUSE_HACK.fha_interest_rate)
    fha_mip_rate: float = Field(default_factory=lambda: HOUSE_HACK.fha_mip_rate)
    units_rented_out: int = Field(default_factory=lambda: HOUSE_HACK.units_rented_out)
    buy_discount_pct: float = Field(default_factory=lambda: HOUSE_HACK.buy_discount_pct)
    room_rent_monthly: float | None = None  # Now calculated dynamically
    owner_unit_market_rent: float | None = None  # Now calculated dynamically


class WholesaleAssumptions(BaseModel):
    """Wholesale deal assumptions."""

    assignment_fee: float = Field(default_factory=lambda: WHOLESALE.assignment_fee)
    marketing_costs: float = Field(default_factory=lambda: WHOLESALE.marketing_costs)
    earnest_money_deposit: float = Field(default_factory=lambda: WHOLESALE.earnest_money_deposit)
    days_to_close: int = Field(default_factory=lambda: WHOLESALE.days_to_close)
    target_purchase_discount_pct: float = Field(default_factory=lambda: WHOLESALE.target_purchase_discount_pct)


class LTRAssumptions(BaseModel):
    """Long-term rental specific assumptions."""

    buy_discount_pct: float = Field(default_factory=lambda: BRRRR.buy_discount_pct)


class AllAssumptions(BaseModel):
    """Combined assumptions for all strategies."""

    financing: FinancingAssumptions = Field(default_factory=FinancingAssumptions)
    operating: OperatingAssumptions = Field(default_factory=OperatingAssumptions)
    ltr: LTRAssumptions = Field(default_factory=LTRAssumptions)
    str_assumptions: STRAssumptions = Field(default_factory=STRAssumptions, alias="str")
    rehab: RehabAssumptions = Field(default_factory=RehabAssumptions)
    brrrr: BRRRRAssumptions = Field(default_factory=BRRRRAssumptions)
    flip: FlipAssumptions = Field(default_factory=FlipAssumptions)
    house_hack: HouseHackAssumptions = Field(default_factory=HouseHackAssumptions)
    wholesale: WholesaleAssumptions = Field(default_factory=WholesaleAssumptions)

    # General - use centralized defaults
    appreciation_rate: float = Field(default_factory=lambda: GROWTH.appreciation_rate)
    rent_growth_rate: float = Field(default_factory=lambda: GROWTH.rent_growth_rate)
    expense_growth_rate: float = Field(default_factory=lambda: GROWTH.expense_growth_rate)

    model_config = {"populate_by_name": True}


# ============================================
# CALCULATION RESULTS
# ============================================


class LTRResults(BaseModel):
    """Long-term rental calculation results."""

    # Income
    monthly_rent: float
    annual_gross_rent: float
    vacancy_loss: float
    effective_gross_income: float

    # Expenses
    property_taxes: float
    insurance: float
    property_management: float
    maintenance: float
    utilities: float
    landscaping: float
    pest_control: float
    hoa_fees: float
    total_operating_expenses: float

    # Financing
    loan_amount: float
    monthly_pi: float
    annual_debt_service: float

    # Key Metrics
    noi: float
    monthly_cash_flow: float
    annual_cash_flow: float
    cap_rate: float
    cash_on_cash_return: float
    dscr: float
    grm: float
    one_percent_rule: float

    # Investment Summary
    total_cash_required: float
    down_payment: float
    closing_costs: float

    # 10 Year Projection
    ten_year_projection: list[dict[str, float]] | None = None


class STRResults(BaseModel):
    """Short-term rental calculation results."""

    # Revenue
    average_daily_rate: float
    occupancy_rate: float
    nights_occupied: float
    num_bookings: float
    rental_revenue: float
    cleaning_fee_revenue: float
    total_gross_revenue: float

    # Expenses
    property_taxes: float
    insurance: float
    platform_fees: float
    str_management: float
    cleaning_costs: float
    supplies: float
    utilities: float
    maintenance: float
    landscaping: float
    pest_control: float
    total_operating_expenses: float

    # Financing
    loan_amount: float
    monthly_pi: float
    annual_debt_service: float

    # Key Metrics
    noi: float
    monthly_cash_flow: float
    annual_cash_flow: float
    cap_rate: float
    cash_on_cash_return: float
    dscr: float
    revenue_per_available_night: float
    break_even_occupancy: float

    # Investment Summary
    total_cash_required: float
    down_payment: float
    closing_costs: float
    furniture_setup: float

    # Seasonality
    seasonality_analysis: list[dict[str, Any]] | None = None


class BRRRRResults(BaseModel):
    """BRRRR strategy calculation results."""

    # Phase 1: Buy
    purchase_price: float
    down_payment: float
    closing_costs: float
    initial_loan_amount: float
    cash_required_phase1: float

    # Phase 2: Rehab
    renovation_budget: float
    contingency: float
    holding_costs: float
    cash_required_phase2: float

    # Phase 3: Rent
    arv: float
    post_rehab_monthly_rent: float
    annual_gross_rent: float
    estimated_cap_rate: float

    # Phase 4: Refinance
    refinance_loan_amount: float
    refinance_costs: float
    original_loan_payoff: float
    cash_out_at_refinance: float
    new_monthly_pi: float

    # Phase 5: Repeat
    total_cash_invested: float
    capital_recycled_pct: float
    cash_left_in_deal: float
    equity_position: float
    equity_pct: float

    # Post-Refinance Metrics
    post_refi_annual_cash_flow: float
    post_refi_monthly_cash_flow: float
    post_refi_cash_on_cash: float
    infinite_roi_achieved: bool

    # Timeline
    total_months_to_repeat: int


class FlipResults(BaseModel):
    """Fix & Flip calculation results."""

    # Acquisition
    purchase_price: float
    hard_money_loan: float
    down_payment: float
    closing_costs: float
    inspection_costs: float
    total_acquisition_cash: float

    # Renovation
    renovation_budget: float
    contingency: float
    total_renovation: float

    # Holding Costs
    hard_money_interest: float
    property_taxes: float
    insurance: float
    utilities: float
    security_maintenance: float
    total_holding_costs: float

    # Sale
    arv: float
    realtor_commission: float
    seller_closing_costs: float
    total_selling_costs: float
    net_sale_proceeds: float

    # Profit Analysis
    total_project_cost: float
    gross_profit: float
    net_profit_before_tax: float
    capital_gains_tax: float
    net_profit_after_tax: float

    # Key Metrics
    roi: float
    annualized_roi: float
    profit_margin: float
    total_cash_required: float

    # 70% Rule Check
    seventy_pct_max_price: float
    meets_70_rule: bool

    # Breakeven sale price (minimum to cover all project costs after selling costs)
    minimum_sale_for_breakeven: float


class HouseHackResults(BaseModel):
    """House hacking calculation results."""

    # Acquisition (FHA)
    purchase_price: float
    down_payment: float
    closing_costs: float
    loan_amount: float
    total_cash_required: float

    # Monthly Costs
    monthly_pi: float
    monthly_mip: float
    monthly_piti: float

    # Scenario A: Rent Rooms
    rooms_rented: int
    room_rent: float
    total_monthly_income: float
    utilities_shared: float
    maintenance: float
    total_monthly_expenses: float
    net_housing_cost_scenario_a: float
    savings_vs_renting_a: float
    annual_savings_a: float

    # Scenario B: Duplex Conversion
    conversion_cost: float | None = None
    unit2_rent: float | None = None
    heloc_payment: float | None = None
    net_housing_cost_scenario_b: float | None = None
    savings_vs_renting_b: float | None = None

    # Key Metrics
    housing_cost_offset_pct: float
    live_free_threshold: float
    roi_on_savings: float


class WholesaleResults(BaseModel):
    """Wholesale deal calculation results."""

    # Deal Structure
    contract_price: float
    earnest_money: float
    assignment_fee: float
    end_buyer_price: float

    # Costs
    marketing_costs: float
    total_cash_at_risk: float

    # Profit
    gross_profit: float
    net_profit: float

    # Key Metrics
    roi: float
    annualized_roi: float
    effective_hourly_rate: float
    time_investment_hours: float

    # Deal Analysis
    arv: float
    estimated_rehab: float
    seventy_pct_max_offer: float
    spread_available: float
    deal_viability: str  # "Strong", "Moderate", "Tight", "Not Viable"

    # Income Projections
    deals_needed_50k: float
    deals_needed_100k: float

    # Timeline
    timeline_days: int

    # Breakeven
    breakeven_assignment_fee: float


class StrategyComparison(BaseModel):
    """Side-by-side comparison of all strategies."""

    property_id: str
    strategies: dict[StrategyType, dict[str, Any]]

    # Rankings
    best_cash_flow: StrategyType
    best_roi: StrategyType
    lowest_capital: StrategyType
    lowest_risk: StrategyType

    # Recommendations
    recommendations: list[dict[str, str]]


# ============================================
# API REQUESTS / RESPONSES
# ============================================


class PropertySearchRequest(BaseModel):
    """Request to search for a property."""

    address: str
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None


class PropertyResponse(BaseModel):
    """Full property data response."""

    property_id: str
    zpid: str | None = None  # Zillow Property ID for photos API
    address: Address
    details: PropertyDetails
    valuations: ValuationData
    rentals: RentalData
    market: MarketData
    listing: ListingInfo | None = None  # Listing status, seller type, price display info
    seller_motivation: SellerMotivationScore | None = None  # Seller motivation analysis
    provenance: ProvenanceMap
    data_quality: DataQuality
    fetched_at: datetime


class AnalyticsRequest(BaseModel):
    """Request to calculate analytics."""

    property_id: str
    assumptions: AllAssumptions = Field(default_factory=AllAssumptions)
    strategies: list[StrategyType] | None = None  # None = all strategies


class AnalyticsResponse(BaseModel):
    """Full analytics response for all strategies."""

    property_id: str
    assumptions_hash: str
    calculated_at: datetime

    ltr: LTRResults | None = None
    str_results: STRResults | None = Field(default=None, alias="str")
    brrrr: BRRRRResults | None = None
    flip: FlipResults | None = None
    house_hack: HouseHackResults | None = None
    wholesale: WholesaleResults | None = None

    comparison: StrategyComparison | None = None

    model_config = {"populate_by_name": True}


class SensitivityRequest(BaseModel):
    """Request for sensitivity analysis."""

    property_id: str
    assumptions: AllAssumptions
    variable: str  # e.g., "purchase_price", "interest_rate", "occupancy"
    range_pct: list[float] = [-0.10, -0.05, 0, 0.05, 0.10]
    strategies: list[StrategyType] | None = None


class SensitivityResponse(BaseModel):
    """Sensitivity analysis results."""

    property_id: str
    variable: str
    baseline_value: float
    results: list[dict[str, Any]]


class ExportRequest(BaseModel):
    """Request to export analysis."""

    property_id: str
    format: Literal["pdf", "xlsx", "csv"]
    strategies: list[StrategyType] | None = None
    include_sensitivity: bool = False


class ExportResponse(BaseModel):
    """Export generation response."""

    export_id: str
    download_url: str
    expires_at: datetime
