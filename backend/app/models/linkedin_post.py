"""Queued LinkedIn posts. Humans write and approve every row; the cron publishes."""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LinkedInAccount(enum.StrEnum):
    """Which LinkedIn identity authors the post."""

    FOUNDER = "founder"
    COMPANY = "company"


class LinkedInMediaType(enum.StrEnum):
    """Attached media. ``none`` is a text-only post."""

    NONE = "none"
    IMAGE = "image"
    DOCUMENT = "document"


class LinkedInPostStatus(enum.StrEnum):
    """Queue lifecycle. A row with a URN must never be created a second time."""

    DRAFT = "draft"
    APPROVED = "approved"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    CANCELLED = "cancelled"


def _enum_values(enum_cls: type[enum.StrEnum]) -> list[str]:
    return [m.value for m in enum_cls]


class LinkedInPost(Base):
    """One scheduled LinkedIn post (or company reshare of a founder post)."""

    __tablename__ = "linkedin_posts"
    __table_args__ = (UniqueConstraint("key", name="uq_linkedin_posts_key"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    batch: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    # Stable import identity, e.g. ``batch-01/post-03``. Upsert key.
    key: Mapped[str] = mapped_column(Text, nullable=False)

    account: Mapped[LinkedInAccount] = mapped_column(
        SQLEnum(
            LinkedInAccount,
            name="linkedin_account",
            values_callable=_enum_values,
        ),
        nullable=False,
    )

    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)

    media_type: Mapped[LinkedInMediaType] = mapped_column(
        SQLEnum(
            LinkedInMediaType,
            name="linkedin_media_type",
            values_callable=_enum_values,
        ),
        nullable=False,
        default=LinkedInMediaType.NONE,
    )
    media_path: Mapped[str | None] = mapped_column(Text)
    media_alt_text: Mapped[str | None] = mapped_column(Text)
    document_title: Mapped[str | None] = mapped_column(Text)
    # Bytes are loaded at import (Railway has no docs/ folder) and at publish.
    # Deferred so list queries never pull PNG/PDF blobs.
    media_bytes: Mapped[bytes | None] = mapped_column(LargeBinary, deferred=True)

    first_comment: Mapped[str | None] = mapped_column(Text)
    reshare_of_key: Mapped[str | None] = mapped_column(Text, index=True)

    status: Mapped[LinkedInPostStatus] = mapped_column(
        SQLEnum(
            LinkedInPostStatus,
            name="linkedin_post_status",
            values_callable=_enum_values,
        ),
        nullable=False,
        default=LinkedInPostStatus.DRAFT,
        index=True,
    )

    approved_by: Mapped[str | None] = mapped_column(String(255))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    linkedin_post_urn: Mapped[str | None] = mapped_column(Text)
    linkedin_comment_urn: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    error: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # ``human`` for YAML imports; ``bot:<name>`` for rows the bot API drafted.
    created_by: Mapped[str] = mapped_column(String(255), nullable=False, default="human")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
