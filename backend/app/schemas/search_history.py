"""
Search History schemas for API requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class SearchResultSummary(BaseModel):
    """Summary of property search result for quick display."""
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_footage: Optional[int] = None
    estimated_value: Optional[float] = None
    rent_estimate: Optional[float] = None
    year_built: Optional[int] = None
    thumbnail_url: Optional[str] = None


class SearchHistoryCreate(BaseModel):
    """Schema for creating a search history entry."""
    search_query: str = Field(..., min_length=5, max_length=500)
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    property_cache_id: Optional[str] = None
    zpid: Optional[str] = None
    result_summary: Optional[Dict[str, Any]] = None
    search_source: str = Field(default="web", pattern="^(web|mobile|api|scanner)$")
    was_successful: bool = True
    error_message: Optional[str] = None


class SearchHistoryResponse(BaseModel):
    """Schema for search history response."""
    id: str
    user_id: Optional[str]
    search_query: str
    address_street: Optional[str]
    address_city: Optional[str]
    address_state: Optional[str]
    address_zip: Optional[str]
    property_cache_id: Optional[str]
    zpid: Optional[str]
    result_summary: Optional[Dict[str, Any]]
    search_source: Optional[str]
    was_successful: bool
    was_saved: bool
    searched_at: datetime
    
    class Config:
        from_attributes = True


class SearchHistoryList(BaseModel):
    """Paginated list of search history."""
    items: List[SearchHistoryResponse]
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
    top_markets: List[Dict[str, Any]]  # [{state: "FL", count: 15}, ...]
    recent_searches: List[SearchHistoryResponse]

