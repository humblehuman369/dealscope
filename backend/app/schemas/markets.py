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
    lender_count: int = Field(
        description="All active lenders that lend in the state: state_lender_count + nationwide_lender_count"
    )
    state_lender_count: int = Field(
        description="Active lenders licensed in this state that are not nationwide shops"
    )
    nationwide_lender_count: int = Field(
        description="Active nationwide lenders; the same number for every state"
    )
    buyer_count: int
    has_state_specific_assumptions: bool
    indexable: bool = Field(
        description="True only when the state has its own MARKET_ADJUSTMENTS row and at least one "
        "state-scoped directory section (in-state lenders or in-state buyers)"
    )


class StateMarketDetail(StateMarketSummary):
    assumptions: StateAssumptions
    buyer_cities: list[CityCount] = Field(
        default_factory=list, description="Cities with the most directory cash buyers"
    )
    data_sections: list[str] = Field(
        description="Which sections carry state-scoped data: assumptions, lenders, buyers. "
        "Nationwide lenders do not make a state's lenders section."
    )
    generated_at: str


class StateMarketListResponse(BaseModel):
    states: list[StateMarketSummary]
    generated_at: str
