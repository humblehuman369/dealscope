"""Response shapes for the public /api/v1/markets endpoints (state market pages)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class StateAssumptions(BaseModel):
    """Market adjustments DealGapIQ applies to properties in a state."""

    property_tax_rate: float = Field(description="Effective annual property tax as a fraction of value")
    rent_to_price_ratio: float = Field(description="Monthly rent as a fraction of price")
    appreciation_rate: float = Field(description="Assumed annual appreciation")
    vacancy_rate: float = Field(description="Assumed annual vacancy")
    is_state_specific: bool = Field(
        description="True when the state has its own row in MARKET_ADJUSTMENTS; "
        "False when the national baseline applies"
    )


class CityCount(BaseModel):
    city: str
    count: int


class StateMarketSummary(BaseModel):
    code: str
    name: str
    slug: str
    lender_count: int
    buyer_count: int
    has_state_specific_assumptions: bool
    indexable: bool


class StateMarketDetail(StateMarketSummary):
    assumptions: StateAssumptions
    buyer_cities: list[CityCount] = Field(
        default_factory=list, description="Cities with the most directory cash buyers"
    )
    data_sections: list[str] = Field(description="Which sections have real data: assumptions, lenders, buyers")
    generated_at: str


class StateMarketListResponse(BaseModel):
    states: list[StateMarketSummary]
    generated_at: str
