"""
Schemas for analytics endpoints: IQ Verdict, Deal Score, and defaults.

Moved from app/routers/analytics.py as part of Phase 2 Architecture Cleanup.
"""

from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict


# ===========================================
# Helper: camelCase alias generator
# ===========================================

def _to_camel(string: str) -> str:
    """Convert snake_case to camelCase for JSON serialization."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


# ===========================================
# IQ Verdict
# ===========================================

class IQVerdictInput(BaseModel):
    """Input for IQ Verdict multi-strategy analysis.

    All financial inputs are bounds-checked to prevent garbage-in/garbage-out
    on calculations that drive investment decisions.
    """
    list_price: float = Field(..., gt=0, le=100_000_000, description="Property list price")
    purchase_price: Optional[float] = Field(None, gt=0, le=100_000_000, description="User-override purchase price (bypasses buy_price calculation)")
    monthly_rent: Optional[float] = Field(None, ge=0, le=1_000_000, description="Monthly rent (estimated if not provided)")
    property_taxes: Optional[float] = Field(None, ge=0, le=1_000_000, description="Annual property taxes")
    insurance: Optional[float] = Field(None, ge=0, le=1_000_000, description="Annual insurance")
    bedrooms: int = Field(3, ge=0, le=100, description="Number of bedrooms")
    bathrooms: float = Field(2, ge=0, le=100, description="Number of bathrooms")
    sqft: Optional[int] = Field(None, gt=0, le=1_000_000, description="Square footage")
    arv: Optional[float] = Field(None, gt=0, le=100_000_000, description="After Repair Value")
    average_daily_rate: Optional[float] = Field(None, ge=0, le=100_000, description="STR average daily rate")
    occupancy_rate: Optional[float] = Field(None, ge=0.0, le=1.0, description="STR occupancy rate (0.0-1.0)")
    listing_status: Optional[str] = Field(None, max_length=50, description="Listing status")
    seller_type: Optional[str] = Field(None, max_length=50, description="Seller type")
    is_foreclosure: Optional[bool] = Field(False, description="Is foreclosure property")
    is_bank_owned: Optional[bool] = Field(False, description="Is bank-owned/REO")
    is_fsbo: Optional[bool] = Field(False, description="For Sale By Owner")
    days_on_market: Optional[int] = Field(None, ge=0, le=10_000, description="Days on market")
    market_temperature: Optional[str] = Field(None, max_length=20, description="Market temperature: cold, warm, hot")
    # Off-market market price: when is_listed is False, backend computes Market Price from valuations
    is_listed: Optional[bool] = Field(None, description="True if property has active listing; False for off-market")
    zestimate: Optional[float] = Field(None, ge=0, le=100_000_000, description="Zillow Zestimate (for off-market market price)")
    current_value_avm: Optional[float] = Field(None, ge=0, le=100_000_000, description="RentCast AVM (for off-market market price)")
    tax_assessed_value: Optional[float] = Field(None, ge=0, le=100_000_000, description="Tax assessed value (for off-market fallback)")


class StrategyResult(BaseModel):
    """Result for a single strategy."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    id: str
    name: str
    metric: str
    metric_label: str
    metric_value: float
    score: int
    rank: int
    badge: Optional[str] = None
    cap_rate: Optional[float] = None
    cash_on_cash: Optional[float] = None
    dscr: Optional[float] = None
    annual_cash_flow: Optional[float] = None
    monthly_cash_flow: Optional[float] = None


class OpportunityFactorsResponse(BaseModel):
    """Opportunity factors breakdown for IQ Verdict."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    deal_gap: float = Field(..., description="Deal Gap % — discount needed from list price to Target Price")
    motivation: float = Field(..., description="Seller motivation score (0-100)")
    motivation_label: str = Field(..., description="Motivation level label")
    days_on_market: Optional[int] = Field(None)
    buyer_market: Optional[str] = Field(None)
    distressed_sale: bool = Field(False)


class ReturnFactorsResponse(BaseModel):
    """Return factors breakdown for IQ Verdict (strategy-specific)."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    cap_rate: Optional[float] = None
    cash_on_cash: Optional[float] = None
    dscr: Optional[float] = None
    annual_roi: Optional[float] = None
    annual_profit: Optional[float] = None
    strategy_name: str = Field(...)


class ScoreDisplayResponse(BaseModel):
    """Grade and label for score display."""
    score: int
    grade: str
    label: str
    color: str


class IQVerdictResponse(BaseModel):
    """Response from IQ Verdict analysis."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    deal_score: int
    deal_verdict: str
    verdict_description: str
    discount_percent: float
    strategies: List[StrategyResult]
    purchase_price: float
    income_value: float = Field(..., description="Income Value — price where cash flow = $0")
    list_price: float
    inputs_used: dict
    defaults_used: dict
    opportunity: ScoreDisplayResponse
    opportunity_factors: OpportunityFactorsResponse
    return_rating: ScoreDisplayResponse
    return_factors: ReturnFactorsResponse
    # Income Gap — internal pricing quality (List Price - Income Value)
    income_gap_amount: float = Field(0, description="List Price minus Income Value (dollars)")
    income_gap_percent: float = Field(0, description="Income Gap as percentage of List Price")
    pricing_quality_tier: str = Field("unknown", description="Pricing quality: below_income_value, investment_grade, fair, above_income_value, overpriced, substantially_overpriced")
    # Deal Gap — public hero metric (List Price - Target Price)
    deal_gap_amount: float = Field(0, description="List Price minus Target Price (dollars)")
    deal_gap_percent: float = Field(0, description="Deal Gap as percentage of List Price")
    # Component scores — flat top-level fields (no nested model)
    # to eliminate Pydantic v2 nested-model serialization ambiguity
    deal_gap_score: int = 0
    return_quality_score: int = 0
    market_alignment_score: int = 0
    deal_probability_score: int = 0
    # Wholesale MAO — so clients do not compute it (MAO = ARV×0.70 − rehab − fee)
    wholesale_mao: Optional[float] = Field(None, description="Wholesale max allowable offer for price ladder")


# ===========================================
# Deal Score
# ===========================================

class DealScoreInput(BaseModel):
    """Input for Deal Score calculation."""
    list_price: float = Field(..., gt=0, le=100_000_000)
    purchase_price: float = Field(..., gt=0, le=100_000_000)
    monthly_rent: float = Field(..., ge=0, le=1_000_000)
    property_taxes: float = Field(..., ge=0, le=1_000_000)
    insurance: float = Field(..., ge=0, le=1_000_000)
    vacancy_rate: Optional[float] = Field(None, ge=0, le=1)
    maintenance_pct: Optional[float] = Field(None, ge=0, le=1)
    management_pct: Optional[float] = Field(None, ge=0, le=1)
    down_payment_pct: Optional[float] = Field(None, ge=0, le=1)
    interest_rate: Optional[float] = Field(None, ge=0, le=0.3)
    loan_term_years: Optional[int] = Field(None, ge=1, le=50)
    listing_status: Optional[str] = None
    seller_type: Optional[str] = None
    is_foreclosure: Optional[bool] = Field(False)
    is_bank_owned: Optional[bool] = Field(False)
    is_fsbo: Optional[bool] = Field(False)
    is_auction: Optional[bool] = Field(False)
    price_reductions: Optional[int] = Field(0, ge=0)
    days_on_market: Optional[int] = Field(None, ge=0, le=10_000)
    market_temperature: Optional[str] = None


class DealScoreMotivation(BaseModel):
    score: int
    label: str
    base_score: int
    dom_bonus: int = 0
    market_modifier: int = 0
    market_temperature: Optional[str] = None
    availability_status: str
    availability_label: str


class DealScoreFactors(BaseModel):
    deal_gap_percent: float
    deal_gap_amount: float = 0
    max_achievable_discount: float
    motivation: DealScoreMotivation
    deal_gap_score: Optional[int] = None
    availability_score: Optional[int] = None
    availability_status: Optional[str] = None
    availability_label: Optional[str] = None
    availability_motivation: Optional[str] = None
    dom_score: Optional[int] = None
    dom_leverage: Optional[str] = None
    days_on_market: Optional[int] = None


class DealScoreResponse(BaseModel):
    deal_score: int
    deal_verdict: str
    discount_percent: float
    income_value: float = Field(..., description="Income Value — price where cash flow = $0")
    purchase_price: float
    list_price: float
    factors: Optional[DealScoreFactors] = None
    grade: str = Field("C")
    color: str = Field("#f97316")
    calculation_details: dict
