"""Where a directory entity actually works — one indexed answer for both directories."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DirectoryServiceArea(Base):
    """Service coverage for a lender or cash buyer, one row per covered area.

    Uses the same ``(entity_type, entity_id)`` convention as
    ``saved_directory_contacts`` and, for the same reason, carries no foreign key
    to the entity: the two source tables differ. ``county_fips`` *is* a real
    foreign key, because there is exactly one county reference table.

    Rows are derived, never hand-entered — see ``scripts/backfill_service_area.py``.
    ``source`` records which derivation produced a row so a later pass can refresh
    its own rows without disturbing the others.
    """

    __tablename__ = "directory_service_area"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # 'nationwide' | 'state' | 'county'. A CHECK constraint keeps state and
    # county_fips consistent with the scope rather than trusting callers.
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    county_fips: Mapped[str | None] = mapped_column(
        String(5), ForeignKey("geo_counties.fips"), nullable=True
    )

    source: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
