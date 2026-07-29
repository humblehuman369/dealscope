"""Canonical US city/place reference data, keyed by Census place GEOID."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GeoCity(Base):
    """A Census place and the counties it sits in.

    ``county_fips`` is an array because 1,302 places straddle a county line —
    Kansas City spans four, Atlanta two — and answering "who covers this city?"
    with only one of them would be wrong.

    ``aliases`` carries the names people actually search by when the Census name
    is a compound: "Nashville" for *Nashville-Davidson metropolitan government*,
    "Ventura" for *San Buenaventura*. Derived mechanically in
    ``scripts/build_cities_data.py``, never hand-maintained.
    """

    __tablename__ = "geo_cities"

    geoid: Mapped[str] = mapped_column(String(7), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    short_name: Mapped[str] = mapped_column(Text, nullable=False)
    aliases: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    county_fips: Mapped[list[str]] = mapped_column(ARRAY(String(5)), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
