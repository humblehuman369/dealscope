"""Investor Intelligence newsletter subscribers.

Revision ID: 20260814_0001
Revises: 20260804_0001
Create Date: 2026-08-14
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260814_0001"
down_revision: Union[str, None] = "20260804_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "intelligence_subscribers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("investor_type", sa.String(length=50), nullable=True),
        sa.Column("source", sa.String(length=100), nullable=True),
        sa.Column("placement", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_intelligence_subscribers"),
        sa.UniqueConstraint("email", name="uq_intelligence_subscribers_email"),
    )
    op.create_index(
        "ix_intelligence_subscribers_email",
        "intelligence_subscribers",
        ["email"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_intelligence_subscribers_email", table_name="intelligence_subscribers")
    op.drop_table("intelligence_subscribers")
