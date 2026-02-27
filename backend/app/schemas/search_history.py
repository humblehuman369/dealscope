"""
Search History schemas for API requests and responses.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SearchResultSummary(BaseModel):
    """Summary of property search result for quick display."""

    property_type: str | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    square_footage: int | None = None
    estimated_value: float | None = None
    rent_estimate: float | None = None
    year_built: int | None = None
    thumbnail_url: str | None = None


class SearchHistoryCreate(BaseModel):
    """Schema for creating a search history entry."""

    search_query: str = Field(..., min_length=5, max_length=500)
    address_street: str | None = None
    address_city: str | None = None
    address_state: str | None = None
    address_zip: str | None = None
    property_cache_id: str | None = None
    zpid: str | None = None
    result_summary: dict[str, Any] | None = None
    search_source: str = Field(default="web", pattern="^(web|mobile|api|scanner)$")
    was_successful: bool = True
    error_message: str | None = None


class SearchHistoryResponse(BaseModel):
    """Schema for search history response."""

    id: str
    user_id: str | None
    search_query: str
    address_street: str | None
    address_city: str | None
    address_state: str | None
    address_zip: str | None
    property_cache_id: str | None
    zpid: str | None
    result_summary: dict[str, Any] | None
    search_source: str | None
    was_successful: bool
    was_saved: bool
    searched_at: datetime

    class Config:
        from_attributes = True


class SearchHistoryList(BaseModel):
    """Paginated list of search history."""

    items: list[SearchHistoryResponse]
    total: int
    limit: int
    offset: int


class SearchHistoryStats(BaseModel):
    """Statistics about user's search history."""

    total_searches: int
    successful_searches: int
    saved_from_search: int
    searches_this_week: int
    searches_this_month: int
    top_markets: list[dict[str, Any]]  # [{state: "FL", count: 15}, ...]
    recent_searches: list[SearchHistoryResponse]
