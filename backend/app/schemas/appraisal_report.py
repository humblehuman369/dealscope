"""
URAR Form 1004 Appraisal Report schemas.

Expanded request model to support the full Form 1004 structure:
Subject, Neighborhood, Site, Improvements, Sales Comparison,
Reconciliation, Income Approach, Cost Approach, and Additional Comments.
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
    gross_adjustment_pct: float | None = None
    net_adjustment_pct: float | None = None


class PropertyDetailsPayload(BaseModel):
    """Expanded property details for Form 1004 Improvements section."""

    stories: int | None = None
    heating_type: str | None = None
    cooling_type: str | None = None
    has_garage: bool | None = None
    garage_spaces: int | None = None
    exterior_type: str | None = None
    roof_type: str | None = None
    foundation_type: str | None = None
    has_fireplace: bool | None = None
    has_pool: bool | None = None
    parking_type: str | None = None
    hoa_fees_monthly: float | None = None


class SiteDataPayload(BaseModel):
    """Site data for Form 1004 Site section (requires external sources)."""

    zoning_classification: str | None = None
    zoning_compliance: str | None = None
    flood_zone: str | None = None
    fema_map_number: str | None = None
    fema_map_date: str | None = None
    water: str | None = None
    sewer: str | None = None
    gas: str | None = None
    electricity: str | None = None
    topography: str | None = None
    lot_shape: str | None = None
    view: str | None = None
    easements: str | None = None
    encroachments: str | None = None


class CostDataPayload(BaseModel):
    """Cost approach data (requires cost service like Marshall & Swift)."""

    replacement_cost_per_sqft: float | None = None
    total_cost_new: float | None = None
    site_value: float | None = None
    site_value_source: str | None = None
    physical_depreciation_pct: float | None = None
    functional_depreciation: float | None = None
    external_depreciation: float | None = None


class MarketStatsPayload(BaseModel):
    """Market statistics for Neighborhood section."""

    median_days_on_market: int | None = None
    total_listings: int | None = None
    new_listings: int | None = None
    median_price: float | None = None
    avg_price_per_sqft: float | None = None
    market_temperature: str | None = None


class RentalDataPayload(BaseModel):
    """Rental data for Income Approach section."""

    monthly_rent: float | None = None
    rent_range_low: float | None = None
    rent_range_high: float | None = None
    grm: float | None = None
    cap_rate: float | None = None
    noi: float | None = None
    vacancy_rate: float | None = None


class NarrativesPayload(BaseModel):
    """Pre-generated AI narratives (from the endpoint, not sent by frontend)."""

    neighborhood: str | None = None
    site: str | None = None
    improvements: str | None = None
    reconciliation: str | None = None
    income_approach: str | None = None
    cost_approach: str | None = None
    scope_of_work: str | None = None


class AppraisalReportRequest(BaseModel):
    """Payload for generating a URAR Form 1004 appraisal report PDF."""

    # Subject
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

    # Sales Comparison values
    market_value: float
    arv: float
    confidence: float = Field(ge=0, le=100)
    range_low: float
    range_high: float
    adjusted_price_value: float
    price_per_sqft_value: float
    weighted_average_ppsf: float
    comp_adjustments: list[AppraisalCompAdjustment]

    # Expanded data (optional — enhances report if provided)
    property_details: PropertyDetailsPayload | None = None
    market_stats: MarketStatsPayload | None = None
    rental_data: RentalDataPayload | None = None
    site_data: SiteDataPayload | None = None
    cost_data: CostDataPayload | None = None

    # AI-generated narratives (populated by the backend endpoint)
    narratives: NarrativesPayload | None = None

    # Options
    theme: str = "light"
    generate_ai_narratives: bool = False
