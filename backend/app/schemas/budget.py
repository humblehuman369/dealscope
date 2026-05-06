"""Rehab budget API schemas."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RehabSelectionIn(BaseModel):
    """Single estimator selection (matches frontend RehabSelection)."""

    model_config = ConfigDict(populate_by_name=True)

    item_id: str = Field(alias="itemId")
    quantity: Decimal = Field(default=Decimal("1"))
    tier: str = Field(default="mid")
    cost_override: Decimal | None = Field(default=None, alias="costOverride")


class BudgetSeedRequest(BaseModel):
    selections: list[RehabSelectionIn]
    contingency_pct: Decimal = Field(default=Decimal("0.10"), ge=0, le=1)
    notes: str | None = None


class BudgetExpenseCreate(BaseModel):
    amount: Decimal = Field(ge=0)
    spent_on: date
    budget_line_id: str | None = None
    vendor: str | None = Field(default=None, max_length=255)
    description: str | None = None
    receipt_document_id: str | None = None


class BudgetExpenseOut(BaseModel):
    id: str
    budget_id: str
    budget_line_id: str | None
    amount: str
    spent_on: date
    vendor: str | None
    description: str | None
    receipt_document_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class BudgetSummaryOut(BaseModel):
    budget_id: str
    saved_property_id: str
    contingency_pct: str
    lines_subtotal: str
    contingency_amount: str
    baseline_total: str
    baseline_locked_at: str | None
    actual_total: str
    unallocated_actual: str
    projected_total: str
    variance: str
    variance_pct: str
    lines: list[dict[str, Any]]
    categories: dict[str, dict[str, str]]


class BudgetLinePctCompleteUpdate(BaseModel):
    """Body for PATCH .../budget/lines/{line_id}/pct_complete."""

    pct_complete: Decimal = Field(..., ge=0, le=100)


class ParsedReceipt(BaseModel):
    """Fields extracted from a receipt image by the AI parser. Every value
    is nullable — the frontend treats them as editable defaults, not the
    final truth."""

    vendor: str | None = None
    amount: str | None = None
    spent_on: str | None = None
    suggested_line_id: str | None = None
    description: str | None = None


class ReceiptUploadResponse(BaseModel):
    """Returned from the upload+parse endpoint. ``document_id`` is always
    populated (the file landed); ``parsed`` is null when the AI parser is
    unavailable or returned no usable data."""

    document_id: str
    parsed: ParsedReceipt | None = None
