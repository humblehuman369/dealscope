"""
SavedProperty schemas for user's property portfolio management.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from app.schemas.deal_maker import DealMakerRecord, DealMakerRecordCreate


class PropertyStatus(str, Enum):
    """Status of a saved property."""
    WATCHING = "watching"
    ANALYZING = "analyzing"
    CONTACTED = "contacted"
    UNDER_CONTRACT = "under_contract"
    OWNED = "owned"
    PASSED = "passed"
    ARCHIVED = "archived"


# ===========================================
# Saved Property Schemas
# ===========================================

class SavedPropertyBase(BaseModel):
    """Base saved property fields."""
    nickname: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    color_label: Optional[str] = Field(
        None, 
        pattern="^(red|green|blue|yellow|purple|orange|gray)$"
    )
    priority: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class SavedPropertyCreate(SavedPropertyBase):
    """Schema for saving a property."""
    
    # Property identification
    external_property_id: Optional[str] = Field(
        None, 
        description="ID from property service cache"
    )
    zpid: Optional[str] = Field(None, description="Zillow property ID")
    
    # Address (required)
    address_street: str = Field(..., max_length=255)
    address_city: Optional[str] = Field(None, max_length=100)
    address_state: Optional[str] = Field(None, max_length=10)
    address_zip: Optional[str] = Field(None, max_length=20)
    full_address: Optional[str] = Field(None, max_length=500)
    
    # Property data snapshot
    property_data_snapshot: Optional[Dict[str, Any]] = Field(
        None,
        description="Full property data at time of save"
    )
    
    # Deal Maker Record - the central analysis data structure
    # If provided, will be stored as-is. If not, will be created from property data + defaults
    deal_maker_record: Optional[DealMakerRecord] = Field(
        None,
        description="Central analysis record with property data + assumptions + adjustments"
    )
    
    # Initial status
    status: PropertyStatus = PropertyStatus.WATCHING


class SavedPropertyUpdate(SavedPropertyBase):
    """Schema for updating a saved property."""
    
    status: Optional[PropertyStatus] = None
    display_order: Optional[int] = None
    
    # Custom value adjustments (DEPRECATED - use deal_maker_record)
    custom_purchase_price: Optional[float] = Field(None, ge=0)
    custom_rent_estimate: Optional[float] = Field(None, ge=0)
    custom_arv: Optional[float] = Field(None, ge=0)
    custom_rehab_budget: Optional[float] = Field(None, ge=0)
    custom_daily_rate: Optional[float] = Field(None, ge=0)
    custom_occupancy_rate: Optional[float] = Field(None, ge=0, le=1)
    
    # Custom assumptions per strategy (DEPRECATED - use deal_maker_record)
    custom_assumptions: Optional[Dict[str, Any]] = None
    
    # Worksheet assumptions (DEPRECATED - use deal_maker_record)
    worksheet_assumptions: Optional[Dict[str, Any]] = None
    
    # Deal Maker Record - the central analysis data structure
    deal_maker_record: Optional[DealMakerRecord] = Field(
        None,
        description="Central analysis record - replaces custom_assumptions and worksheet_assumptions"
    )


class SavedPropertySummary(BaseModel):
    """Summary view of saved property for list views."""
    
    id: str
    address_street: str
    address_city: Optional[str]
    address_state: Optional[str]
    address_zip: Optional[str]
    nickname: Optional[str]
    status: PropertyStatus
    tags: Optional[List[str]]
    color_label: Optional[str]
    priority: Optional[int]
    
    # Quick metrics
    best_strategy: Optional[str]
    best_cash_flow: Optional[float]
    best_coc_return: Optional[float]
    
    # Timestamps
    saved_at: datetime
    last_viewed_at: Optional[datetime]
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @property
    def display_name(self) -> str:
        """Return nickname or address."""
        return self.nickname or self.address_street


class SavedPropertyResponse(SavedPropertySummary):
    """Full saved property response."""
    
    user_id: str
    external_property_id: Optional[str]
    zpid: Optional[str]
    full_address: Optional[str]
    
    # Full property data
    property_data_snapshot: Optional[Dict[str, Any]]
    
    # Custom adjustments (DEPRECATED - use deal_maker_record)
    custom_purchase_price: Optional[float]
    custom_rent_estimate: Optional[float]
    custom_arv: Optional[float]
    custom_rehab_budget: Optional[float]
    custom_daily_rate: Optional[float]
    custom_occupancy_rate: Optional[float]
    custom_assumptions: Optional[Dict[str, Any]]
    
    # Worksheet assumptions (DEPRECATED - use deal_maker_record)
    worksheet_assumptions: Optional[Dict[str, Any]]
    
    # Deal Maker Record - the central analysis data structure
    deal_maker_record: Optional[DealMakerRecord] = Field(
        None,
        description="Central analysis record with property data + assumptions + user adjustments"
    )
    
    # Notes
    notes: Optional[str]
    
    # Analytics cache
    last_analytics_result: Optional[Dict[str, Any]]
    analytics_calculated_at: Optional[datetime]
    
    # Refresh timestamp
    data_refreshed_at: Optional[datetime]
    
    # Related counts
    document_count: int = 0
    adjustment_count: int = 0
    
    class Config:
        from_attributes = True


# ===========================================
# Property Adjustment Schemas
# ===========================================

class PropertyAdjustmentCreate(BaseModel):
    """Schema for creating a property adjustment record."""
    
    adjustment_type: str = Field(
        ...,
        description="Type: purchase_price, rent, arv, assumptions, status, notes"
    )
    field_name: Optional[str] = Field(
        None,
        description="Specific field changed within type"
    )
    previous_value: Optional[Any] = None
    new_value: Optional[Any] = None
    reason: Optional[str] = Field(
        None,
        description="User's explanation for the change"
    )


class PropertyAdjustmentResponse(PropertyAdjustmentCreate):
    """Schema for adjustment response."""
    
    id: str
    property_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ===========================================
# Bulk Operations
# ===========================================

class BulkStatusUpdate(BaseModel):
    """Schema for bulk status update."""
    
    property_ids: List[str] = Field(..., min_length=1)
    status: PropertyStatus


class BulkTagUpdate(BaseModel):
    """Schema for bulk tag update."""
    
    property_ids: List[str] = Field(..., min_length=1)
    add_tags: Optional[List[str]] = None
    remove_tags: Optional[List[str]] = None

