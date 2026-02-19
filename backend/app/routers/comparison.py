"""
Comparison router — Strategy comparison and sensitivity analysis.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.core.deps import DbSession
from app.schemas.property import SensitivityRequest, SensitivityResponse
from app.services.property_service import property_service
from app.services.assumptions_service import get_default_assumptions as get_db_default_assumptions

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Comparison"])


# ===========================================
# Sensitivity Analysis
# ===========================================

@router.post("/api/v1/sensitivity/analyze")
async def run_sensitivity_analysis(request: SensitivityRequest):
    """Run sensitivity analysis on a key variable."""
    try:
        property_data = await property_service.get_cached_property(request.property_id)
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")

        variable_mapping = {
            "purchase_price": request.assumptions.financing.purchase_price or property_data.valuations.current_value_avm or 425000,
            "interest_rate": request.assumptions.financing.interest_rate,
            "down_payment_pct": request.assumptions.financing.down_payment_pct,
            "monthly_rent": property_data.rentals.monthly_rent_ltr or 2100,
            "occupancy_rate": property_data.rentals.occupancy_rate or 0.75,
            "average_daily_rate": property_data.rentals.average_daily_rate or 200,
        }

        base_value = variable_mapping.get(request.variable)
        if base_value is None:
            raise HTTPException(status_code=400, detail=f"Unknown variable: {request.variable}")

        results = []
        for variation in request.range_pct:
            modified = request.assumptions.model_copy(deep=True)

            if request.variable == "purchase_price":
                modified.financing.purchase_price = base_value * (1 + variation)
            elif request.variable == "interest_rate":
                modified.financing.interest_rate = base_value * (1 + variation)
            elif request.variable == "down_payment_pct":
                modified.financing.down_payment_pct = base_value * (1 + variation)

            analytics = await property_service.calculate_analytics(
                property_id=request.property_id,
                assumptions=modified,
                strategies=request.strategies,
            )

            result_row = {
                "variation_pct": variation,
                "variable_value": base_value * (1 + variation),
                "results": {},
            }

            if analytics.ltr:
                result_row["results"]["ltr_cash_flow"] = analytics.ltr.annual_cash_flow
                result_row["results"]["ltr_coc"] = analytics.ltr.cash_on_cash_return
            if analytics.str_results:
                result_row["results"]["str_cash_flow"] = analytics.str_results.annual_cash_flow
                result_row["results"]["str_coc"] = analytics.str_results.cash_on_cash_return
            if analytics.flip:
                result_row["results"]["flip_profit"] = analytics.flip.net_profit_before_tax
                result_row["results"]["flip_roi"] = analytics.flip.roi

            results.append(result_row)

        return SensitivityResponse(
            property_id=request.property_id,
            variable=request.variable,
            baseline_value=base_value,
            results=results,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sensitivity analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================================
# Strategy Comparison
# ===========================================

@router.get("/api/v1/comparison/{property_id}")
async def get_strategy_comparison(property_id: str, db: DbSession):
    """Get side-by-side comparison of all strategies."""
    try:
        assumptions = await get_db_default_assumptions(db)
        analytics = await property_service.calculate_analytics(
            property_id=property_id, assumptions=assumptions,
        )

        return {
            "property_id": property_id,
            "strategies": {
                "ltr": {
                    "name": "Long-Term Rental",
                    "initial_investment": analytics.ltr.total_cash_required if analytics.ltr else None,
                    "year1_cash_flow": analytics.ltr.annual_cash_flow if analytics.ltr else None,
                    "year1_roi": analytics.ltr.cash_on_cash_return if analytics.ltr else None,
                    "risk_level": "Low", "time_horizon": "10+ years", "active_management": "Low",
                },
                "str": {
                    "name": "Short-Term Rental",
                    "initial_investment": analytics.str_results.total_cash_required if analytics.str_results else None,
                    "year1_cash_flow": analytics.str_results.annual_cash_flow if analytics.str_results else None,
                    "year1_roi": analytics.str_results.cash_on_cash_return if analytics.str_results else None,
                    "risk_level": "Medium", "time_horizon": "5-10 years", "active_management": "High",
                },
                "brrrr": {
                    "name": "BRRRR",
                    "initial_investment": analytics.brrrr.total_cash_invested if analytics.brrrr else None,
                    "year1_cash_flow": analytics.brrrr.post_refi_annual_cash_flow if analytics.brrrr else None,
                    "year1_roi": analytics.brrrr.post_refi_cash_on_cash if analytics.brrrr else None,
                    "risk_level": "Medium", "time_horizon": "2-5 years", "active_management": "Medium",
                },
                "flip": {
                    "name": "Fix & Flip",
                    "initial_investment": analytics.flip.total_cash_required if analytics.flip else None,
                    "total_profit": analytics.flip.net_profit_before_tax if analytics.flip else None,
                    "year1_roi": analytics.flip.annualized_roi if analytics.flip else None,
                    "risk_level": "High", "time_horizon": "6 months", "active_management": "High",
                },
                "house_hack": {
                    "name": "House Hacking",
                    "initial_investment": analytics.house_hack.total_cash_required if analytics.house_hack else None,
                    "monthly_savings": analytics.house_hack.savings_vs_renting_a if analytics.house_hack else None,
                    "year1_roi": analytics.house_hack.roi_on_savings if analytics.house_hack else None,
                    "risk_level": "Low", "time_horizon": "1+ years", "active_management": "Medium",
                },
                "wholesale": {
                    "name": "Wholesale",
                    "initial_investment": analytics.wholesale.total_cash_at_risk if analytics.wholesale else None,
                    "total_profit": analytics.wholesale.net_profit if analytics.wholesale else None,
                    "roi": analytics.wholesale.roi if analytics.wholesale else None,
                    "risk_level": "Medium", "time_horizon": "30-45 days", "active_management": "High",
                },
            },
            "recommendations": [
                {"profile": "First-time investor, limited capital", "recommended": "House Hacking", "reason": "Lowest down payment (3.5% FHA), live for free while building equity"},
                {"profile": "Passive income, long-term wealth", "recommended": "Long-Term Rental", "reason": "Stable cash flow, low management, appreciation + principal paydown"},
                {"profile": "Maximize revenue in tourism area", "recommended": "Short-Term Rental", "reason": "Higher revenue potential if market supports STR"},
                {"profile": "Scale portfolio quickly", "recommended": "BRRRR", "reason": "Recycle capital to buy multiple properties"},
                {"profile": "Active investor, quick profits", "recommended": "Fix & Flip", "reason": "Fast returns but requires renovation expertise"},
                {"profile": "No capital, strong network", "recommended": "Wholesale", "reason": "No money down, earn assignment fees"},
            ],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
