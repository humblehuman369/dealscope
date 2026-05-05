"""
Rehab budget, line items, and actual expenses for saved properties.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.saved_property import SavedProperty
    from app.models.user import User


class RehabBudget(Base):
    """One rehab budget per saved property (estimator snapshot + contingency)."""

    __tablename__ = "rehab_budgets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    saved_property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("saved_properties.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    contingency_pct: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=Decimal("0.1000"))
    baseline_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    baseline_locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    saved_property: Mapped["SavedProperty"] = relationship("SavedProperty", back_populates="rehab_budget")
    lines: Mapped[list["BudgetLine"]] = relationship(
        "BudgetLine", back_populates="budget", cascade="all, delete-orphan", order_by="BudgetLine.sort_order"
    )
    expenses: Mapped[list["BudgetExpense"]] = relationship(
        "BudgetExpense", back_populates="budget", cascade="all, delete-orphan"
    )


class BudgetLine(Base):
    """Single estimator line (category + item + tier snapshot)."""

    __tablename__ = "budget_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rehab_budgets.id", ondelete="CASCADE"), nullable=False, index=True
    )

    category_id: Mapped[str] = mapped_column(String(64), nullable=False)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    tier: Mapped[str] = mapped_column(String(8), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    estimate_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(default=0)

    budget: Mapped["RehabBudget"] = relationship("RehabBudget", back_populates="lines")
    expenses: Mapped[list["BudgetExpense"]] = relationship("BudgetExpense", back_populates="budget_line")


class BudgetExpense(Base):
    """Actual spend against a budget line (or uncategorized against budget)."""

    __tablename__ = "budget_expenses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rehab_budgets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    budget_line_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("budget_lines.id", ondelete="SET NULL"), nullable=True, index=True
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    spent_on: Mapped[date] = mapped_column(Date, nullable=False)
    vendor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    receipt_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    budget: Mapped["RehabBudget"] = relationship("RehabBudget", back_populates="expenses")
    budget_line: Mapped["BudgetLine | None"] = relationship("BudgetLine", back_populates="expenses")
    receipt_document: Mapped["Document | None"] = relationship("Document")
    created_by: Mapped["User"] = relationship("User")
