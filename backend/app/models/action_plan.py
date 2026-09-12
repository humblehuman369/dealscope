"""
ActionPlan model — the per-property "what to do next" plan.

Phase 0 stores a no-AI template plan (case + task list + contacts). Later
phases fill ``research`` and rewrite ``plan`` from the research step.
Tasks and contacts written from a plan point back here via ``action_plan_id``.
"""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.saved_property import SavedProperty
    from app.models.user import User


class ActionPlanSource(enum.StrEnum):
    """Where a task or contact row came from."""

    USER = "user"
    TEMPLATE = "template"
    AI = "ai"


class ActionPlanStatus(enum.StrEnum):
    """Lifecycle of a plan. Phase 0 writes ``ready`` immediately."""

    QUEUED = "queued"
    RESEARCHING = "researching"
    READY = "ready"
    FAILED = "failed"


class ActionPlanCase(enum.StrEnum):
    """The nine property situations the sorter can return."""

    ON_MARKET = "on_market"
    ON_MARKET_STALE = "on_market_stale"
    EXPIRED_OR_ON_HOLD = "expired_or_on_hold"
    OFF_MARKET_ABSENTEE = "off_market_absentee"
    OFF_MARKET_OWNER_OCCUPIED = "off_market_owner_occupied"
    PRE_FORECLOSURE = "pre_foreclosure"
    FORECLOSURE_OR_AUCTION = "foreclosure_or_auction"
    BANK_OWNED = "bank_owned"
    FSBO = "fsbo"


class ActionPlan(Base):
    """A generated (or templated) action plan for one saved property."""

    __tablename__ = "action_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    saved_property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("saved_properties.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    case: Mapped[ActionPlanCase] = mapped_column(
        SQLEnum(ActionPlanCase, native_enum=False, length=64),
        nullable=False,
    )
    status: Mapped[ActionPlanStatus] = mapped_column(
        SQLEnum(ActionPlanStatus, native_enum=False, length=32),
        nullable=False,
        default=ActionPlanStatus.READY,
    )

    research: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cost_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    saved_property: Mapped[SavedProperty] = relationship("SavedProperty", back_populates="action_plans")
    user: Mapped[User] = relationship("User")
