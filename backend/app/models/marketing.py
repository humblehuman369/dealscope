"""Marketing Ops Hub tables.

Bots write metric snapshots, daily briefs, and run records through the
draft-only bot API. Humans review in ``/admin/marketing``. Nothing here is
ever fabricated: a metric row exists only when a source reported it, and
``source`` says which one.
"""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MarketingChannel(enum.StrEnum):
    """Where a metric or piece of content lives."""

    SITE = "site"
    LINKEDIN = "linkedin"
    X = "x"
    BLOG_SEO = "blog_seo"
    META_ADS = "meta_ads"
    GOOGLE_ADS = "google_ads"


class MetricSource(enum.StrEnum):
    """Provenance. ``bot_capture`` values are unverified and labelled as such."""

    POSTHOG = "posthog"
    GSC = "gsc"
    LINKEDIN_API = "linkedin_api"
    X_API = "x_api"
    # Phase 4 official ad APIs. When one of these reports a (date, channel,
    # metric), the scorecard drops the bot_capture row for the same cell.
    META_API = "meta_api"
    GOOGLE_ADS_API = "google_ads_api"
    BOT_CAPTURE = "bot_capture"


class BriefStatus(enum.StrEnum):
    DRAFT = "draft"
    REVIEWED = "reviewed"


class BriefKind(enum.StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"


class BotRunStatus(enum.StrEnum):
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


def _now() -> datetime:
    return datetime.now(UTC)


class BotRun(Base):
    """One execution of a bot routine. Every bot write carries a ``run_id``."""

    __tablename__ = "bot_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bot_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    routine: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=BotRunStatus.RUNNING.value)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now, index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    summary: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)


class MarketingMetricDaily(Base):
    """One (date, channel, metric, source) value. Re-captures overwrite in place."""

    __tablename__ = "marketing_metrics_daily"
    __table_args__ = (UniqueConstraint("date", "channel", "metric", "source", name="uq_marketing_metrics_daily_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    metric: Mapped[str] = mapped_column(String(64), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("bot_runs.id", ondelete="SET NULL"))


class MarketingBrief(Base):
    """Bot-authored daily brief or system weekly rollup. One per (date, kind);
    reviewed rows are immutable."""

    __tablename__ = "marketing_briefs"
    __table_args__ = (UniqueConstraint("date", "kind", name="uq_marketing_briefs_date_kind"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default=BriefKind.DAILY.value)
    body_md: Mapped[str] = mapped_column(Text, nullable=False)
    highlights: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=BriefStatus.DRAFT.value, index=True)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    reviewed_by: Mapped[str | None] = mapped_column(String(255))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("bot_runs.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)
