"""Request/response shapes for the Marketing Ops Hub (bot + admin APIs)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.marketing import BotRunStatus, MarketingChannel, MetricSource
from app.schemas.linkedin import LinkedInPostOut
from app.schemas.x import XPostOut

# ---------------------------------------------------------------------------
# Bot runs
# ---------------------------------------------------------------------------


class BotRunCreate(BaseModel):
    bot_name: str = Field(min_length=1, max_length=64)
    routine: str = Field(min_length=1, max_length=64)


class BotRunFinish(BaseModel):
    status: BotRunStatus
    summary: str | None = Field(default=None, max_length=4000)
    error: str | None = Field(default=None, max_length=4000)

    @field_validator("status")
    @classmethod
    def _terminal_only(cls, value: BotRunStatus) -> BotRunStatus:
        if value == BotRunStatus.RUNNING:
            raise ValueError("finish status must be succeeded or failed")
        return value


class BotRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bot_name: str
    routine: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    summary: str | None
    error: str | None


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------


class MetricSnapshotIn(BaseModel):
    """One observed value. ``source`` is set server-side for bot writes."""

    date: date
    channel: MarketingChannel
    metric: str = Field(min_length=1, max_length=64, pattern=r"^[a-z][a-z0-9_]*$")
    value: float

    @field_validator("value")
    @classmethod
    def _finite(cls, value: float) -> float:
        if value != value or value in (float("inf"), float("-inf")):
            raise ValueError("value must be finite")
        return value


class MetricSnapshotBatch(BaseModel):
    run_id: UUID | None = None
    snapshots: list[MetricSnapshotIn] = Field(min_length=1, max_length=500)


class MetricUpsertResult(BaseModel):
    inserted: int
    updated: int
    source: MetricSource


class MetricPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    channel: str
    metric: str
    value: float
    source: str
    captured_at: datetime


class ScorecardCell(BaseModel):
    channel: str
    metric: str
    current: float | None
    previous: float | None
    sources: list[str]
    last_captured_at: datetime | None


class Scorecard(BaseModel):
    days: int
    window_start: date
    window_end: date
    cells: list[ScorecardCell]


# ---------------------------------------------------------------------------
# Briefs
# ---------------------------------------------------------------------------


class BriefIn(BaseModel):
    date: date
    body_md: str = Field(min_length=1, max_length=40_000)
    highlights: dict[str, Any] = Field(default_factory=dict)
    run_id: UUID | None = None


class BriefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: date
    kind: str
    body_md: str
    highlights: dict[str, Any]
    status: str
    created_by: str
    reviewed_by: str | None
    reviewed_at: datetime | None
    run_id: UUID | None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Drafts
# ---------------------------------------------------------------------------


class LinkedInDraftPost(BaseModel):
    """Text-only LinkedIn draft. Media needs repo assets, so bots may not attach it."""

    key: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]*$")
    account: str
    scheduled_at: str = Field(description="YYYY-MM-DD HH:MM in the batch timezone")
    body: str
    first_comment: str | None = None
    reshare_of_key: str | None = None


class LinkedInDraftBatch(BaseModel):
    batch: str | None = Field(
        default=None,
        description="Defaults to bot-YYYY-MM-DD. Must start with 'bot-'.",
        pattern=r"^bot-[a-z0-9-]+$",
    )
    timezone: str = "America/New_York"
    run_id: UUID | None = None
    posts: list[LinkedInDraftPost] = Field(min_length=1, max_length=20)


class XDraftPost(BaseModel):
    """Text-only X post or thread. ``thread[0]`` is the head, the rest are replies."""

    key: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]*$")
    scheduled_at: str = Field(description="YYYY-MM-DD HH:MM in the batch timezone")
    thread: list[str] = Field(min_length=1, max_length=5)


class XDraftBatch(BaseModel):
    batch: str | None = Field(
        default=None,
        description="Defaults to bot-YYYY-MM-DD. Must start with 'bot-'.",
        pattern=r"^bot-[a-z0-9-]+$",
    )
    timezone: str = "America/New_York"
    run_id: UUID | None = None
    posts: list[XDraftPost] = Field(min_length=1, max_length=20)


class DraftChange(BaseModel):
    key: str
    action: str
    status: str


class DraftImportResult(BaseModel):
    batch: str
    changes: list[DraftChange]


# ---------------------------------------------------------------------------
# Bot context + admin views
# ---------------------------------------------------------------------------


class BlogInventoryItem(BaseModel):
    title: str
    url: str
    slug: str
    category: str | None
    published: str | None


class BlogPullRequest(BaseModel):
    """An open blog draft PR on a ``bot/blog/<slug>`` branch."""

    number: int
    title: str
    url: str
    branch: str
    slug: str
    draft: bool
    author: str | None
    preview_url: str | None
    updated_at: datetime | None


class QueueCounts(BaseModel):
    linkedin: dict[str, int]
    x: dict[str, int]


class BotContext(BaseModel):
    generated_at: datetime
    metrics_28d: list[MetricPoint]
    queue: QueueCounts
    recent_linkedin_keys: list[str]
    recent_x_keys: list[str]
    latest_brief: BriefOut | None
    blog_inventory: list[BlogInventoryItem]
    open_blog_prs: list[BlogPullRequest]
    warnings: list[str]


class MarketingQueue(BaseModel):
    linkedin: list[LinkedInPostOut]
    x: list[XPostOut]


class LinkedInPostEdit(BaseModel):
    body: str | None = Field(default=None, min_length=1)
    first_comment: str | None = None
    scheduled_at: datetime | None = None


class SourceHealth(BaseModel):
    source: str
    last_captured_at: datetime | None
    rows_7d: int


class BotHealth(BaseModel):
    bot_name: str
    last_run: BotRunOut | None


class MarketingHealth(BaseModel):
    linkedin_publish_enabled: bool
    linkedin_token_warnings: list[str]
    x_publish_enabled: bool
    x_api_configured: bool
    bot_api_configured: bool
    posthog_pull_configured: bool
    gsc_pull_configured: bool
    sources: list[SourceHealth]
    bots: list[BotHealth]
    jobs: dict[str, Any]
