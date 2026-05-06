"""Schemas for the per-property timeline endpoint."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

TimelineEventKind = Literal[
    "status_change",
    "flip_stage_change",
    "task_added",
    "task_completed",
    "task_reopened",
    "expense_added",
    "budget_locked",
    "contact_added",
    "note",
]


class TimelineEvent(BaseModel):
    id: str
    kind: TimelineEventKind
    occurred_at: datetime
    title: str
    body: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class NoteCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
