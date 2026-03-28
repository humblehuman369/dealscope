"""
Rehab Estimator endpoints.

Provides regional cost context (labor/material/permit multipliers) for the
frontend Rehab Estimator. Intentionally separate from the Defaults router
which serves financial assumptions (insurance, vacancy, appreciation).
"""

import logging
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.regional_cost_service import get_regional_cost_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rehab", tags=["Rehab"])


class RegionalCostContextResponse(BaseModel):
    region_id: str
    market_label: str
    labor_factor: float
    material_factor: float
    permit_factor: float
    combined_factor: float
    confidence: str
    confidence_score: float
    data_sources: list[str]
    last_updated: str


@router.get(
    "/cost-context",
    response_model=RegionalCostContextResponse,
    summary="Get regional construction cost factors",
)
async def get_cost_context(
    zip_code: str = Query(..., description="ZIP code for cost factor lookup"),
) -> dict[str, Any]:
    """
    Returns labor, material, and permit cost multipliers for a given ZIP code.

    Uses a tiered lookup (ZIP → 3-digit prefix → state → national baseline)
    with confidence scoring so the frontend can communicate estimate reliability.

    Factors are relative to the national average (1.0):
    - **labor_factor**: Local labor cost multiplier
    - **material_factor**: Local material cost multiplier
    - **permit_factor**: Local permitting cost multiplier
    - **combined_factor**: Weighted composite (55% labor, 35% material, 10% permit)
    - **confidence**: "high" | "medium" | "low"
    - **confidence_score**: 0-1 numeric confidence
    """
    return get_regional_cost_context(zip_code)
