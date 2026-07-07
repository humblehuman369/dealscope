"""Server-side usage counters for directory gating (Tasks 3.3 / 3.4).

One row per (user, kind, period). Postgres upserts keep increments atomic
under concurrent requests, and DB persistence means caps survive restarts —
Redis would silently reset the meters.

Kinds:
  - ``detail_view``    — trial users' record-detail opens; period key is the
                         UTC date (resets at UTC midnight).
  - ``export_records`` — paid users' exported record count; period key is the
                         start date of the current monthly billing cycle.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DirectoryUsageCounter(Base):
    """Atomic per-period usage counter for directory views and exports."""

    __tablename__ = "directory_usage_counters"
    __table_args__ = (
        UniqueConstraint("user_id", "kind", "period_key", name="uq_directory_usage_user_kind_period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(30))
    period_key: Mapped[str] = mapped_column(String(20))
    count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
