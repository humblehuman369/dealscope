"""Add verdict_leads and users.first_touch.

Revision ID: 20260907_0001
Revises: 20260904_0003
Create Date: 2026-09-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260907_0001"
down_revision: str | None = "20260904_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "verdict_leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=False),
        sa.Column("property_id", sa.String(length=64), nullable=True),
        sa.Column("attribution", sa.JSON(), nullable=True),
        sa.Column("consent", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_verdict_leads_email", "verdict_leads", ["email"])
    op.create_unique_constraint("uq_verdict_leads_email_address", "verdict_leads", ["email", "address"])

    op.add_column("users", sa.Column("first_touch", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "first_touch")
    op.drop_constraint("uq_verdict_leads_email_address", "verdict_leads", type_="unique")
    op.drop_index("ix_verdict_leads_email", table_name="verdict_leads")
    op.drop_table("verdict_leads")
