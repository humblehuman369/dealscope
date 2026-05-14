"""
PropertyContact model — people involved in a deal.

Per-property contact list (seller, listing agent, lender, contractor, etc.)
that fills the "who do I call?" gap during the Pursuing / Negotiating /
Under Contract stages. Phase-1 design intentionally keeps contacts scoped
to a single property — if users want a global contact pool later, we can
add a many-to-many later without breaking what's here.
"""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.saved_property import SavedProperty
    from app.models.user import User


class ContactRole(enum.StrEnum):
    """Categorical role of a contact on a deal."""

    SELLER = "seller"
    LISTING_AGENT = "listing_agent"
    BUYER_AGENT = "buyer_agent"
    LENDER = "lender"
    CONTRACTOR = "contractor"
    INSPECTOR = "inspector"
    ATTORNEY = "attorney"
    TITLE_COMPANY = "title_company"
    INSURANCE = "insurance"
    PROPERTY_MANAGER = "property_manager"
    OTHER = "other"


class PropertyContact(Base):
    """A person attached to a saved property."""

    __tablename__ = "property_contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    saved_property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("saved_properties.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[ContactRole] = mapped_column(
        SQLEnum(ContactRole, native_enum=False, length=32),
        nullable=False,
        default=ContactRole.OTHER,
    )
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
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

    saved_property: Mapped[SavedProperty] = relationship("SavedProperty", back_populates="contacts")
    created_by: Mapped[User] = relationship("User")
