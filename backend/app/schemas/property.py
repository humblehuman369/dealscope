"""
Pydantic schemas for API request/response validation.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


# ============================================
# ENUMS
# ============================================

class PropertyType(str, Enum):
    SINGLE_FAMILY = "Single Family"
    CONDO = "Condo"
    TOWNHOUSE = "Townhouse"
    MULTI_FAMILY = "Multi-Family"
    APARTMENT = "Apartment"
    MOBILE_HOME = "Mobile Home"
    LAND = "Land"
    OTHER = "Other"


class DataSource(str, Enum):
    RENTCAST = "rentcast"
    AXESSO = "axesso"
    MERGED = "merged"
    ASSUMPTION = "assumption"
    USER_OVERRIDE = "user_override"
    MISSING = "missing"


class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class StrategyType(str, Enum):
    LONG_TERM_RENTAL = "ltr"
    SHORT_TERM_RENTAL = "str"
    BRRRR = "brrrr"
    FIX_AND_FLIP = "flip"
    HOUSE_HACK = "house_hack"
    WHOLESALE = "wholesale"


# ============================================
# PROVENANCE
# ============================================

class FieldProvenance(BaseModel):
    """Tracks the origin and confidence of each data field."""
    source: str  # Changed to str to accept string values from normalizer
    fetched_at: str  # Changed to str to accept ISO format strings
    confidence: str  # Changed to str to accept string values
    raw_values: Optional[Dict[str, Any]] = None
    conflict_flag: bool = False


class ProvenanceMap(BaseModel):
    """Maps field names to their provenance data."""
    fields: Dict[str, FieldProvenance] = {}


# ============================================
# PROPERTY DATA
# ============================================

class Address(BaseModel):
    """Standardized address structure."""
    street: str
    city: str
    state: str
    zip_code: str
    county: Optional[str] = None
    full_address: str


class PropertyDetails(BaseModel):
    """Core property details from API data."""
    property_type: Optional[str] = None  # Changed from PropertyType enum for API flexibility
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_footage: Optional[int] = None
    lot_size: Optional[int] = None
    year_built: Optional[int] = None
    num_units: Optional[int] = 1
    stories: Optional[int] = None
    features: Optional[List[str]] = []
    # HVAC
    heating_type: Optional[str] = None
    cooling_type: Optional[str] = None
    has_heating: Optional[bool] = None
    has_cooling: Optional[bool] = None
    # Parking
    has_garage: Optional[bool] = None
    garage_spaces: Optional[int] = None
    parking_type: Optional[str] = None
    # Construction
    exterior_type: Optional[str] = None
    roof_type: Optional[str] = None
    foundation_type: Optional[str] = None
    # Fireplace
    has_fireplace: Optional[bool] = None
    fireplace_count: Optional[int] = None
    # Pool
    has_pool: Optional[bool] = None
    # View
    view_type: Optional[str] = None
    
    @field_validator('square_footage', 'lot_size', 'bedrooms', 'year_built', 'num_units', 'stories', 'garage_spaces', 'fireplace_count', mode='before')
    @classmethod
    def convert_float_to_int(cls, v):
        """Convert float values to int (API sometimes returns floats for int fields)."""
        if v is None:
            return None
        if isinstance(v, float):
            return int(round(v))
        return v


class ValuationData(BaseModel):
    """Property valuation information."""
    current_value_avm: Optional[float] = None
    value_range_low: Optional[float] = None
    value_range_high: Optional[float] = None
    price_confidence: Optional[Confidence] = None
    price_per_sqft: Optional[float] = None
    tax_assessed_value: Optional[float] = None
    tax_assessment_year: Optional[int] = None
    last_sale_price: Optional[float] = None
    last_sale_date: Optional[str] = None
    arv: Optional[float] = None
    arv_flip: Optional[float] = None
    # Raw Zestimate data for frontend calculations
    zestimate: Optional[float] = None
    zestimate_high_pct: Optional[float] = None
    zestimate_low_pct: Optional[float] = None


class RentalData(BaseModel):
    """Rental income data for LTR and STR."""
    monthly_rent_ltr: Optional[float] = None
    rent_range_low: Optional[float] = None
    rent_range_high: Optional[float] = None
    rent_confidence: Optional[Confidence] = None
    average_daily_rate: Optional[float] = None
    occupancy_rate: Optional[float] = None
    rent_per_sqft: Optional[float] = None
    # Raw Zillow rental data
    average_rent: Optional[float] = None


class MarketData(BaseModel):
    """Local market indicators."""
    market_health_score: Optional[int] = None
    market_strength: Optional[str] = None
    property_taxes_annual: Optional[float] = None
    hoa_fees_monthly: Optional[float] = None
    # Mortgage rate data for frontend calculations
    mortgage_rate_arm5: Optional[float] = None
    mortgage_rate_30yr: Optional[float] = None


class DataQuality(BaseModel):
    """Data quality indicators."""
    completeness_score: float = Field(ge=0, le=100)
    missing_fields: List[str] = []
    stale_fields: List[str] = []
    conflict_fields: List[str] = []


# ============================================
# ASSUMPTIONS
# ============================================

class FinancingAssumptions(BaseModel):
    """Loan and financing assumptions."""
    purchase_price: Optional[float] = None
    down_payment_pct: float = 0.20
    interest_rate: float = 0.075
    loan_term_years: int = 30
    closing_costs_pct: float = 0.03
    loan_origination_points: float = 0.0
    pmi_rate: float = 0.0085  # If down payment < 20%


class OperatingAssumptions(BaseModel):
    """Operating expense assumptions."""
    vacancy_rate: float = 0.05
    property_management_pct: float = 0.10
    maintenance_pct: float = 0.10
    insurance_annual: float = 500.0
    utilities_monthly: float = 75.0
    landscaping_annual: float = 500.0
    pest_control_annual: float = 200.0
    other_expenses_annual: float = 0.0


class STRAssumptions(BaseModel):
    """Short-term rental specific assumptions."""
    platform_fees_pct: float = 0.15
    str_management_pct: float = 0.20
    cleaning_cost_per_turnover: float = 200.0
    cleaning_fee_revenue: float = 75.0
    avg_length_of_stay_days: int = 6
    supplies_monthly: float = 100.0
    additional_utilities_monthly: float = 125.0
    furniture_setup_cost: float = 6000.0
    str_insurance_annual: float = 1500.0


class RehabAssumptions(BaseModel):
    """Renovation and rehab assumptions."""
    renovation_budget: float = 40000.0
    contingency_pct: float = 0.10
    holding_period_months: int = 4
    monthly_holding_costs: float = 2000.0


class BRRRRAssumptions(BaseModel):
    """BRRRR-specific assumptions."""
    purchase_discount_pct: float = 0.20  # Below market
    refinance_ltv: float = 0.75
    refinance_interest_rate: float = 0.07
    refinance_term_years: int = 30
    refinance_closing_costs: float = 3500.0
    post_rehab_rent_increase_pct: float = 0.10


class FlipAssumptions(BaseModel):
    """Fix & Flip specific assumptions."""
    hard_money_ltv: float = 0.90
    hard_money_rate: float = 0.12  # Annual
    selling_costs_pct: float = 0.08  # 6% commission + 2% closing
    holding_period_months: int = 6


class HouseHackAssumptions(BaseModel):
    """House hacking specific assumptions."""
    fha_down_payment_pct: float = 0.035
    fha_mip_rate: float = 0.0085
    units_rented_out: int = 2
    room_rent_monthly: float = 900.0
    owner_unit_market_rent: float = 1500.0


class WholesaleAssumptions(BaseModel):
    """Wholesale deal assumptions."""
    assignment_fee: float = 15000.0
    marketing_costs: float = 500.0
    earnest_money_deposit: float = 1000.0
    days_to_close: int = 45
    target_purchase_discount_pct: float = 0.30  # 70% ARV rule


class AllAssumptions(BaseModel):
    """Combined assumptions for all strategies."""
    financing: FinancingAssumptions = Field(default_factory=FinancingAssumptions)
    operating: OperatingAssumptions = Field(default_factory=OperatingAssumptions)
    str: STRAssumptions = Field(default_factory=STRAssumptions)
    rehab: RehabAssumptions = Field(default_factory=RehabAssumptions)
    brrrr: BRRRRAssumptions = Field(default_factory=BRRRRAssumptions)
    flip: FlipAssumptions = Field(default_factory=FlipAssumptions)
    house_hack: HouseHackAssumptions = Field(default_factory=HouseHackAssumptions)
    wholesale: WholesaleAssumptions = Field(default_factory=WholesaleAssumptions)
    
    # General
    appreciation_rate: float = 0.05
    rent_growth_rate: float = 0.03
    expense_growth_rate: float = 0.03


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
    ten_year_projection: Optional[List[Dict[str, float]]] = None


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
    seasonality_analysis: Optional[List[Dict[str, Any]]] = None


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
    
    # Break-even
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
    conversion_cost: Optional[float] = None
    unit2_rent: Optional[float] = None
    heloc_payment: Optional[float] = None
    net_housing_cost_scenario_b: Optional[float] = None
    savings_vs_renting_b: Optional[float] = None
    
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


class StrategyComparison(BaseModel):
    """Side-by-side comparison of all strategies."""
    property_id: str
    strategies: Dict[StrategyType, Dict[str, Any]]
    
    # Rankings
    best_cash_flow: StrategyType
    best_roi: StrategyType
    lowest_capital: StrategyType
    lowest_risk: StrategyType
    
    # Recommendations
    recommendations: List[Dict[str, str]]


# ============================================
# API REQUESTS / RESPONSES
# ============================================

class PropertySearchRequest(BaseModel):
    """Request to search for a property."""
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None


class PropertyResponse(BaseModel):
    """Full property data response."""
    property_id: str
    zpid: Optional[str] = None  # Zillow Property ID for photos API
    address: Address
    details: PropertyDetails
    valuations: ValuationData
    rentals: RentalData
    market: MarketData
    provenance: ProvenanceMap
    data_quality: DataQuality
    fetched_at: datetime


class AnalyticsRequest(BaseModel):
    """Request to calculate analytics."""
    property_id: str
    assumptions: AllAssumptions = Field(default_factory=AllAssumptions)
    strategies: Optional[List[StrategyType]] = None  # None = all strategies


class AnalyticsResponse(BaseModel):
    """Full analytics response for all strategies."""
    property_id: str
    assumptions_hash: str
    calculated_at: datetime
    
    ltr: Optional[LTRResults] = None
    str: Optional[STRResults] = None
    brrrr: Optional[BRRRRResults] = None
    flip: Optional[FlipResults] = None
    house_hack: Optional[HouseHackResults] = None
    wholesale: Optional[WholesaleResults] = None
    
    comparison: Optional[StrategyComparison] = None


class SensitivityRequest(BaseModel):
    """Request for sensitivity analysis."""
    property_id: str
    assumptions: AllAssumptions
    variable: str  # e.g., "purchase_price", "interest_rate", "occupancy"
    range_pct: List[float] = [-0.10, -0.05, 0, 0.05, 0.10]
    strategies: Optional[List[StrategyType]] = None


class SensitivityResponse(BaseModel):
    """Sensitivity analysis results."""
    property_id: str
    variable: str
    baseline_value: float
    results: List[Dict[str, Any]]


class ExportRequest(BaseModel):
    """Request to export analysis."""
    property_id: str
    format: Literal["pdf", "xlsx", "csv"]
    strategies: Optional[List[StrategyType]] = None
    include_sensitivity: bool = False


class ExportResponse(BaseModel):
    """Export generation response."""
    export_id: str
    download_url: str
    expires_at: datetime
