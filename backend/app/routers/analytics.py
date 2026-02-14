"""
Analytics router — IQ Verdict, Deal Score, and defaults endpoints.

Extracted from main.py as part of Phase 2 Architecture Cleanup.
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict

from app.core.defaults import (
    FINANCING, OPERATING, STR, REHAB, BRRRR, FLIP, HOUSE_HACK, WHOLESALE, GROWTH,
    DEFAULT_BUY_DISCOUNT_PCT, estimate_breakeven_price, calculate_buy_price,
    get_all_defaults,
)
from app.core.deps import DbSession
from app.schemas.property import (
    AnalyticsRequest, AnalyticsResponse,
)
from app.services.property_service import property_service
from app.services.assumptions_service import get_default_assumptions as get_db_default_assumptions

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Analytics"])


# ===========================================
# Helper: camelCase alias generator
# ===========================================

def _to_camel(string: str) -> str:
    """Convert snake_case to camelCase for JSON serialization."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


# ===========================================
# Schemas
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

    deal_gap: float = Field(..., description="Discount % needed from list to breakeven")
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
    breakeven_price: float
    list_price: float
    inputs_used: dict
    defaults_used: dict
    opportunity: ScoreDisplayResponse
    opportunity_factors: OpportunityFactorsResponse
    return_rating: ScoreDisplayResponse
    return_factors: ReturnFactorsResponse
    # Component scores — flat top-level fields (no nested model)
    # to eliminate Pydantic v2 nested-model serialization ambiguity
    deal_gap_score: int = 0
    return_quality_score: int = 0
    market_alignment_score: int = 0
    deal_probability_score: int = 0


class DealScoreInput(BaseModel):
    """Input for Deal Score calculation."""
    list_price: float = Field(...)
    purchase_price: float = Field(...)
    monthly_rent: float = Field(...)
    property_taxes: float = Field(...)
    insurance: float = Field(...)
    vacancy_rate: Optional[float] = None
    maintenance_pct: Optional[float] = None
    management_pct: Optional[float] = None
    down_payment_pct: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_term_years: Optional[int] = None
    listing_status: Optional[str] = None
    seller_type: Optional[str] = None
    is_foreclosure: Optional[bool] = Field(False)
    is_bank_owned: Optional[bool] = Field(False)
    is_fsbo: Optional[bool] = Field(False)
    is_auction: Optional[bool] = Field(False)
    price_reductions: Optional[int] = Field(0)
    days_on_market: Optional[int] = None
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
    breakeven_price: float
    purchase_price: float
    list_price: float
    factors: Optional[DealScoreFactors] = None
    grade: str = Field("C")
    color: str = Field("#f97316")
    calculation_details: dict


# ===========================================
# Internal calculation helpers
# ===========================================

def _score_to_grade_label(score: int) -> tuple[str, str, str]:
    if score >= 85:
        return ("A+", "STRONG", "#22c55e")
    elif score >= 70:
        return ("A", "GOOD", "#22c55e")
    elif score >= 55:
        return ("B", "MODERATE", "#84cc16")
    elif score >= 40:
        return ("C", "POTENTIAL", "#f97316")
    elif score >= 25:
        return ("D", "WEAK", "#f97316")
    else:
        return ("F", "POOR", "#ef4444")


def _performance_score(metric_value: float, multiplier: float) -> int:
    score = round(50 + (metric_value * multiplier))
    return max(0, min(100, score))


def _format_compact_currency(value: float) -> str:
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    if abs(value) >= 1_000:
        return f"${round(value / 1000)}K"
    return f"${round(value):,}"


def _calculate_monthly_mortgage(principal: float, annual_rate: float, years: int) -> float:
    if annual_rate == 0:
        return principal / (years * 12)
    monthly_rate = annual_rate / 12
    num_payments = years * 12
    return principal * (monthly_rate * (1 + monthly_rate) ** num_payments) / \
           ((1 + monthly_rate) ** num_payments - 1)


def _calculate_ltr_strategy(price: float, monthly_rent: float, property_taxes: float, insurance: float) -> dict:
    down_payment = price * FINANCING.down_payment_pct
    closing_costs = price * FINANCING.closing_costs_pct
    loan_amount = price - down_payment
    total_cash = down_payment + closing_costs
    monthly_pi = _calculate_monthly_mortgage(loan_amount, FINANCING.interest_rate, FINANCING.loan_term_years)
    annual_debt = monthly_pi * 12
    annual_rent = monthly_rent * 12
    effective_income = annual_rent * (1 - OPERATING.vacancy_rate)
    op_ex = property_taxes + insurance + (annual_rent * OPERATING.property_management_pct) + (annual_rent * OPERATING.maintenance_pct)
    noi = effective_income - op_ex
    annual_cash_flow = noi - annual_debt
    monthly_cash_flow = annual_cash_flow / 12
    coc = annual_cash_flow / total_cash if total_cash > 0 else 0
    coc_pct = coc * 100
    cap_rate = (noi / price * 100) if price > 0 else 0
    dscr = noi / annual_debt if annual_debt > 0 else 0
    score = _performance_score(coc_pct, 5)
    return {
        "id": "long-term-rental", "name": "Long-Term Rental",
        "metric": f"{coc_pct:.1f}%", "metric_label": "CoC Return", "metric_value": coc_pct, "score": score,
        "cap_rate": round(cap_rate, 2), "cash_on_cash": round(coc_pct, 2), "dscr": round(dscr, 2),
        "annual_cash_flow": round(annual_cash_flow, 0), "monthly_cash_flow": round(monthly_cash_flow, 0),
    }


def _calculate_str_strategy(price: float, adr: float, occupancy: float, property_taxes: float, insurance: float) -> dict:
    down_payment = price * FINANCING.down_payment_pct
    closing_costs = price * FINANCING.closing_costs_pct
    total_cash = down_payment + closing_costs + STR.furniture_setup_cost
    loan_amount = price - down_payment
    monthly_pi = _calculate_monthly_mortgage(loan_amount, FINANCING.interest_rate, FINANCING.loan_term_years)
    annual_debt = monthly_pi * 12
    annual_revenue = adr * 365 * occupancy
    mgmt_fee = annual_revenue * STR.str_management_pct
    platform_fees = annual_revenue * STR.platform_fees_pct
    utilities = OPERATING.utilities_monthly * 12
    supplies = STR.supplies_monthly * 12
    maintenance = annual_revenue * OPERATING.maintenance_pct
    op_ex = property_taxes + insurance + mgmt_fee + platform_fees + utilities + supplies + maintenance
    noi = annual_revenue - op_ex
    annual_cash_flow = noi - annual_debt
    monthly_cash_flow = annual_cash_flow / 12
    coc = annual_cash_flow / total_cash if total_cash > 0 else 0
    coc_pct = coc * 100
    cap_rate = (noi / price * 100) if price > 0 else 0
    dscr = noi / annual_debt if annual_debt > 0 else 0
    score = _performance_score(coc_pct, 3.33)
    return {
        "id": "short-term-rental", "name": "Short-Term Rental",
        "metric": f"{coc_pct:.1f}%", "metric_label": "CoC Return", "metric_value": coc_pct, "score": score,
        "cap_rate": round(cap_rate, 2), "cash_on_cash": round(coc_pct, 2), "dscr": round(dscr, 2),
        "annual_cash_flow": round(annual_cash_flow, 0), "monthly_cash_flow": round(monthly_cash_flow, 0),
    }


def _calculate_brrrr_strategy(price: float, monthly_rent: float, property_taxes: float, insurance: float, arv: float, rehab_cost: float) -> dict:
    initial_cash = (price * 0.10) + rehab_cost + (price * FINANCING.closing_costs_pct)
    refi_loan = arv * BRRRR.refinance_ltv
    cash_back = refi_loan - (price * 0.90)
    cash_left = max(0, initial_cash - max(0, cash_back))
    recovery_pct = ((initial_cash - cash_left) / initial_cash * 100) if initial_cash > 0 else 0
    monthly_pi = _calculate_monthly_mortgage(refi_loan, BRRRR.refinance_interest_rate, BRRRR.refinance_term_years)
    annual_debt = monthly_pi * 12
    annual_rent = monthly_rent * 12
    effective_income = annual_rent * (1 - OPERATING.vacancy_rate)
    op_ex = property_taxes + insurance + (annual_rent * OPERATING.property_management_pct) + (annual_rent * OPERATING.maintenance_pct)
    noi = effective_income - op_ex
    annual_cash_flow = noi - annual_debt
    min_cash_for_coc = max(cash_left, initial_cash * 0.10)
    if cash_left <= 0:
        coc = 999 if annual_cash_flow > 0 else 0
    else:
        coc = annual_cash_flow / min_cash_for_coc
    if coc > 100:
        display_coc = "Infinite"
    elif coc < -1:
        display_coc = "<-100%"
    else:
        display_coc = f"{coc * 100:.1f}%"
    cap_rate = (noi / price * 100) if price > 0 else 0
    dscr_val = noi / annual_debt if annual_debt > 0 else 0
    score = _performance_score(recovery_pct, 1)
    return {
        "id": "brrrr", "name": "BRRRR",
        "metric": display_coc, "metric_label": "CoC Return", "metric_value": recovery_pct, "score": score,
        "cap_rate": round(cap_rate, 2), "cash_on_cash": round(coc * 100, 2) if coc < 100 else 999,
        "dscr": round(dscr_val, 2), "annual_cash_flow": round(annual_cash_flow, 0), "monthly_cash_flow": round(annual_cash_flow / 12, 0),
    }


def _calculate_flip_strategy(price: float, arv: float, rehab_cost: float, property_taxes: float, insurance: float) -> dict:
    purchase_costs = price * FINANCING.closing_costs_pct
    holding_months = FLIP.holding_period_months
    holding_costs = (
        (price * FLIP.hard_money_rate / 12 * holding_months) +
        (property_taxes / 12 * holding_months) +
        (insurance / 12 * holding_months)
    )
    selling_costs = arv * FLIP.selling_costs_pct
    total_investment = price + purchase_costs + rehab_cost + holding_costs
    net_profit = arv - total_investment - selling_costs
    roi = net_profit / total_investment if total_investment > 0 else 0
    roi_pct = roi * 100
    score = _performance_score(roi_pct, 2.5)
    return {
        "id": "fix-and-flip", "name": "Fix & Flip",
        "metric": _format_compact_currency(net_profit), "metric_label": "Profit", "metric_value": net_profit, "score": score,
        "cap_rate": None, "cash_on_cash": round(roi_pct, 2), "dscr": None,
        "annual_cash_flow": round(net_profit, 0), "monthly_cash_flow": None,
    }


def _calculate_house_hack_strategy(price: float, monthly_rent: float, bedrooms: int, property_taxes: float, insurance: float) -> dict:
    total_beds = max(bedrooms, 2)
    rooms_rented = max(1, total_beds - 1)
    rent_per_room = monthly_rent / total_beds
    rental_income = rent_per_room * rooms_rented
    down_payment = price * HOUSE_HACK.fha_down_payment_pct
    closing_costs = price * FINANCING.closing_costs_pct
    loan_amount = price - down_payment
    monthly_pi = _calculate_monthly_mortgage(loan_amount, FINANCING.interest_rate, FINANCING.loan_term_years)
    monthly_taxes = property_taxes / 12
    monthly_insurance = insurance / 12
    pmi = loan_amount * HOUSE_HACK.fha_mip_rate / 12
    maintenance = rental_income * OPERATING.maintenance_pct
    vacancy = rental_income * OPERATING.vacancy_rate
    monthly_expenses = monthly_pi + monthly_taxes + monthly_insurance + pmi + maintenance + vacancy
    housing_offset = (rental_income / monthly_expenses * 100) if monthly_expenses > 0 else 0
    annual_savings = rental_income * 12
    score = _performance_score(housing_offset, 1)
    return {
        "id": "house-hack", "name": "House Hack",
        "metric": f"{round(housing_offset)}%", "metric_label": "Savings", "metric_value": housing_offset, "score": score,
        "cap_rate": None, "cash_on_cash": round(housing_offset, 2), "dscr": None,
        "annual_cash_flow": round(annual_savings, 0), "monthly_cash_flow": round(rental_income, 0),
    }


def _calculate_wholesale_strategy(price: float, arv: float, rehab_cost: float) -> dict:
    wholesale_fee = price * 0.007
    mao = (arv * 0.70) - rehab_cost - wholesale_fee
    assignment_fee = mao - (price * 0.85)
    emd = 5000
    roi_pct = (assignment_fee / emd * 100) if emd > 0 else 0
    score = _performance_score(roi_pct, 0.5)
    return {
        "id": "wholesale", "name": "Wholesale",
        "metric": _format_compact_currency(max(0, assignment_fee)), "metric_label": "Assignment",
        "metric_value": assignment_fee, "score": score,
        "cap_rate": None, "cash_on_cash": round(roi_pct, 2), "dscr": None,
        "annual_cash_flow": round(assignment_fee, 0), "monthly_cash_flow": None,
    }


def _calculate_deal_gap_component(breakeven_price: float, list_price: float) -> int:
    """
    Deal Gap Score component (0-90).
    Measures how favorably the property is priced relative to breakeven.
    Tops out at 90 (not 100) -- a property at breakeven is good, not perfect.
    Differentiates within positive territory: further below breakeven = higher.
    """
    if list_price <= 0:
        return 0
    gap_pct = ((list_price - breakeven_price) / list_price) * 100

    if gap_pct <= -10:
        # Breakeven is 10%+ below list price -> very strong (80-90)
        # More margin = higher score, capped at 90
        excess = min(abs(gap_pct) - 10, 20)  # cap additional credit at 20% more
        return min(90, round(80 + excess * 0.5))
    elif gap_pct <= 0:
        # Breakeven at or slightly below list price -> good (70-80)
        return round(70 + abs(gap_pct))
    elif gap_pct <= 10:
        # Need up to 10% discount -> decent (45-70)
        return round(70 - gap_pct * 2.5)
    elif gap_pct <= 25:
        # Need 10-25% discount -> moderate (15-45)
        return round(45 - (gap_pct - 10) * 2)
    elif gap_pct <= 40:
        # Need 25-40% discount -> weak (5-15)
        return round(15 - (gap_pct - 25) * 0.67)
    else:
        return 5  # floor


def _calculate_return_quality_component(top_strategy_score: int) -> int:
    """
    Return Quality Score component (0-90).
    Uses the best strategy's score as a proxy for return quality,
    normalized so a perfect strategy score of 100 maps to 90.
    """
    return min(90, round(top_strategy_score * 0.9))


def _calculate_deal_probability_component(
    deal_gap_pct: float,
    motivation_score: int,
) -> int:
    """
    Deal Probability Score component (0-90).
    How likely you can actually close at or below the breakeven price.
    Combines the required discount with seller motivation.
    """
    if deal_gap_pct <= 0:
        # No discount needed -- high probability, but not certain
        return min(90, round(80 + motivation_score * 0.1))

    # Max achievable discount based on motivation (0-25% range)
    max_discount = (motivation_score / 100) * 0.25
    gap_decimal = deal_gap_pct / 100

    if max_discount <= 0:
        return max(5, round(25 - deal_gap_pct * 1.5))

    ratio = gap_decimal / max_discount
    if ratio <= 0.6:
        return min(90, round(75 + (1 - ratio / 0.6) * 15))
    elif ratio <= 1.0:
        return round(55 + (1 - (ratio - 0.6) / 0.4) * 20)
    elif ratio <= 1.5:
        return round(25 + (1 - (ratio - 1.0) / 0.5) * 30)
    else:
        excess = ratio - 1.5
        return max(5, round(25 - excess * 40))


def _calculate_composite_verdict_score(
    breakeven_price: float,
    list_price: float,
    top_strategy_score: int,
    motivation_score: int,
) -> tuple[int, int, int, int, int]:
    """
    Composite IQ Verdict Score.

    Returns (composite_score, deal_gap, return_quality, market_alignment, deal_probability).
    All individual components are 0-90. Composite is capped at [5, 95].

    Weights:
      Deal Gap Score      x 0.35
      Return Quality      x 0.30
      Market Alignment    x 0.20
      Deal Probability    x 0.15
    """
    gap_pct = ((list_price - breakeven_price) / list_price) * 100 if list_price > 0 else 100

    deal_gap = _calculate_deal_gap_component(breakeven_price, list_price)
    return_quality = _calculate_return_quality_component(top_strategy_score)
    market_alignment = min(90, motivation_score)  # already 0-100, cap at 90
    deal_probability = _calculate_deal_probability_component(gap_pct, motivation_score)

    composite = round(
        deal_gap * 0.35
        + return_quality * 0.30
        + market_alignment * 0.20
        + deal_probability * 0.15
    )
    composite = max(5, min(95, composite))

    return composite, deal_gap, return_quality, market_alignment, deal_probability


def _calculate_opportunity_score(breakeven_price: float, list_price: float) -> tuple[int, float, str]:
    if list_price <= 0:
        return (0, 100.0, "Invalid")
    discount_pct = ((list_price - breakeven_price) / list_price) * 100
    if discount_pct < 0:
        discount_pct = 0
    score = max(0, min(100, round(100 - discount_pct * 2)))
    if discount_pct <= 5:
        verdict = "Strong Opportunity"
    elif discount_pct <= 10:
        verdict = "Great Opportunity"
    elif discount_pct <= 15:
        verdict = "Moderate Opportunity"
    elif discount_pct <= 25:
        verdict = "Potential Opportunity"
    elif discount_pct <= 35:
        verdict = "Mild Opportunity"
    elif discount_pct <= 45:
        verdict = "Weak Opportunity"
    else:
        verdict = "Poor Opportunity"
    return (score, discount_pct, verdict)


def _get_verdict_description(score: int, top_strategy: dict) -> str:
    name = top_strategy["name"]
    metric = top_strategy["metric"]
    label = top_strategy["metric_label"]
    if score >= 80:
        return f"Excellent potential across multiple strategies. {name} shows best returns."
    if score >= 60:
        return f"Good investment opportunity. {name} is your strongest option at {metric} {label}."
    if score >= 40:
        return f"Moderate opportunity. Consider {name} for best results, but review numbers carefully."
    return f"This property shows limited investment potential. {name} is the best option available."


# ===========================================
# Endpoints
# ===========================================

@router.post("/api/v1/analysis/verdict", response_model=IQVerdictResponse)
async def calculate_iq_verdict(input_data: IQVerdictInput):
    """Calculate IQ Verdict multi-strategy analysis."""
    try:
        list_price = input_data.list_price
        monthly_rent = input_data.monthly_rent or (list_price * 0.007)
        property_taxes = input_data.property_taxes or (list_price * 0.012)
        insurance = input_data.insurance or (list_price * OPERATING.insurance_pct)
        arv = input_data.arv or (list_price * 1.15)
        rehab_cost = arv * REHAB.renovation_budget_pct
        adr = input_data.average_daily_rate or ((monthly_rent / 30) * 1.5)
        occupancy = input_data.occupancy_rate or 0.65
        bedrooms = input_data.bedrooms

        breakeven = estimate_breakeven_price(monthly_rent, property_taxes, insurance)
        # Use user-override purchase price if provided, otherwise calculate
        buy_price = input_data.purchase_price or calculate_buy_price(list_price, monthly_rent, property_taxes, insurance)

        strategies = [
            _calculate_ltr_strategy(buy_price, monthly_rent, property_taxes, insurance),
            _calculate_str_strategy(buy_price, adr, occupancy, property_taxes, insurance),
            _calculate_brrrr_strategy(buy_price, monthly_rent, property_taxes, insurance, arv, rehab_cost),
            _calculate_flip_strategy(buy_price, arv, rehab_cost, property_taxes, insurance),
            _calculate_house_hack_strategy(buy_price, monthly_rent, bedrooms, property_taxes, insurance),
            _calculate_wholesale_strategy(buy_price, arv, rehab_cost),
        ]

        for i, strategy in enumerate(strategies):
            strategy["rank"] = i + 1
            score = strategy["score"]
            strategy["badge"] = "Strong" if score >= 80 else ("Good" if score >= 60 else None)

        top_strategy = max(strategies, key=lambda x: x["score"])

        # Calculate motivation from listing context (defaults to 50 when unknown)
        motivation_score = 50
        motivation_label = "Medium"
        is_distressed = input_data.is_foreclosure or input_data.is_bank_owned

        if input_data.listing_status or input_data.seller_type:
            from app.services.calculators import get_availability_ranking
            avail = get_availability_ranking(
                listing_status=input_data.listing_status,
                seller_type=input_data.seller_type,
                is_foreclosure=input_data.is_foreclosure or False,
                is_bank_owned=input_data.is_bank_owned or False,
                is_fsbo=input_data.is_fsbo or False,
            )
            motivation_score = avail["score"]
            motivation_label = avail["motivation"].capitalize()

        # Composite verdict score (replaces old single-factor score)
        deal_score, comp_gap, comp_return, comp_market, comp_prob = _calculate_composite_verdict_score(
            breakeven_price=breakeven,
            list_price=list_price,
            top_strategy_score=top_strategy["score"],
            motivation_score=motivation_score,
        )

        # Legacy discount_pct for backward compatibility
        discount_pct = max(0, ((list_price - breakeven) / list_price) * 100) if list_price > 0 else 0
        deal_verdict = (
            "Strong Opportunity" if discount_pct <= 5
            else "Great Opportunity" if discount_pct <= 10
            else "Moderate Opportunity" if discount_pct <= 15
            else "Potential Opportunity" if discount_pct <= 25
            else "Mild Opportunity" if discount_pct <= 35
            else "Weak Opportunity" if discount_pct <= 45
            else "Poor Opportunity"
        )

        opp_grade, opp_label, opp_color = _score_to_grade_label(deal_score)
        ret_grade, ret_label, ret_color = _score_to_grade_label(top_strategy["score"])

        result = IQVerdictResponse(
            deal_score=deal_score, deal_verdict=deal_verdict,
            verdict_description=_get_verdict_description(deal_score, top_strategy),
            discount_percent=round(discount_pct, 1),
            strategies=[StrategyResult(**s) for s in strategies],
            purchase_price=buy_price, breakeven_price=breakeven, list_price=list_price,
            inputs_used={
                "monthly_rent": monthly_rent, "property_taxes": property_taxes,
                "insurance": insurance, "arv": arv, "rehab_cost": rehab_cost, "bedrooms": bedrooms,
                "provided_rent": input_data.monthly_rent, "provided_taxes": input_data.property_taxes,
                "provided_insurance": input_data.insurance,
            },
            defaults_used=get_all_defaults(),
            opportunity=ScoreDisplayResponse(score=deal_score, grade=opp_grade, label=opp_label, color=opp_color),
            opportunity_factors=OpportunityFactorsResponse(
                deal_gap=round(discount_pct, 1), motivation=motivation_score, motivation_label=motivation_label,
                days_on_market=input_data.days_on_market, buyer_market=input_data.market_temperature,
                distressed_sale=is_distressed,
            ),
            return_rating=ScoreDisplayResponse(score=top_strategy["score"], grade=ret_grade, label=ret_label, color=ret_color),
            return_factors=ReturnFactorsResponse(
                cap_rate=top_strategy.get("cap_rate"), cash_on_cash=top_strategy.get("cash_on_cash"),
                dscr=top_strategy.get("dscr"), annual_roi=top_strategy.get("annual_cash_flow"),
                annual_profit=top_strategy.get("annual_cash_flow"), strategy_name=top_strategy["name"],
            ),
            deal_gap_score=comp_gap,
            return_quality_score=comp_return,
            market_alignment_score=comp_market,
            deal_probability_score=comp_prob,
        )

        # Explicit serialization with by_alias=True guarantees camelCase keys.
        # Returning JSONResponse bypasses FastAPI's response_model re-processing,
        # eliminating Pydantic v2 serialization ambiguity entirely.
        response_dict = result.model_dump(mode='json', by_alias=True)
        logger.info(
            "IQ Verdict response — dealScore=%s, dealGapScore=%s, returnQualityScore=%s, "
            "marketAlignmentScore=%s, dealProbabilityScore=%s",
            response_dict.get("dealScore"),
            response_dict.get("dealGapScore"),
            response_dict.get("returnQualityScore"),
            response_dict.get("marketAlignmentScore"),
            response_dict.get("dealProbabilityScore"),
        )
        return JSONResponse(content=response_dict)
    except Exception as e:
        logger.error(f"IQ Verdict analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/defaults")
async def get_default_assumptions_endpoint():
    """Get all default assumptions used in calculations."""
    return get_all_defaults()


@router.post("/api/v1/worksheet/deal-score", response_model=DealScoreResponse)
async def calculate_deal_score(input_data: DealScoreInput):
    """Calculate IQ Verdict Score (Deal Opportunity Score)."""
    from app.services.calculators import calculate_deal_opportunity_score

    try:
        list_price = input_data.list_price
        purchase_price = input_data.purchase_price
        monthly_rent = input_data.monthly_rent
        property_taxes = input_data.property_taxes
        insurance = input_data.insurance

        vacancy = input_data.vacancy_rate if input_data.vacancy_rate is not None else OPERATING.vacancy_rate
        maint_pct = input_data.maintenance_pct if input_data.maintenance_pct is not None else OPERATING.maintenance_pct
        mgmt_pct = input_data.management_pct if input_data.management_pct is not None else OPERATING.property_management_pct
        down_pct = input_data.down_payment_pct if input_data.down_payment_pct is not None else FINANCING.down_payment_pct
        rate = input_data.interest_rate if input_data.interest_rate is not None else FINANCING.interest_rate
        term = input_data.loan_term_years if input_data.loan_term_years is not None else FINANCING.loan_term_years

        breakeven = estimate_breakeven_price(
            monthly_rent=monthly_rent, property_taxes=property_taxes, insurance=insurance,
            down_payment_pct=down_pct, interest_rate=rate, loan_term_years=term,
            vacancy_rate=vacancy, maintenance_pct=maint_pct, management_pct=mgmt_pct,
        )

        has_listing_context = (
            input_data.listing_status is not None or input_data.seller_type is not None or
            input_data.is_foreclosure or input_data.is_bank_owned or input_data.is_fsbo or
            input_data.days_on_market is not None or input_data.price_reductions > 0 or
            input_data.market_temperature is not None
        )

        if has_listing_context:
            enhanced_result = calculate_deal_opportunity_score(
                breakeven_price=breakeven, list_price=list_price,
                listing_status=input_data.listing_status, seller_type=input_data.seller_type,
                is_foreclosure=input_data.is_foreclosure or False, is_bank_owned=input_data.is_bank_owned or False,
                is_fsbo=input_data.is_fsbo or False, is_auction=input_data.is_auction or False,
                price_reductions=input_data.price_reductions or 0, days_on_market=input_data.days_on_market,
                market_temperature=input_data.market_temperature,
            )
            deal_score = enhanced_result["score"]
            discount_pct = enhanced_result["deal_gap_percent"]
            deal_verdict = enhanced_result["label"]
            grade = enhanced_result["grade"]
            color = enhanced_result["color"]

            motivation_data = enhanced_result["motivation"]
            motivation = DealScoreMotivation(
                score=motivation_data["score"], label=motivation_data["label"],
                base_score=motivation_data["base_score"], dom_bonus=motivation_data["dom_bonus"],
                market_modifier=motivation_data["market_modifier"],
                market_temperature=motivation_data["market_temperature"],
                availability_status=motivation_data["availability_status"],
                availability_label=motivation_data["availability_label"],
            )
            factors = DealScoreFactors(
                deal_gap_percent=enhanced_result["deal_gap_percent"],
                deal_gap_amount=enhanced_result["deal_gap_amount"],
                max_achievable_discount=enhanced_result["max_achievable_discount"],
                motivation=motivation,
                deal_gap_score=enhanced_result["factors"]["deal_gap"]["score"],
                availability_score=enhanced_result["factors"]["availability"]["score"],
                availability_status=enhanced_result["factors"]["availability"]["status"],
                availability_label=enhanced_result["factors"]["availability"]["label"],
                availability_motivation=enhanced_result["factors"]["availability"].get("motivation", "medium"),
                dom_score=enhanced_result["factors"]["days_on_market"].get("bonus", 0),
                dom_leverage="medium",
                days_on_market=enhanced_result["factors"]["days_on_market"].get("days"),
            )
        else:
            deal_score, discount_pct, deal_verdict = _calculate_opportunity_score(breakeven, list_price)
            if deal_score >= 90:
                grade, color = "A+", "#22c55e"
            elif deal_score >= 80:
                grade, color = "A", "#22c55e"
            elif deal_score >= 70:
                grade, color = "B", "#84cc16"
            elif deal_score >= 50:
                grade, color = "C", "#f97316"
            elif deal_score >= 30:
                grade, color = "D", "#f97316"
            else:
                grade, color = "F", "#ef4444"
            factors = None

        return DealScoreResponse(
            deal_score=deal_score, deal_verdict=deal_verdict, discount_percent=round(discount_pct, 1),
            breakeven_price=breakeven, purchase_price=purchase_price, list_price=list_price,
            factors=factors, grade=grade, color=color,
            calculation_details={
                "monthly_rent": monthly_rent, "property_taxes": property_taxes, "insurance": insurance,
                "vacancy_rate": vacancy, "maintenance_pct": maint_pct, "management_pct": mgmt_pct,
                "down_payment_pct": down_pct, "interest_rate": rate, "loan_term_years": term,
            },
        )
    except Exception as e:
        logger.error(f"Deal Score calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================================
# Analytics Calculate & Quick
# ===========================================

@router.post("/api/v1/analytics/calculate", response_model=AnalyticsResponse)
async def calculate_analytics(request: AnalyticsRequest):
    """Calculate investment analytics for a property across all 6 strategies."""
    try:
        result = await property_service.calculate_analytics(
            property_id=request.property_id,
            assumptions=request.assumptions,
            strategies=request.strategies,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Analytics calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/analytics/{property_id}/quick")
async def quick_analytics(
    property_id: str,
    db: DbSession,
    purchase_price: Optional[float] = None,
    down_payment_pct: float = Query(0.20, ge=0, le=1),
    interest_rate: float = Query(0.075, ge=0, le=0.3),
):
    """Quick analytics with minimal parameters."""
    try:
        assumptions = await get_db_default_assumptions(db)
        if purchase_price:
            assumptions.financing.purchase_price = purchase_price
        assumptions.financing.down_payment_pct = down_payment_pct
        assumptions.financing.interest_rate = interest_rate

        result = await property_service.calculate_analytics(
            property_id=property_id, assumptions=assumptions,
        )

        return {
            "property_id": property_id,
            "summary": {
                "ltr": {"monthly_cash_flow": result.ltr.monthly_cash_flow if result.ltr else None, "cash_on_cash_return": result.ltr.cash_on_cash_return if result.ltr else None, "cap_rate": result.ltr.cap_rate if result.ltr else None},
                "str": {"monthly_cash_flow": result.str_assumptions.monthly_cash_flow if result.str_assumptions else None, "cash_on_cash_return": result.str_assumptions.cash_on_cash_return if result.str_assumptions else None, "break_even_occupancy": result.str_assumptions.break_even_occupancy if result.str_assumptions else None},
                "brrrr": {"cash_left_in_deal": result.brrrr.cash_left_in_deal if result.brrrr else None, "infinite_roi_achieved": result.brrrr.infinite_roi_achieved if result.brrrr else None, "equity_position": result.brrrr.equity_position if result.brrrr else None},
                "flip": {"net_profit": result.flip.net_profit_before_tax if result.flip else None, "roi": result.flip.roi if result.flip else None, "meets_70_rule": result.flip.meets_70_rule if result.flip else None},
                "house_hack": {"net_housing_cost": result.house_hack.net_housing_cost_scenario_a if result.house_hack else None, "savings_vs_renting": result.house_hack.savings_vs_renting_a if result.house_hack else None},
                "wholesale": {"net_profit": result.wholesale.net_profit if result.wholesale else None, "roi": result.wholesale.roi if result.wholesale else None, "deal_viability": result.wholesale.deal_viability if result.wholesale else None},
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Quick analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/assumptions/defaults")
async def get_assumptions_defaults(db: DbSession):
    """Get default assumptions for all strategies."""
    defaults = await get_db_default_assumptions(db)
    return {
        "assumptions": defaults.model_dump(),
        "descriptions": {
            "financing": {"down_payment_pct": "Down payment as percentage of purchase price", "interest_rate": "Annual mortgage interest rate", "loan_term_years": "Loan term in years", "closing_costs_pct": "Buyer closing costs as percentage"},
            "operating": {"vacancy_rate": "Expected vacancy as percentage", "property_management_pct": "Property management fee as % of rent", "maintenance_pct": "Maintenance reserve as % of rent"},
            "str": {"platform_fees_pct": "Airbnb/VRBO platform fees", "str_management_pct": "STR property management fee", "cleaning_cost_per_turnover": "Cost per guest turnover"},
            "brrrr": {"refinance_ltv": "Loan-to-value ratio for cash-out refinance", "purchase_discount_pct": "Target discount below market"},
            "flip": {"hard_money_rate": "Annual interest rate for hard money loan", "selling_costs_pct": "Total selling costs including commission"},
            "house_hack": {"fha_down_payment_pct": "FHA minimum down payment", "fha_mip_rate": "FHA mortgage insurance premium rate"},
            "wholesale": {"assignment_fee": "Target wholesale assignment fee", "target_purchase_discount_pct": "70% rule discount from ARV"},
        },
    }
