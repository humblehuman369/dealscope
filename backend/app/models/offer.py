"""
PropertyOffer model — the offer history for a saved property.

Each saved property can carry multiple offers (initial offer, counters,
re-offers after inspection, etc.). Offers are the "negotiating" record that
turns the pipeline's Negotiating/Under Contract columns from labels into a
tracked history: what we offered, when, what came back, and where it landed.
"""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.saved_property import SavedProperty
    from app.models.user import User


class OfferStatus(str, enum.Enum):
    """Lifecycle of a single offer."""

    DRAFT = "draft"  # Prepared but not yet sent
    SUBMITTED = "submitted"  # Sent to seller/agent, awaiting response
    COUNTERED = "countered"  # Seller countered — counter_amount holds their number
    ACCEPTED = "accepted"  # Offer (or negotiated price) accepted
    REJECTED = "rejected"  # Seller declined outright
    WITHDRAWN = "withdrawn"  # We pulled the offer
    EXPIRED = "expired"  # Lapsed without a response


class PropertyOffer(Base):
    """A single offer made on a saved property."""

    __tablename__ = "property_offers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    saved_property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("saved_properties.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Dollar amounts use Numeric(12,2) to avoid IEEE 754 rounding — same
    # convention as SavedProperty's custom_* money columns.
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # Seller's counter, if any. Only meaningful when status is COUNTERED or
    # a later state that resolved from a counter.
    counter_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    status: Mapped[OfferStatus] = mapped_column(
        Enum(OfferStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=OfferStatus.SUBMITTED,
    )

    # When the offer was made (user-editable — offers are often logged after
    # the fact) and when it lapses if the seller doesn't respond.
    offer_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    saved_property: Mapped[SavedProperty] = relationship("SavedProperty", back_populates="offers")
    created_by: Mapped[User] = relationship("User", foreign_keys=[created_by_id])
