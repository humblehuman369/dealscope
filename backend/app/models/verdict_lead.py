"""Anonymous verdict-email captures. Not an account."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class VerdictLead(Base):
    """One email + address pair. Deduped so the same person is not emailed twice."""

    __tablename__ = "verdict_leads"
    __table_args__ = (UniqueConstraint("email", "address", name="uq_verdict_leads_email_address"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    property_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    attribution: Mapped[dict | None] = mapped_column(JSON, default=dict)
    consent: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
