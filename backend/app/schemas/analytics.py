"""
Schemas for analytics endpoints: IQ Verdict, Deal Score, and defaults.

Moved from app/routers/analytics.py as part of Phase 2 Architecture Cleanup.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.deal_structures import DealStructuresPayload
from app.schemas.valuation import ValuationSnapshot

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

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    list_price: float = Field(..., gt=0, le=100_000_000, description="Property list price")
    purchase_price: float | None = Field(
        None, gt=0, le=100_000_000, description="User-override purchase price (bypasses buy_price calculation)"
    )
    monthly_rent: float | None = Field(None, ge=0, le=1_000_000, description="Monthly rent (estimated if not provided)")
    property_taxes: float | None = Field(None, ge=0, le=1_000_000, description="Annual property taxes")
    insurance: float | None = Field(None, ge=0, le=1_000_000, description="Annual insurance")
    hoa_fees_monthly: float | None = Field(
        None,
        ge=0,
        le=10_000,
        description=(
            "Monthly HOA / condo / co-op association fee. Folded into operating "
            "expenses for Income Value, Target Buy, and all strategy calculations."
        ),
    )
    bedrooms: int = Field(3, ge=0, le=100, description="Number of bedrooms")
    bathrooms: float = Field(2, ge=0, le=100, description="Number of bathrooms")
    sqft: int | None = Field(None, gt=0, le=1_000_000, description="Square footage")
    arv: float | None = Field(None, gt=0, le=100_000_000, description="After Repair Value")
    average_daily_rate: float | None = Field(None, ge=0, le=100_000, description="STR average daily rate")
    occupancy_rate: float | None = Field(None, ge=0.0, le=1.0, description="STR occupancy rate (0.0-1.0)")
    # Mashvisor /rental-rates?source=airbnb per-bedroom monthly revenue.
    # When supplied, the STR strategy bypasses ADR x 365 x occupancy and uses
    # this value x 12 as the canonical annual revenue.
    mashvisor_monthly_str_revenue: float | None = Field(
        None,
        ge=0,
        le=1_000_000,
        description="Mashvisor per-bedroom monthly STR revenue (replaces ADR x 30 x occupancy fallback)",
    )
    listing_status: str | None = Field(None, max_length=50, description="Listing status")
    seller_type: str | None = Field(None, max_length=50, description="Seller type")
    is_foreclosure: bool | None = Field(False, description="Is foreclosure property")
    is_bank_owned: bool | None = Field(False, description="Is bank-owned/REO")
    is_fsbo: bool | None = Field(False, description="For Sale By Owner")
    days_on_market: int | None = Field(None, ge=0, le=10_000, description="Days on market")
    market_temperature: str | None = Field(None, max_length=20, description="Market temperature: cold, warm, hot")

    @field_validator("days_on_market", mode="before")
    @classmethod
    def clamp_days_on_market(cls, v: object) -> int | None:
        """Clamp to 10_000 so API/frontend values above limit don't fail validation."""
        if v is None:
            return None
        try:
            n = int(v)
        except (TypeError, ValueError):
            return None
        if n < 0:
            return 0
        if n > 10_000:
            return 10_000
        return n

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
    closing_costs_pct: float | None = Field(None, ge=0, le=0.20, description="Closing costs fraction (e.g. 0.03 = 3%%)")
    rehab_cost: float | None = Field(None, ge=0, le=10_000_000, description="Rehab budget (dollar amount)")
    capex_pct: float | None = Field(None, ge=0, le=1, description="CapEx / reserves as fraction of gross income")
    utilities_monthly: float | None = Field(
        None,
        ge=0,
        le=10_000,
        description="Landlord-paid utilities per month ($)",
    )
    pest_control_annual: float | None = Field(
        None,
        ge=0,
        le=100_000,
        description="Annual pest control and similar fixed operating costs ($)",
    )
    buy_discount_pct: float | None = Field(
        None, ge=0, le=0.50, description="Target buy discount below Income Value (e.g. 0.05 = 5%%)"
    )
    state: str | None = Field(
        None,
        min_length=2,
        max_length=2,
        description="Two-letter U.S. state code for regional investor discount probability cohort",
    )
    estimated_purchase_year: int | None = Field(
        None,
        ge=1900,
        le=2100,
        description="Year of last sale — drives Sub2 heuristic when mortgage records unavailable",
    )
    estimated_purchase_price: float | None = Field(
        None,
        ge=0,
        description="Last sold price — paired with purchase year for Sub2 loan balance estimate",
    )
    year_built: int | None = Field(
        None,
        ge=1800,
        le=2100,
        description="Used for new-construction heuristic on rate-buydown template",
    )
    # Public-records enrichment (T8.5 / assumable); optional until integration lands
    existing_loan_type: str | None = Field(
        None,
        description="Seller's existing mortgage type when known: FHA, VA, USDA, conventional",
    )
    estimated_existing_loan_balance: float | None = Field(
        None,
        ge=0,
        description="Current mortgage balance when known (else Sub2 uses heuristic)",
    )
    estimated_existing_loan_rate: float | None = Field(
        None,
        ge=0,
        le=0.30,
        description="Actual note rate when known (annual decimal)",
    )
    # FHA house-hack / multifamily hints
    unit_count: int | None = Field(
        None,
        ge=1,
        le=8,
        description="Number of units (2–4 for small multifamily house-hack)",  # noqa: RUF001 — en dash for number range
    )
    is_owner_occupied: bool | None = Field(
        None,
        description="Buyer intends to owner-occupy (house-hack)",
    )
    # T17 — per-user template-family dismissals (localStorage on the client; selector
    # applies a -25 ranking penalty to matching candidates so dismissed families don't
    # keep leading the lineup on every subsequent property the user analyzes).
    dismissed_families: list[str] | None = Field(
        default=None,
        description="StructureFamily IDs the user has dismissed (e.g. ['financing'])",
    )
    # Seller second / carry (Model A) — optional; 0 = no seller financing
    seller_carry_amount: float | None = Field(
        None,
        ge=0,
        le=100_000_000,
        description="Seller note principal in dollars",
    )
    seller_carry_rate: float | None = Field(
        None,
        ge=0,
        le=0.30,
        description="Seller note annual interest rate (decimal, e.g. 0.06 = 6%)",
    )
    seller_carry_term_years: int | None = Field(
        None,
        ge=1,
        le=40,
        description="Seller note amortization term in years",
    )

    @field_validator("existing_loan_type", mode="before")
    @classmethod
    def normalize_loan_type(cls, v: object) -> str | None:
        if v is None or v == "":
            return None
        if not isinstance(v, str):
            return None
        u = v.strip().upper()
        if u in ("FHA", "VA", "USDA", "CONVENTIONAL"):
            return u
        return None

    @field_validator("state", mode="before")
    @classmethod
    def normalize_state_code(cls, v: object) -> str | None:
        if v is None or v == "":
            return None
        if not isinstance(v, str):
            return None
        s = v.strip().upper()
        if len(s) == 2 and s.isalpha():
            return s
        return None


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
    breakdown: dict[str, float | int | None] | None = Field(
        default=None, description="Detailed financial breakdown for this strategy"
    )


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
    cumulative_investor_pct: int = Field(
        0,
        description=(
            "Estimated share of investors who historically close at this Deal Gap depth or deeper "
            "(same methodology as deal_probability_score; cumulative within region cohort)"
        ),
    )
    investor_probability_region_label: str = Field(
        "",
        description="Human-readable region label for cumulative investor cohort (e.g. Sun Belt, Midwest)",
    )
    # Wholesale MAO - so clients do not compute it (MAO = ARV x 0.70 - rehab - fee)
    wholesale_mao: float | None = Field(None, description="Wholesale max allowable offer for price ladder")
    # Deal factors: plain-language narratives explaining deal achievability
    deal_factors: list[DealFactor] = Field(default_factory=list, description="Plain-language deal factor narratives")
    discount_bracket_label: str = Field("", description="Investor discount bracket context")
    # AI-generated deal narrative (motivational coaching paragraph)
    deal_narrative: str | None = Field(None, description="AI-generated deal narrative for investor coaching")
    # Three Paths — alternative deal structures shown when Deal Gap is negative
    deal_structures: DealStructuresPayload | None = Field(
        None,
        description="Three Paths alternatives + 5th-grade narrative; null when gap is non-negative",
    )
    valuation_snapshot: ValuationSnapshot | None = Field(
        None,
        description="Authoritative NOI / Income Value / cash flow bundle at purchase_price",
    )


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
    hoa_fees_monthly: float | None = Field(
        None,
        ge=0,
        le=10_000,
        description="Monthly HOA / condo / co-op fee, folded into operating expenses.",
    )
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
    state: str | None = Field(
        None,
        min_length=2,
        max_length=2,
        description="Two-letter U.S. state code for regional investor discount probability cohort",
    )

    @field_validator("state", mode="before")
    @classmethod
    def normalize_state_code(cls, v: object) -> str | None:
        if v is None or v == "":
            return None
        if not isinstance(v, str):
            return None
        s = v.strip().upper()
        if len(s) == 2 and s.isalpha():
            return s
        return None

    @field_validator("days_on_market", mode="before")
    @classmethod
    def clamp_days_on_market(cls, v: object) -> int | None:
        if v is None:
            return None
        try:
            n = int(v)
        except (TypeError, ValueError):
            return None
        if n < 0:
            return 0
        if n > 10_000:
            return 10_000
        return n


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
