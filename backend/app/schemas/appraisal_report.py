"""
Appraisal Report schemas — request model for generating comp-based appraisal PDFs.
"""

from pydantic import BaseModel, Field


class AppraisalCompAdjustment(BaseModel):
    """Per-comp adjustment details matching the frontend CompAdjustment type."""

    comp_address: str
    base_price: float
    size_adjustment: float
    bedroom_adjustment: float
    bathroom_adjustment: float
    age_adjustment: float
    lot_adjustment: float
    total_adjustment: float
    adjusted_price: float
    price_per_sqft: float
    similarity_score: float
    weight: float
    beds: int = 0
    baths: float = 0
    sqft: int = 0
    year_built: int = 0
    sale_date: str | None = None
    distance_miles: float | None = None


class AppraisalReportRequest(BaseModel):
    """Payload sent from the frontend to generate an appraisal-style PDF."""

    subject_address: str
    subject_beds: int = 0
    subject_baths: float = 0
    subject_sqft: int = 0
    subject_year_built: int = 0
    subject_lot_size: float = 0
    subject_property_type: str | None = None
    list_price: float | None = None
    rehab_cost: float | None = None
    image_url: str | None = None

    market_value: float
    arv: float
    confidence: float = Field(ge=0, le=100)
    range_low: float
    range_high: float
    adjusted_price_value: float
    price_per_sqft_value: float
    weighted_average_ppsf: float

    comp_adjustments: list[AppraisalCompAdjustment]
    theme: str = "light"
