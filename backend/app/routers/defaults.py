"""
Defaults router for public access to system defaults and market assumptions.
"""

import logging
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.defaults import get_all_defaults
from app.core.deps import DbSession, OptionalUser
from app.services.assumption_resolver import resolve_assumption_layers
from app.services.assumptions_service import (
    get_default_assumptions,
    get_market_adjustments,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/defaults", tags=["Defaults"])


# ===========================================
# Response Schemas
# ===========================================


class ResolvedDefaultsResponse(BaseModel):
    """Fully resolved defaults including market adjustments and user preferences."""

    system_defaults: dict[str, Any]
    market_adjustments: dict[str, Any] | None = None
    user_overrides: dict[str, Any] | None = None
    resolved: dict[str, Any]
    zip_code: str | None = None
    region: str | None = None


# ===========================================
# Public Endpoints
# ===========================================


@router.get("", response_model=dict[str, Any], summary="Get system defaults")
async def get_system_defaults(db: DbSession = None):
    """
    Get the default assumptions used across the platform.

    Returns the admin-configured defaults (set via `/admin/assumptions`),
    falling back to the hardcoded schema defaults in `app/core/defaults.py`
    when no admin record exists or DB is unavailable. No authentication
    required — this endpoint is the source the frontend uses to seed
    Deal Maker sliders and analytics on initial load.

    Returns defaults for:
    - **financing**: Down payment, interest rate, loan terms
    - **operating**: Vacancy, management, maintenance, capex, insurance
    - **str**: Short-term rental specific (platform fees, cleaning, etc.)
    - **rehab**: Renovation budget, contingency, holding costs
    - **brrrr**: Refinance terms, buy discount
    - **flip**: Hard money terms, selling costs
    - **house_hack**: FHA terms, units rented
    - **wholesale**: Assignment fee, marketing, closing timeline
    - **growth**: Appreciation, rent growth, expense growth
    """
    if db is None:
        return get_all_defaults()
    try:
        admin_assumptions = await get_default_assumptions(db)
        return admin_assumptions.model_dump(by_alias=True)
    except Exception as e:
        logger.warning(f"Failed to load admin assumptions, using schema defaults: {e}")
        return get_all_defaults()


@router.get("/resolved", response_model=ResolvedDefaultsResponse, summary="Get resolved defaults for location")
async def get_resolved_defaults(
    zip_code: str | None = Query(None, description="ZIP code for market adjustments"),
    current_user: OptionalUser = None,
    db: DbSession = None,
):
    """
    Get fully resolved defaults for a specific location.

    Resolution order (later overrides earlier):
    1. **Schema defaults** - Hardcoded base values from `app/core/defaults.py`
    2. **Admin defaults** - Org-wide values saved via `/admin/assumptions` (DB-backed)
    3. **Market adjustments** - ZIP-code based adjustments (vacancy, appreciation, tax hints)
    4. **User profile overrides** - User's saved preferences (if authenticated)

    The `system_defaults` field in the response always reflects layers 1+2 (the
    "starting line" before market and user customization), so the frontend can
    reason about whether a value was tuned by the admin vs. is purely schema.

    **Example response:**
    ```json
    {
        "system_defaults": { ... },
        "market_adjustments": {
            "region": "FL_SOUTH",
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
    if db is None:
        schema_defaults = get_all_defaults()
        return ResolvedDefaultsResponse(
            system_defaults=schema_defaults,
            resolved=schema_defaults,
            zip_code=zip_code,
        )

    try:
        layers = await resolve_assumption_layers(db, user=current_user, zip_code=zip_code)
    except Exception as e:
        # Seeding the UI with schema defaults beats failing the whole screen.
        logger.warning(f"Failed to resolve assumptions, using schema defaults: {e}")
        schema_defaults = get_all_defaults()
        return ResolvedDefaultsResponse(
            system_defaults=schema_defaults,
            resolved=schema_defaults,
            zip_code=zip_code,
        )

    return ResolvedDefaultsResponse(
        system_defaults=layers.system_defaults,
        market_adjustments=layers.market_adjustments,
        user_overrides=layers.user_overrides,
        resolved=layers.assumptions.model_dump(by_alias=True),
        zip_code=zip_code,
        region=layers.region,
    )


@router.get("/market/{zip_code}", response_model=dict[str, Any], summary="Get market-specific adjustments")
async def get_market_defaults(zip_code: str):
    """
    Get market-specific adjustments for a ZIP code.

    Returns location-based adjustments for:
    - **property_tax_rate**: Effective property tax rate
    - **vacancy_rate**: Expected vacancy rate for the market
    - **rent_to_price_ratio**: Expected rent/price ratio
    - **appreciation_rate**: Expected annual appreciation

    These values are based on regional market analysis and
    override system defaults for more accurate calculations.
    """
    adjustments = get_market_adjustments(zip_code)
    return adjustments
