"""Canonical US county reference data (50 states + DC)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GeoCounty(Base):
    """One row per county-equivalent, keyed by Census FIPS GEOID.

    FIPS is the primary key rather than the name because county names repeat
    heavily across states — over 30 states have a Washington County — and even
    within a state ``short_name`` can collide: Maryland has both Baltimore
    County and Baltimore city, Virginia has four such pairs. Match on FIPS
    whenever the state is known, and treat a bare name as ambiguous.
    """

    __tablename__ = "geo_counties"

    # State FIPS + county FIPS, e.g. "12099" for Palm Beach County, FL.
    fips: Mapped[str] = mapped_column(String(5), primary_key=True)
    # Full legal name with its suffix: "County", "Parish", "Borough",
    # "Census Area", "Municipality", or a lowercase "city" for independent
    # cities. Connecticut uses "Planning Region" and DC has no suffix at all.
    name: Mapped[str] = mapped_column(Text, nullable=False)
    # Suffix stripped ("Palm Beach"), for matching free-text county strings such
    # as cash_buyers.coverage[]. Not unique, even within a state.
    short_name: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    # False for retired geographies kept only so older data still joins —
    # Connecticut's eight pre-2022 counties, which the 2020-vintage ZIP
    # crosswalk still references. Filter on this for pickers and dropdowns;
    # leave it out when resolving a FIPS that came from stored data.
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    lat: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    lng: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
