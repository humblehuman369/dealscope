"""Queued X (Twitter) posts. Sibling of ``linkedin_posts`` with the same lifecycle.

Deliberately its own table: ``linkedin_posts`` is live and works. An X row is
a thread (``thread_json``), published head-first; the head post id is written
the moment X returns it and a row with a head id is never created again.
"""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class XPostStatus(enum.StrEnum):
    """Same lifecycle as ``LinkedInPostStatus``."""

    DRAFT = "draft"
    APPROVED = "approved"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    CANCELLED = "cancelled"


def _now() -> datetime:
    return datetime.now(UTC)


class XPost(Base):
    """One scheduled X post or thread. ``thread_json[0]`` is the head."""

    __tablename__ = "x_posts"
    __table_args__ = (UniqueConstraint("key", name="uq_x_posts_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    batch: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    # Stable identity, e.g. ``bot-2026-09-08/dscr-check``. Upsert key.
    key: Mapped[str] = mapped_column(Text, nullable=False)

    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    # Ordered list of post bodies. Index 0 is the head; the rest are replies.
    thread_json: Mapped[list[str]] = mapped_column(JSONB, nullable=False)

    status: Mapped[str] = mapped_column(String(16), nullable=False, default=XPostStatus.DRAFT.value, index=True)
    approved_by: Mapped[str | None] = mapped_column(String(255))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Head post id from X. Set before ``status`` flips to published.
    x_post_id: Mapped[str | None] = mapped_column(Text)
    # Ids of replies posted so far, in thread order. Lets a crashed run resume
    # from the next unpublished item instead of re-posting the head.
    published_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    error: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # ``human`` for YAML imports; ``bot:<name>`` for rows the bot API drafted.
    created_by: Mapped[str] = mapped_column(String(255), nullable=False, default="human")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)
