"""Hard-money lender directory records (paid Pro feature)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, DOUBLE_PRECISION, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Lender(Base):
    """Hard-money lender for the Lender Directory.

    Ids are carried over from the ``lenders.json`` dataset rather than generated,
    because ``saved_directory_contacts.entity_id`` already stores them and has no
    foreign key to catch a mismatch. ``domain`` is the natural key every future
    refresh matches on, so a regenerated dataset can never renumber a company out
    from under a user's saved contact.
    """

    __tablename__ = "lenders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    domain: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    company_name: Mapped[str] = mapped_column(Text, nullable=False)
    website: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_type: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    nationwide: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    states_served: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    loan_products: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    min_loan_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_loan_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # DOUBLE PRECISION, not NUMERIC: these are ratios, not currency — max_ltv 0.925
    # means 92.5% and min_interest_rate carries up to 6 decimal places. A 2-decimal
    # NUMERIC would round 188 of the seeded values, and one max_arv row holds
    # 500000.0 (a dollar amount in a ratio field, see docs) which would overflow it.
    # None of these are ever summed, so float accumulation error does not apply.
    max_ltv: Mapped[float | None] = mapped_column(DOUBLE_PRECISION, nullable=True)
    max_arv: Mapped[float | None] = mapped_column(DOUBLE_PRECISION, nullable=True)
    min_interest_rate: Mapped[float | None] = mapped_column(DOUBLE_PRECISION, nullable=True)
    max_interest_rate: Mapped[float | None] = mapped_column(DOUBLE_PRECISION, nullable=True)
    min_points: Mapped[float | None] = mapped_column(DOUBLE_PRECISION, nullable=True)
    max_points: Mapped[float | None] = mapped_column(DOUBLE_PRECISION, nullable=True)

    min_term_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_term_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interest_only: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Pre-formatted presentation strings generated with the dataset. Kept as-is so
    # the wire format is unchanged; flagged in the restructure plan for retirement
    # once the frontend formats these itself.
    display: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    nmls_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    aapl_member: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    year_founded: Mapped[int | None] = mapped_column(Integer, nullable=True)
    credit_check_policy: Mapped[str | None] = mapped_column(Text, nullable=True)
    min_credit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    no_credit_check: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    source: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Retire a lender without deleting the row, so saved contacts still resolve.
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
