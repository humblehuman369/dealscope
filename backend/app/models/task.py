"""
PropertyTask model — per-property to-do items.

Each saved property can have any number of tasks. Tasks are the "what's next"
surface that gives every deal at every stage a clear action. Auto-seeding from
stage templates is intentionally out of scope for the first cut: users add
their own. Templates land in a follow-up.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.saved_property import SavedProperty
    from app.models.user import User


class PropertyTask(Base):
    """A single to-do item attached to a saved property."""

    __tablename__ = "property_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    saved_property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("saved_properties.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optional deadline. Stored as timezone-aware datetime so we can render a
    # localized "due in 2d" without ambiguity.
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # When the task was completed. NULL means open. Storing the timestamp
    # rather than a boolean lets us render "Done 3d ago" and is cheap.
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Manual sort within the property's task list. Lower = top.
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

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

    saved_property: Mapped[SavedProperty] = relationship("SavedProperty", back_populates="tasks")
    completed_by: Mapped[User | None] = relationship("User", foreign_keys=[completed_by_id])
    created_by: Mapped[User] = relationship("User", foreign_keys=[created_by_id])
