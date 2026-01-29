"""
Defaults router for public access to system defaults and market assumptions.
"""

import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.defaults import get_all_defaults
from app.services.assumptions_service import get_market_adjustments
from app.core.deps import OptionalUser, DbSession
from app.services.user_service import user_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/defaults", tags=["Defaults"])


# ===========================================
# Response Schemas
# ===========================================

class ResolvedDefaultsResponse(BaseModel):
    """Fully resolved defaults including market adjustments and user preferences."""
    system_defaults: Dict[str, Any]
    market_adjustments: Optional[Dict[str, Any]] = None
    user_overrides: Optional[Dict[str, Any]] = None
    resolved: Dict[str, Any]
    zip_code: Optional[str] = None
    region: Optional[str] = None


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Deep merge two dictionaries."""
    result = {**base}
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


# ===========================================
# Public Endpoints
# ===========================================

@router.get(
    "",
    response_model=Dict[str, Any],
    summary="Get system defaults"
)
async def get_system_defaults():
    """
    Get the system default assumptions.
    
    These are the base default values used across all calculations.
    No authentication required.
    
    Returns defaults for:
    - **financing**: Down payment, interest rate, loan terms
    - **operating**: Vacancy, management, maintenance, insurance
    - **str**: Short-term rental specific (platform fees, cleaning, etc.)
    - **rehab**: Renovation budget, contingency, holding costs
    - **brrrr**: Refinance terms, buy discount
    - **flip**: Hard money terms, selling costs
    - **house_hack**: FHA terms, units rented
    - **wholesale**: Assignment fee, marketing, closing timeline
    - **growth**: Appreciation, rent growth, expense growth
    """
    return get_all_defaults()


@router.get(
    "/resolved",
    response_model=ResolvedDefaultsResponse,
    summary="Get resolved defaults for location"
)
async def get_resolved_defaults(
    zip_code: Optional[str] = Query(None, description="ZIP code for market adjustments"),
    current_user: OptionalUser = None,
    db: DbSession = None
):
    """
    Get fully resolved defaults for a specific location.
    
    Resolution order (later overrides earlier):
    1. **System defaults** - Base values from the platform
    2. **Market adjustments** - ZIP-code based adjustments (insurance, vacancy, appreciation)
    3. **User profile overrides** - User's saved preferences (if authenticated)
    
    Returns the merged defaults ready for use in calculations.
    
    **Example response:**
    ```json
    {
        "system_defaults": { ... },
        "market_adjustments": {
            "region": "FL_SOUTH",
            "insurance_rate": 0.018,
            "vacancy_rate": 0.05
        },
        "user_overrides": {
            "financing": { "down_payment_pct": 0.25 }
        },
        "resolved": { ... merged result ... },
        "zip_code": "33139",
        "region": "FL_SOUTH"
    }
    ```
    """
    # Start with system defaults
    system_defaults = get_all_defaults()
    resolved = {**system_defaults}
    
    # Apply market adjustments if ZIP code provided
    market_adjustments = None
    region = None
    if zip_code:
        market_adjustments = get_market_adjustments(zip_code)
        if market_adjustments:
            region = market_adjustments.get("region")
            # Apply relevant market adjustments to operating defaults
            if "operating" not in resolved:
                resolved["operating"] = {}
            if "growth" not in resolved:
                resolved["growth"] = {}
            
            if "insurance_rate" in market_adjustments:
                resolved["operating"]["insurance_pct"] = market_adjustments["insurance_rate"]
            if "vacancy_rate" in market_adjustments:
                resolved["operating"]["vacancy_rate"] = market_adjustments["vacancy_rate"]
            if "appreciation_rate" in market_adjustments:
                resolved["growth"]["appreciation_rate"] = market_adjustments["appreciation_rate"]
    
    # Apply user overrides if authenticated
    user_overrides = None
    if current_user and db:
        try:
            profile = await user_service.get_or_create_profile(db, str(current_user.id))
            if profile and profile.default_assumptions:
                user_overrides = profile.default_assumptions
                # Deep merge user overrides
                resolved = _deep_merge(resolved, user_overrides)
        except Exception as e:
            logger.warning(f"Failed to load user assumptions: {e}")
    
    return ResolvedDefaultsResponse(
        system_defaults=system_defaults,
        market_adjustments=market_adjustments,
        user_overrides=user_overrides,
        resolved=resolved,
        zip_code=zip_code,
        region=region
    )


@router.get(
    "/market/{zip_code}",
    response_model=Dict[str, Any],
    summary="Get market-specific adjustments"
)
async def get_market_defaults(zip_code: str):
    """
    Get market-specific adjustments for a ZIP code.
    
    Returns location-based adjustments for:
    - **insurance_rate**: Insurance as % of property value
    - **property_tax_rate**: Effective property tax rate
    - **vacancy_rate**: Expected vacancy rate for the market
    - **rent_to_price_ratio**: Expected rent/price ratio
    - **appreciation_rate**: Expected annual appreciation
    
    These values are based on regional market analysis and
    override system defaults for more accurate calculations.
    """
    adjustments = get_market_adjustments(zip_code)
    return adjustments
