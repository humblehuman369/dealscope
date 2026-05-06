"""Schemas for PropertyTask CRUD."""

from datetime import datetime

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    notes: str | None = None
    due_date: datetime | None = None
    sort_order: int | None = None


class TaskUpdate(BaseModel):
    """All fields optional — partial updates only."""

    title: str | None = Field(None, min_length=1, max_length=255)
    notes: str | None = None
    due_date: datetime | None = None
    sort_order: int | None = None
    # Set to a datetime to mark complete; explicitly null to reopen.
    # We can't distinguish "not provided" from "set to null" in plain dict
    # unpacking, so the service treats absence vs presence at the model level
    # via ``model_dump(exclude_unset=True)``.
    completed_at: datetime | None = None


class TaskOut(BaseModel):
    id: str
    saved_property_id: str
    title: str
    notes: str | None
    due_date: datetime | None
    completed_at: datetime | None
    sort_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskSummary(BaseModel):
    """Lightweight counts used by the kanban card badge."""

    total: int
    open: int
    overdue: int
