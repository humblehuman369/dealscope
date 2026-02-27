"""
SavedProperty schemas for user's property portfolio management.
"""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.deal_maker import DealMakerRecord


class PropertyStatus(StrEnum):
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

    nickname: str | None = Field(None, max_length=100)
    tags: list[str] | None = None
    color_label: str | None = Field(None, pattern="^(red|green|blue|yellow|purple|orange|gray)$")
    priority: int | None = Field(None, ge=1, le=5)
    notes: str | None = None


class SavedPropertyCreate(SavedPropertyBase):
    """Schema for saving a property."""

    # Property identification
    external_property_id: str | None = Field(None, max_length=100, description="ID from property service cache")
    zpid: str | None = Field(None, max_length=50, description="Zillow property ID")

    # Address (required)
    address_street: str = Field(..., max_length=255)
    address_city: str | None = Field(None, max_length=100)
    address_state: str | None = Field(None, max_length=10)
    address_zip: str | None = Field(None, max_length=20)
    full_address: str | None = Field(None, max_length=500)

    # Property data snapshot — capped to prevent oversized payloads.
    # A typical property snapshot is ~5-15 KB; 512 KB is generous headroom.
    property_data_snapshot: dict[str, Any] | None = Field(
        None,
        description="Full property data at time of save (max ~512 KB serialized)",
    )

    # Deal Maker Record - the central analysis data structure
    # If provided, will be stored as-is. If not, will be created from property data + defaults
    deal_maker_record: DealMakerRecord | None = Field(
        None,
        description="Central analysis record with property data + assumptions + adjustments",
    )

    # Initial status
    status: PropertyStatus = PropertyStatus.WATCHING

    @classmethod
    def _check_json_size(cls, v: dict | None, field_name: str, max_bytes: int = 524_288) -> dict | None:
        """Reject JSON payloads exceeding *max_bytes* (default 512 KB)."""
        if v is not None:
            import json

            size = len(json.dumps(v, default=str))
            if size > max_bytes:
                raise ValueError(f"{field_name} payload is {size:,} bytes — max allowed is {max_bytes:,} bytes")
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
                raise ValueError(f"deal_maker_record payload is {size:,} bytes — max allowed is 524,288 bytes")
        return self


class SavedPropertyUpdate(SavedPropertyBase):
    """Schema for updating a saved property."""

    status: PropertyStatus | None = None
    display_order: int | None = None

    # Custom value adjustments (DEPRECATED - use deal_maker_record)
    custom_purchase_price: Decimal | None = Field(None, ge=0, le=100_000_000)
    custom_rent_estimate: Decimal | None = Field(None, ge=0, le=1_000_000)
    custom_arv: Decimal | None = Field(None, ge=0, le=100_000_000)
    custom_rehab_budget: Decimal | None = Field(None, ge=0, le=100_000_000)
    custom_daily_rate: Decimal | None = Field(None, ge=0, le=100_000)
    custom_occupancy_rate: Decimal | None = Field(None, ge=0, le=1)

    # Custom assumptions per strategy (DEPRECATED - use deal_maker_record)
    custom_assumptions: dict[str, Any] | None = None

    # Deal Maker Record - the central analysis data structure
    deal_maker_record: DealMakerRecord | None = Field(
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
    address_city: str | None
    address_state: str | None
    address_zip: str | None
    nickname: str | None
    status: PropertyStatus
    tags: list[str] | None
    color_label: str | None
    priority: int | None

    # Quick metrics
    best_strategy: str | None
    best_cash_flow: Decimal | None = None
    best_coc_return: Decimal | None = None

    # Timestamps
    saved_at: datetime
    last_viewed_at: datetime | None
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
    external_property_id: str | None
    zpid: str | None
    full_address: str | None

    # Full property data
    property_data_snapshot: dict[str, Any] | None

    # Custom adjustments (DEPRECATED - use deal_maker_record)
    custom_purchase_price: Decimal | None = None
    custom_rent_estimate: Decimal | None = None
    custom_arv: Decimal | None = None
    custom_rehab_budget: Decimal | None = None
    custom_daily_rate: Decimal | None = None
    custom_occupancy_rate: Decimal | None = None
    custom_assumptions: dict[str, Any] | None

    # Deal Maker Record - the central analysis data structure
    deal_maker_record: DealMakerRecord | None = Field(
        None, description="Central analysis record with property data + assumptions + user adjustments"
    )

    # Notes
    notes: str | None

    # Analytics cache
    last_analytics_result: dict[str, Any] | None
    analytics_calculated_at: datetime | None

    # Refresh timestamp
    data_refreshed_at: datetime | None

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

    adjustment_type: str = Field(..., description="Type: purchase_price, rent, arv, assumptions, status, notes")
    field_name: str | None = Field(None, description="Specific field changed within type")
    previous_value: Any | None = None
    new_value: Any | None = None
    reason: str | None = Field(None, description="User's explanation for the change")


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

    property_ids: list[str] = Field(..., min_length=1)
    status: PropertyStatus


class BulkTagUpdate(BaseModel):
    """Schema for bulk tag update."""

    property_ids: list[str] = Field(..., min_length=1)
    add_tags: list[str] | None = None
    remove_tags: list[str] | None = None
