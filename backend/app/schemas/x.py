"""Request/response shapes for the X (Twitter) publisher queue."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class XPostOut(BaseModel):
    """Admin list/detail row."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    batch: str
    key: str
    scheduled_at: datetime
    thread_json: list[str]
    status: str
    approved_by: str | None
    approved_at: datetime | None
    x_post_id: str | None
    published_ids: list[str]
    published_at: datetime | None
    error: str | None
    attempts: int
    created_by: str
    created_at: datetime
    updated_at: datetime


class XPostPreview(BaseModel):
    """Exact ``POST /2/tweets`` bodies the publisher would send, in order."""

    key: str
    dry_run: bool
    request_bodies: list[dict[str, Any]]
    weighted_lengths: list[int]


class XPostEdit(BaseModel):
    """Admin edit. Replaces the whole thread when ``thread`` is given."""

    thread: list[str] | None = Field(default=None, min_length=1, max_length=5)
    scheduled_at: datetime | None = None


class XFailedRow(BaseModel):
    key: str
    error: str


class XPublishResult(BaseModel):
    published: list[str]
    failed: list[XFailedRow]
    dry_run: bool
    warnings: list[str]
