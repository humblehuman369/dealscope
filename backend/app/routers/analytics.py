"""
Analytics router — IQ Verdict, Deal Score, and defaults endpoints.

Thin HTTP layer. All business logic lives in ``app.services.iq_verdict_service``.
Schemas live in ``app.schemas.analytics``.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.core.defaults import get_all_defaults
from app.core.deps import DbSession
from app.schemas.analytics import (
    IQVerdictInput, IQVerdictResponse,
    DealScoreInput, DealScoreResponse,
)
from app.schemas.property import AnalyticsRequest, AnalyticsResponse
from app.services.iq_verdict_service import compute_iq_verdict, compute_deal_score
from app.services.property_service import property_service
from app.services.assumptions_service import get_default_assumptions as get_db_default_assumptions

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Analytics"])


# ===========================================
# IQ Verdict
# ===========================================

@router.post("/api/v1/analysis/verdict", response_model=IQVerdictResponse)
async def calculate_iq_verdict(input_data: IQVerdictInput):
    """Calculate IQ Verdict multi-strategy analysis."""
    try:
        result = compute_iq_verdict(input_data)

        # Explicit serialization with by_alias=True guarantees camelCase keys.
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


# ===========================================
# Defaults
# ===========================================

@router.get("/api/v1/defaults")
async def get_default_assumptions_endpoint():
    """Get all default assumptions used in calculations."""
    return get_all_defaults()


# ===========================================
# Deal Score
# ===========================================

@router.post("/api/v1/worksheet/deal-score", response_model=DealScoreResponse)
async def calculate_deal_score(input_data: DealScoreInput):
    """Calculate IQ Verdict Score (Deal Opportunity Score)."""
    try:
        return compute_deal_score(input_data)
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
