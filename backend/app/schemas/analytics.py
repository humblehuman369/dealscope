"""
Schemas for analytics endpoints: IQ Verdict, Deal Score, and defaults.

Moved from app/routers/analytics.py as part of Phase 2 Architecture Cleanup.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

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
    purchase_price: float | None = Field(
        None, gt=0, le=100_000_000, description="User-override purchase price (bypasses buy_price calculation)"
    )
    monthly_rent: float | None = Field(None, ge=0, le=1_000_000, description="Monthly rent (estimated if not provided)")
    property_taxes: float | None = Field(None, ge=0, le=1_000_000, description="Annual property taxes")
    insurance: float | None = Field(None, ge=0, le=1_000_000, description="Annual insurance")
    bedrooms: int = Field(3, ge=0, le=100, description="Number of bedrooms")
    bathrooms: float = Field(2, ge=0, le=100, description="Number of bathrooms")
    sqft: int | None = Field(None, gt=0, le=1_000_000, description="Square footage")
    arv: float | None = Field(None, gt=0, le=100_000_000, description="After Repair Value")
    average_daily_rate: float | None = Field(None, ge=0, le=100_000, description="STR average daily rate")
    occupancy_rate: float | None = Field(None, ge=0.0, le=1.0, description="STR occupancy rate (0.0-1.0)")
    listing_status: str | None = Field(None, max_length=50, description="Listing status")
    seller_type: str | None = Field(None, max_length=50, description="Seller type")
    is_foreclosure: bool | None = Field(False, description="Is foreclosure property")
    is_bank_owned: bool | None = Field(False, description="Is bank-owned/REO")
    is_fsbo: bool | None = Field(False, description="For Sale By Owner")
    days_on_market: int | None = Field(None, ge=0, le=10_000, description="Days on market")
    market_temperature: str | None = Field(None, max_length=20, description="Market temperature: cold, warm, hot")
    # Off-market market price: when is_listed is False, backend computes Market Price from valuations
    is_listed: bool | None = Field(None, description="True if property has active listing; False for off-market")
    zestimate: float | None = Field(
        None, ge=0, le=100_000_000, description="Zillow Zestimate (for off-market market price)"
    )
    current_value_avm: float | None = Field(
        None, ge=0, le=100_000_000, description="RentCast AVM (for off-market market price)"
    )
    tax_assessed_value: float | None = Field(
        None, ge=0, le=100_000_000, description="Tax assessed value (for off-market fallback)"
    )
    # Assumptions - when provided, Income Value and Target Buy are calculated from these; otherwise backend defaults are used
    down_payment_pct: float | None = Field(None, ge=0, le=1, description="Down payment fraction (e.g. 0.20 = 20%%)")
    interest_rate: float | None = Field(None, ge=0, le=0.30, description="Annual interest rate (e.g. 0.06 = 6%%)")
    loan_term_years: int | None = Field(None, ge=1, le=50, description="Loan term in years")
    vacancy_rate: float | None = Field(None, ge=0, le=1, description="Vacancy rate (e.g. 0.05 = 5%%)")
    maintenance_pct: float | None = Field(None, ge=0, le=1, description="Maintenance as fraction of gross income")
    management_pct: float | None = Field(
        None, ge=0, le=1, description="Property management as fraction of gross income"
    )
    buy_discount_pct: float | None = Field(
        None, ge=0, le=0.50, description="Target buy discount below Income Value (e.g. 0.05 = 5%%)"
    )


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
    badge: str | None = None
    cap_rate: float | None = None
    cash_on_cash: float | None = None
    dscr: float | None = None
    annual_cash_flow: float | None = None
    monthly_cash_flow: float | None = None


class DealFactor(BaseModel):
    """A plain-language factor explaining deal achievability."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    type: Literal["positive", "warning", "info"]
    text: str


class OpportunityFactorsResponse(BaseModel):
    """Opportunity factors breakdown for IQ Verdict."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    deal_gap: float = Field(..., description="Deal Gap % - discount needed from list price to Target Price")
    motivation: float = Field(..., description="Seller motivation score (0-100)")
    motivation_label: str = Field(..., description="Motivation level label")
    days_on_market: int | None = Field(None)
    buyer_market: str | None = Field(None)
    distressed_sale: bool = Field(False)


class ReturnFactorsResponse(BaseModel):
    """Return factors breakdown for IQ Verdict (strategy-specific)."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    cap_rate: float | None = None
    cash_on_cash: float | None = None
    dscr: float | None = None
    annual_roi: float | None = None
    annual_profit: float | None = None
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
    strategies: list[StrategyResult]
    purchase_price: float
    income_value: float = Field(..., description="Income Value - price where cash flow = $0")
    list_price: float
    inputs_used: dict
    defaults_used: dict
    opportunity: ScoreDisplayResponse
    opportunity_factors: OpportunityFactorsResponse
    return_rating: ScoreDisplayResponse
    return_factors: ReturnFactorsResponse
    # Income Gap - internal pricing quality (List Price - Income Value)
    income_gap_amount: float = Field(0, description="List Price minus Income Value (dollars)")
    income_gap_percent: float = Field(0, description="Income Gap as percentage of List Price")
    pricing_quality_tier: str = Field(
        "unknown",
        description="Pricing quality: below_income_value, investment_grade, fair, above_income_value, overpriced, substantially_overpriced",
    )
    # Deal Gap - public hero metric (List Price - Target Price)
    deal_gap_amount: float = Field(0, description="List Price minus Target Price (dollars)")
    deal_gap_percent: float = Field(0, description="Deal Gap as percentage of List Price")
    # Component scores — deprecated, kept at 0 for mobile backward compatibility
    deal_gap_score: int = 0
    return_quality_score: int = 0
    market_alignment_score: int = 0
    deal_probability_score: int = 0
    # Wholesale MAO - so clients do not compute it (MAO = ARV x 0.70 - rehab - fee)
    wholesale_mao: float | None = Field(None, description="Wholesale max allowable offer for price ladder")
    # Deal factors: plain-language narratives explaining deal achievability
    deal_factors: list[DealFactor] = Field(default_factory=list, description="Plain-language deal factor narratives")
    discount_bracket_label: str = Field("", description="Investor discount bracket context")


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
    vacancy_rate: float | None = Field(None, ge=0, le=1)
    maintenance_pct: float | None = Field(None, ge=0, le=1)
    management_pct: float | None = Field(None, ge=0, le=1)
    down_payment_pct: float | None = Field(None, ge=0, le=1)
    interest_rate: float | None = Field(None, ge=0, le=0.3)
    loan_term_years: int | None = Field(None, ge=1, le=50)
    listing_status: str | None = None
    seller_type: str | None = None
    is_foreclosure: bool | None = Field(False)
    is_bank_owned: bool | None = Field(False)
    is_fsbo: bool | None = Field(False)
    is_auction: bool | None = Field(False)
    price_reductions: int | None = Field(0, ge=0)
    days_on_market: int | None = Field(None, ge=0, le=10_000)
    market_temperature: str | None = None


class DealScoreMotivation(BaseModel):
    score: int
    label: str
    base_score: int
    dom_bonus: int = 0
    market_modifier: int = 0
    market_temperature: str | None = None
    availability_status: str
    availability_label: str


class DealScoreFactors(BaseModel):
    deal_gap_percent: float
    deal_gap_amount: float = 0
    max_achievable_discount: float
    motivation: DealScoreMotivation
    deal_gap_score: int | None = None
    availability_score: int | None = None
    availability_status: str | None = None
    availability_label: str | None = None
    availability_motivation: str | None = None
    dom_score: int | None = None
    dom_leverage: str | None = None
    days_on_market: int | None = None


class DealScoreResponse(BaseModel):
    deal_score: int
    deal_verdict: str
    discount_percent: float
    income_value: float = Field(..., description="Income Value - price where cash flow = $0")
    purchase_price: float
    list_price: float
    factors: DealScoreFactors | None = None
    grade: str = Field("C")
    color: str = Field("#f97316")
    calculation_details: dict
