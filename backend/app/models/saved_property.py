"""
SavedProperty and PropertyAdjustment models.
Handles user's saved properties with custom adjustments and tracking.
"""

import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


class PropertyStatus(enum.StrEnum):
    """Status of a saved property in the user's pipeline."""

    WATCHING = "watching"  # Just monitoring
    ANALYZING = "analyzing"  # Actively analyzing the deal
    CONTACTED = "contacted"  # Contacted seller/agent
    UNDER_CONTRACT = "under_contract"  # Deal is in progress
    OWNED = "owned"  # User owns this property
    PASSED = "passed"  # Decided not to pursue
    ARCHIVED = "archived"  # Old/inactive


class SavedProperty(Base):
    """
    A property saved by a user for tracking and analysis.
    Includes custom adjustments, notes, and cached analytics.
    """

    __tablename__ = "saved_properties"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to user
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Property Reference (from API search)
    external_property_id: Mapped[str | None] = mapped_column(String(100), index=True)  # ID from property service cache
    zpid: Mapped[str | None] = mapped_column(String(50), index=True)  # Zillow property ID

    # Address Components (for display and search)
    address_street: Mapped[str] = mapped_column(String(255), nullable=False)
    address_city: Mapped[str | None] = mapped_column(String(100))
    address_state: Mapped[str | None] = mapped_column(String(10))
    address_zip: Mapped[str | None] = mapped_column(String(20))
    full_address: Mapped[str | None] = mapped_column(String(500), index=True)

    # Cached Property Data (snapshot at save time)
    property_data_snapshot: Mapped[dict | None] = mapped_column(JSON, default=dict)  # Full PropertyResponse cached

    # User Customizations
    status: Mapped[PropertyStatus] = mapped_column(SQLEnum(PropertyStatus), default=PropertyStatus.WATCHING)
    nickname: Mapped[str | None] = mapped_column(String(100))  # User's custom name: "Beach House", "First Flip"
    tags: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), default=list
    )  # ["priority", "needs-repair", "good-deal"]
    color_label: Mapped[str | None] = mapped_column(String(20))  # "red", "green", "blue", "yellow", "purple"

    # Priority/Ranking
    priority: Mapped[int | None] = mapped_column(Integer)  # 1-5 stars
    display_order: Mapped[int | None] = mapped_column(Integer)  # For manual sorting

    # Custom Value Adjustments (user overrides)
    # Dollar amounts use Numeric(12,2) to avoid IEEE 754 rounding.
    # Percentages use Numeric(5,4) for precision to 0.01%.
    custom_purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    custom_rent_estimate: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    custom_arv: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    custom_rehab_budget: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    custom_daily_rate: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))  # STR
    custom_occupancy_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))  # STR

    # Custom Strategy Assumptions (JSON per strategy)
    custom_assumptions: Mapped[dict | None] = mapped_column(JSON, default=dict)  # {"ltr": {...}, "str": {...}, etc.}

    # Deal Maker Record - the central analysis data structure
    # Contains: property data + initial assumptions (locked) + user adjustments + cached metrics
    deal_maker_record: Mapped[dict | None] = mapped_column(
        JSON, default=None
    )  # DealMakerRecord schema - see schemas/deal_maker.py

    # Notes
    notes: Mapped[str | None] = mapped_column(Text)

    # Analytics Cache (for quick dashboard display)
    last_analytics_result: Mapped[dict | None] = mapped_column(JSON)  # Cached AnalyticsResponse
    analytics_calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Best Strategy (cached for sorting/filtering)
    best_strategy: Mapped[str | None] = mapped_column(String(20))
    best_cash_flow: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    best_coc_return: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))

    # Timestamps
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    last_viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
    data_refreshed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="saved_properties")
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="saved_property", cascade="all, delete-orphan"
    )
    adjustments_history: Mapped[list["PropertyAdjustment"]] = relationship(
        "PropertyAdjustment",
        back_populates="saved_property",
        cascade="all, delete-orphan",
        order_by="PropertyAdjustment.created_at.desc()",
    )

    def get_display_name(self) -> str:
        """Return nickname if set, otherwise street address."""
        return self.nickname or self.address_street


class PropertyAdjustment(Base):
    """
    Tracks history of adjustments made to saved properties.
    Provides audit trail for all user modifications.
    """

    __tablename__ = "property_adjustments"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to saved property
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("saved_properties.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Adjustment Details
    adjustment_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # "purchase_price", "rent", "arv", "assumptions", "status", "notes"

    field_name: Mapped[str | None] = mapped_column(String(100))  # Specific field changed within type

    previous_value: Mapped[dict | None] = mapped_column(JSON)
    new_value: Mapped[dict | None] = mapped_column(JSON)

    # Context
    reason: Mapped[str | None] = mapped_column(Text)  # User's explanation for the change

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Relationships
    saved_property: Mapped["SavedProperty"] = relationship("SavedProperty", back_populates="adjustments_history")
