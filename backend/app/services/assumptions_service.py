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

# Regional market adjustments (tax, rent/price, appreciation, vacancy).
# Insurance is handled globally via ``OPERATING.insurance_pct`` — not ZIP tables.
_DEFAULT_ADJ: dict[str, Any] = {
    "property_tax_rate": 0.012,
    "rent_to_price_ratio": 0.008,
    "appreciation_rate": 0.04,
    "vacancy_rate": 0.07,
}

MARKET_ADJUSTMENTS: dict[str, dict[str, Any]] = {
    # ── Southeast ────────────────────────────────────────────────
    "AL": {**_DEFAULT_ADJ},
    "AR": {**_DEFAULT_ADJ},
    "FL": {
        "property_tax_rate": 0.01,
        "rent_to_price_ratio": 0.007,
        "appreciation_rate": 0.05,
        "vacancy_rate": 0.06,
    },
    "FL_SOUTH": {
        "property_tax_rate": 0.012,
        "rent_to_price_ratio": 0.006,
        "appreciation_rate": 0.06,
        "vacancy_rate": 0.05,
    },
    "GA": {
        "property_tax_rate": 0.012,
        "rent_to_price_ratio": 0.008,
        "appreciation_rate": 0.045,
        "vacancy_rate": 0.07,
    },
    "KY": {**_DEFAULT_ADJ},
    "LA": {**_DEFAULT_ADJ},
    "MS": {**_DEFAULT_ADJ},
    "NC": {**_DEFAULT_ADJ},
    "SC": {**_DEFAULT_ADJ},
    "TN": {**_DEFAULT_ADJ},
    "VA": {**_DEFAULT_ADJ},
    "WV": {**_DEFAULT_ADJ},
    # ── Southwest / South Central ────────────────────────────────
    "AZ": {**_DEFAULT_ADJ},
    "NM": {**_DEFAULT_ADJ},
    "OK": {**_DEFAULT_ADJ},
    "TX": {
        "property_tax_rate": 0.022,
        "rent_to_price_ratio": 0.009,
        "appreciation_rate": 0.04,
        "vacancy_rate": 0.07,
    },
    # ── Midwest / Plains ─────────────────────────────────────────
    "IA": {**_DEFAULT_ADJ},
    "IL": {**_DEFAULT_ADJ},
    "IN": {**_DEFAULT_ADJ},
    "KS": {**_DEFAULT_ADJ},
    "MI": {**_DEFAULT_ADJ},
    "MN": {**_DEFAULT_ADJ},
    "MO": {**_DEFAULT_ADJ},
    "ND": {**_DEFAULT_ADJ},
    "NE": {**_DEFAULT_ADJ},
    "OH": {**_DEFAULT_ADJ},
    "SD": {**_DEFAULT_ADJ},
    "WI": {**_DEFAULT_ADJ},
    # ── Northeast ────────────────────────────────────────────────
    "CT": {**_DEFAULT_ADJ},
    "DC": {**_DEFAULT_ADJ},
    "DE": {**_DEFAULT_ADJ},
    "MA": {**_DEFAULT_ADJ},
    "MD": {**_DEFAULT_ADJ},
    "ME": {**_DEFAULT_ADJ},
    "NH": {**_DEFAULT_ADJ},
    "NJ": {**_DEFAULT_ADJ},
    "NY": {**_DEFAULT_ADJ},
    "PA": {**_DEFAULT_ADJ},
    "RI": {**_DEFAULT_ADJ},
    "VT": {**_DEFAULT_ADJ},
    # ── West / Mountain ──────────────────────────────────────────
    "AK": {**_DEFAULT_ADJ},
    "CA": {
        "property_tax_rate": 0.0075,
        "rent_to_price_ratio": 0.004,
        "appreciation_rate": 0.04,
        "vacancy_rate": 0.04,
    },
    "CO": {**_DEFAULT_ADJ},
    "HI": {**_DEFAULT_ADJ},
    "ID": {**_DEFAULT_ADJ},
    "MT": {**_DEFAULT_ADJ},
    "NV": {**_DEFAULT_ADJ},
    "OR": {**_DEFAULT_ADJ},
    "UT": {**_DEFAULT_ADJ},
    "WA": {**_DEFAULT_ADJ},
    "WY": {**_DEFAULT_ADJ},
    # ── National fallback ────────────────────────────────────────
    "DEFAULT": {
        "property_tax_rate": 0.012,
        "rent_to_price_ratio": 0.008,
        "appreciation_rate": 0.04,
        "vacancy_rate": 0.07,
    },
}

# South Florida zip code prefixes (330xx - 334xx, 339xx)
SOUTH_FLORIDA_ZIPS = {"330", "331", "332", "333", "334", "339"}


def get_state_from_zip(zip_code: str) -> str:
    """Map a ZIP code to a two-letter state/region key.

    Uses standard USPS ZIP prefix ranges. Returns ``"DEFAULT"`` for
    unrecognised or missing codes.
    """
    if not zip_code or len(zip_code) < 3:
        return "DEFAULT"

    prefix = zip_code[:3]
    prefix_int = int(prefix) if prefix.isdigit() else 0

    # Northeast
    if 10 <= prefix_int <= 27:
        return "MA"
    if 28 <= prefix_int <= 29:
        return "RI"
    if 30 <= prefix_int <= 38:
        return "NH"
    if 39 <= prefix_int <= 49:
        return "ME"
    if 50 <= prefix_int <= 59:
        return "VT"
    if 60 <= prefix_int <= 69:
        return "CT"
    if 70 <= prefix_int <= 89:
        return "NJ"
    if 100 <= prefix_int <= 149:
        return "NY"
    if 150 <= prefix_int <= 196:
        return "PA"
    if 197 <= prefix_int <= 199:
        return "DE"

    # Mid-Atlantic / DC / VA / WV
    if 200 <= prefix_int <= 205:
        return "DC"
    if 206 <= prefix_int <= 219:
        return "MD"
    if 220 <= prefix_int <= 246:
        return "VA"
    if 247 <= prefix_int <= 268:
        return "WV"

    # Carolinas
    if 270 <= prefix_int <= 289:
        return "NC"
    if 290 <= prefix_int <= 299:
        return "SC"

    # Southeast
    if 300 <= prefix_int <= 319:
        return "GA"
    if 320 <= prefix_int <= 349:
        if prefix in SOUTH_FLORIDA_ZIPS:
            return "FL_SOUTH"
        return "FL"
    if 350 <= prefix_int <= 369:
        return "AL"
    if 370 <= prefix_int <= 385:
        return "TN"
    if 386 <= prefix_int <= 397:
        return "MS"
    if 398 <= prefix_int <= 399:
        return "GA"

    # East Central
    if 400 <= prefix_int <= 427:
        return "KY"
    if 430 <= prefix_int <= 459:
        return "OH"
    if 460 <= prefix_int <= 479:
        return "IN"
    if 480 <= prefix_int <= 499:
        return "MI"

    # Upper Midwest
    if 500 <= prefix_int <= 528:
        return "IA"
    if 530 <= prefix_int <= 549:
        return "WI"
    if 550 <= prefix_int <= 567:
        return "MN"
    if 570 <= prefix_int <= 577:
        return "SD"
    if 580 <= prefix_int <= 588:
        return "ND"
    if 590 <= prefix_int <= 599:
        return "MT"

    # Central
    if 600 <= prefix_int <= 629:
        return "IL"
    if 630 <= prefix_int <= 658:
        return "MO"
    if 660 <= prefix_int <= 679:
        return "KS"
    if 680 <= prefix_int <= 693:
        return "NE"

    # South Central
    if 700 <= prefix_int <= 714:
        return "LA"
    if 716 <= prefix_int <= 729:
        return "AR"
    if 730 <= prefix_int <= 749:
        return "OK"
    if 750 <= prefix_int <= 799:
        return "TX"

    # Mountain
    if 800 <= prefix_int <= 816:
        return "CO"
    if 820 <= prefix_int <= 831:
        return "WY"
    if 832 <= prefix_int <= 838:
        return "ID"
    if 840 <= prefix_int <= 847:
        return "UT"
    if 850 <= prefix_int <= 865:
        return "AZ"
    if 870 <= prefix_int <= 884:
        return "NM"
    if 889 <= prefix_int <= 898:
        return "NV"

    # Pacific
    if 900 <= prefix_int <= 961:
        return "CA"
    if 967 <= prefix_int <= 968:
        return "HI"
    if 970 <= prefix_int <= 979:
        return "OR"
    if 980 <= prefix_int <= 994:
        return "WA"
    if 995 <= prefix_int <= 999:
        return "AK"

    return "DEFAULT"


def get_market_adjustments(zip_code: str) -> dict[str, Any]:
    """
    Get market-specific adjustment factors for a zip code.
    Returns factors like property_tax_rate, rent_to_price_ratio, etc.
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
