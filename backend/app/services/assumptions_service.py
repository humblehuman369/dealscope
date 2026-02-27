"""
Service for managing default assumptions in the database.
Includes market-specific adjustments based on zip code.
"""

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assumption_defaults import AdminAssumptionDefaults
from app.schemas.property import AllAssumptions

logger = logging.getLogger(__name__)

# Market-specific adjustment factors by state/region
# These override default assumptions based on location
MARKET_ADJUSTMENTS: dict[str, dict[str, Any]] = {
    # Florida - higher insurance, lower property taxes in some areas
    "FL": {
        "insurance_rate": 0.015,  # 1.5% of value (higher due to hurricanes)
        "property_tax_rate": 0.01,  # 1.0% effective rate
        "rent_to_price_ratio": 0.007,  # 0.7% (lower in hot markets)
        "appreciation_rate": 0.05,  # 5% appreciation
        "vacancy_rate": 0.06,  # 6% vacancy (tourist areas)
    },
    # South Florida (higher costs, premium market)
    "FL_SOUTH": {
        "insurance_rate": 0.018,  # 1.8% (coastal premium)
        "property_tax_rate": 0.012,
        "rent_to_price_ratio": 0.006,
        "appreciation_rate": 0.06,
        "vacancy_rate": 0.05,
    },
    # Texas - no state income tax, higher property taxes
    "TX": {
        "insurance_rate": 0.012,
        "property_tax_rate": 0.022,  # 2.2% (higher property taxes)
        "rent_to_price_ratio": 0.009,
        "appreciation_rate": 0.04,
        "vacancy_rate": 0.07,
    },
    # California - high prices, lower yields
    "CA": {
        "insurance_rate": 0.008,
        "property_tax_rate": 0.0075,  # Prop 13 limits
        "rent_to_price_ratio": 0.004,  # Very low yields
        "appreciation_rate": 0.04,
        "vacancy_rate": 0.04,
    },
    # Georgia
    "GA": {
        "insurance_rate": 0.01,
        "property_tax_rate": 0.012,
        "rent_to_price_ratio": 0.008,
        "appreciation_rate": 0.045,
        "vacancy_rate": 0.07,
    },
    # Default (national averages)
    "DEFAULT": {
        "insurance_rate": 0.01,  # 1% of value
        "property_tax_rate": 0.012,  # 1.2% average
        "rent_to_price_ratio": 0.008,  # 0.8% (close to 1% rule)
        "appreciation_rate": 0.04,  # 4% historical average
        "vacancy_rate": 0.07,  # 7% vacancy
    },
}

# South Florida zip code prefixes (330xx - 334xx, 339xx)
SOUTH_FLORIDA_ZIPS = {"330", "331", "332", "333", "334", "339"}


def get_state_from_zip(zip_code: str) -> str:
    """
    Determine state from zip code prefix.
    This is a simplified mapping; in production you'd use a proper zip database.
    """
    if not zip_code or len(zip_code) < 3:
        return "DEFAULT"

    prefix = zip_code[:3]
    prefix_int = int(prefix) if prefix.isdigit() else 0

    # Simplified zip to state mapping (major ranges)
    if 100 <= prefix_int <= 149:  # NY/NJ area
        return "NY"
    elif 150 <= prefix_int <= 196:  # PA/DE
        return "PA"
    elif 200 <= prefix_int <= 219:  # DC/MD/VA
        return "VA"
    elif 220 <= prefix_int <= 246:  # VA/WV
        return "VA"
    elif 247 <= prefix_int <= 297:  # NC/SC
        return "NC"
    elif 300 <= prefix_int <= 319:  # GA
        return "GA"
    elif 320 <= prefix_int <= 349:  # FL
        # Check for South Florida
        if prefix in SOUTH_FLORIDA_ZIPS:
            return "FL_SOUTH"
        return "FL"
    elif 350 <= prefix_int <= 369:  # AL
        return "AL"
    elif 370 <= prefix_int <= 385:  # TN
        return "TN"
    elif 386 <= prefix_int <= 397:  # MS
        return "MS"
    elif 700 <= prefix_int <= 714:  # LA
        return "LA"
    elif 750 <= prefix_int <= 799:  # TX
        return "TX"
    elif 800 <= prefix_int <= 816:  # CO
        return "CO"
    elif 850 <= prefix_int <= 865:  # AZ
        return "AZ"
    elif 900 <= prefix_int <= 961:  # CA
        return "CA"
    elif 970 <= prefix_int <= 979:  # OR
        return "OR"
    elif 980 <= prefix_int <= 994:  # WA
        return "WA"

    return "DEFAULT"


def get_market_adjustments(zip_code: str) -> dict[str, Any]:
    """
    Get market-specific adjustment factors for a zip code.
    Returns factors like insurance_rate, property_tax_rate, etc.
    """
    state = get_state_from_zip(zip_code)

    # Get state-specific adjustments or fall back to default
    adjustments = MARKET_ADJUSTMENTS.get(state, MARKET_ADJUSTMENTS["DEFAULT"])

    # Add metadata
    return {
        "zip_code": zip_code,
        "region": state,
        **adjustments,
    }


_ASSUMPTIONS_CACHE_KEY = "defaults:assumptions"
_ASSUMPTIONS_TTL = 600  # 10 minutes — assumptions change very rarely


async def get_default_assumptions(db: AsyncSession) -> AllAssumptions:
    """Fetch default assumptions from DB or fall back to schema defaults.

    Results are cached for 10 minutes via the global CacheService to
    avoid hitting the database on every analytics call.
    """
    from app.services.cache_service import get_cache_service

    cache = get_cache_service()
    cached = await cache.get(_ASSUMPTIONS_CACHE_KEY)
    if cached is not None:
        try:
            return AllAssumptions.model_validate(cached)
        except Exception:
            logger.debug("Stale/corrupt assumptions cache entry — falling through to DB")

    result = await db.execute(
        select(AdminAssumptionDefaults).order_by(AdminAssumptionDefaults.updated_at.desc()).limit(1)
    )
    record = result.scalar_one_or_none()

    if record and record.assumptions:
        try:
            assumptions = AllAssumptions.model_validate(record.assumptions)
            await cache.set(_ASSUMPTIONS_CACHE_KEY, assumptions.model_dump(), _ASSUMPTIONS_TTL)
            return assumptions
        except Exception as exc:
            logger.warning(f"Failed to parse stored assumptions, falling back to defaults: {exc}")

    defaults = AllAssumptions()
    await cache.set(_ASSUMPTIONS_CACHE_KEY, defaults.model_dump(), _ASSUMPTIONS_TTL)
    return defaults


async def get_assumptions_record(db: AsyncSession) -> AdminAssumptionDefaults | None:
    """Return the latest assumptions record if it exists."""
    result = await db.execute(
        select(AdminAssumptionDefaults).order_by(AdminAssumptionDefaults.updated_at.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def upsert_default_assumptions(
    db: AsyncSession,
    assumptions: AllAssumptions,
    updated_by: uuid.UUID | None = None,
) -> AdminAssumptionDefaults:
    """Create or update the stored default assumptions.

    Invalidates the assumptions cache so the next read picks up
    the fresh values immediately.
    """
    record = await get_assumptions_record(db)

    if record is None:
        record = AdminAssumptionDefaults(
            assumptions=assumptions.model_dump(),
            updated_by=updated_by,
        )
        db.add(record)
    else:
        record.assumptions = assumptions.model_dump()
        record.updated_by = updated_by

    await db.commit()
    await db.refresh(record)

    # Invalidate cache so subsequent reads see the new values
    from app.services.cache_service import get_cache_service

    await get_cache_service().delete(_ASSUMPTIONS_CACHE_KEY)

    return record
