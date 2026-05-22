"""Schemas for downloadable property reports."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.analytics import IQVerdictInput

StrategyKey = Literal["ltr", "str", "brrrr", "flip", "house_hack", "wholesale"]


class ComprehensiveExcelRequest(BaseModel):
    """Request body for Strategy page comprehensive Excel export."""

    address: str = Field(..., description="Property address for cache lookup fallback")
    active_strategy: StrategyKey = Field("ltr", description="Active strategy — its worksheet is listed first")
    verdict_input: IQVerdictInput = Field(..., description="Current worksheet / verdict analysis inputs")
    saved_property_id: str | None = Field(
        None,
        description="When set, merge persisted deal_maker_record under live verdict_input",
    )
    include_sensitivity: bool = Field(True, description="Include sensitivity analysis sheet")
