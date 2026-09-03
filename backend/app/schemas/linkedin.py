"""Request/response shapes for the LinkedIn publisher queue."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LinkedInPostOut(BaseModel):
    """Admin list/detail row. Media bytes are never included."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    batch: str
    key: str
    account: str
    scheduled_at: datetime
    body: str
    media_type: str
    media_path: str | None
    media_alt_text: str | None
    document_title: str | None
    first_comment: str | None
    reshare_of_key: str | None
    status: str
    approved_by: str | None
    approved_at: datetime | None
    linkedin_post_urn: str | None
    linkedin_comment_urn: str | None
    published_at: datetime | None
    error: str | None
    attempts: int
    created_at: datetime
    updated_at: datetime


class LinkedInPostPreview(BaseModel):
    """Exact Posts API body the publisher would send, plus account metadata."""

    key: str
    account: str
    author: str
    dry_run: bool
    request_body: dict[str, Any]
    first_comment: str | None
    media: dict[str, Any] | None


class LinkedInFailedRow(BaseModel):
    key: str
    error: str


class LinkedInPublishResult(BaseModel):
    published: list[str]
    skipped_waiting_parent: list[str]
    failed: list[LinkedInFailedRow]
    dry_run: bool
    token_warnings: list[str]
