"""Cash buyer directory records (paid Pro feature)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CashBuyer(Base):
    """Investor/buyer contact for the Cash Buyer Directory."""

    __tablename__ = "cash_buyers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_name: Mapped[str] = mapped_column(Text, nullable=False)
    owner_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    street: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    zip: Mapped[str | None] = mapped_column(Text, nullable=True)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    strategies: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    coverage: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    buyer_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    deals: Mapped[int | None] = mapped_column(Integer, nullable=True)
    years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_time: Mapped[str | None] = mapped_column(Text, nullable=True)
    accent: Mapped[str | None] = mapped_column(Text, nullable=True)
    initials: Mapped[str | None] = mapped_column(String(2), nullable=True)
    passes_strict_filter: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
