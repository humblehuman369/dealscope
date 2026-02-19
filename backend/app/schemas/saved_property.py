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
        max_length=100,
        description="ID from property service cache"
    )
    zpid: Optional[str] = Field(None, max_length=50, description="Zillow property ID")
    
    # Address (required)
    address_street: str = Field(..., max_length=255)
    address_city: Optional[str] = Field(None, max_length=100)
    address_state: Optional[str] = Field(None, max_length=10)
    address_zip: Optional[str] = Field(None, max_length=20)
    full_address: Optional[str] = Field(None, max_length=500)
    
    # Property data snapshot — capped to prevent oversized payloads.
    # A typical property snapshot is ~5-15 KB; 512 KB is generous headroom.
    property_data_snapshot: Optional[Dict[str, Any]] = Field(
        None,
        description="Full property data at time of save (max ~512 KB serialized)",
    )
    
    # Deal Maker Record - the central analysis data structure
    # If provided, will be stored as-is. If not, will be created from property data + defaults
    deal_maker_record: Optional[DealMakerRecord] = Field(
        None,
        description="Central analysis record with property data + assumptions + adjustments",
    )
    
    # Initial status
    status: PropertyStatus = PropertyStatus.WATCHING

    @classmethod
    def _check_json_size(cls, v: Optional[Dict], field_name: str, max_bytes: int = 524_288) -> Optional[Dict]:
        """Reject JSON payloads exceeding *max_bytes* (default 512 KB)."""
        if v is not None:
            import json
            size = len(json.dumps(v, default=str))
            if size > max_bytes:
                raise ValueError(
                    f"{field_name} payload is {size:,} bytes — "
                    f"max allowed is {max_bytes:,} bytes"
                )
        return v

    from pydantic import model_validator

    @model_validator(mode="after")
    def _enforce_json_limits(self) -> "SavedPropertyCreate":
        """Validate that JSON blob fields don't exceed size limits."""
        self._check_json_size(self.property_data_snapshot, "property_data_snapshot")
        if self.deal_maker_record is not None:
            import json
            size = len(json.dumps(self.deal_maker_record.model_dump(mode="json"), default=str))
            if size > 524_288:
                raise ValueError(
                    f"deal_maker_record payload is {size:,} bytes — "
                    f"max allowed is 524,288 bytes"
                )
        return self


class SavedPropertyUpdate(SavedPropertyBase):
    """Schema for updating a saved property."""
    
    status: Optional[PropertyStatus] = None
    display_order: Optional[int] = None
    
    # Custom value adjustments (DEPRECATED - use deal_maker_record)
    custom_purchase_price: Optional[float] = Field(None, ge=0, le=100_000_000)
    custom_rent_estimate: Optional[float] = Field(None, ge=0, le=1_000_000)
    custom_arv: Optional[float] = Field(None, ge=0, le=100_000_000)
    custom_rehab_budget: Optional[float] = Field(None, ge=0, le=100_000_000)
    custom_daily_rate: Optional[float] = Field(None, ge=0, le=100_000)
    custom_occupancy_rate: Optional[float] = Field(None, ge=0, le=1)
    
    # Custom assumptions per strategy (DEPRECATED - use deal_maker_record)
    custom_assumptions: Optional[Dict[str, Any]] = None
    
    # Deal Maker Record - the central analysis data structure
    deal_maker_record: Optional[DealMakerRecord] = Field(
        None,
        description="Central analysis record - replaces custom_assumptions",
    )

    from pydantic import model_validator

    @model_validator(mode="after")
    def _enforce_json_limits(self) -> "SavedPropertyUpdate":
        """Validate that JSON blob fields don't exceed 512 KB."""
        import json
        _max = 524_288
        for field_name in ("custom_assumptions",):
            val = getattr(self, field_name, None)
            if val is not None:
                size = len(json.dumps(val, default=str))
                if size > _max:
                    raise ValueError(f"{field_name} payload is {size:,} bytes — max is {_max:,}")
        if self.deal_maker_record is not None:
            size = len(json.dumps(self.deal_maker_record.model_dump(mode="json"), default=str))
            if size > _max:
                raise ValueError(f"deal_maker_record payload is {size:,} bytes — max is {_max:,}")
        return self


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

