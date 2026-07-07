"""Add directory_usage_counters for trial view caps and export metering

Revision ID: 20260707_0001
Revises: 20260603_0001
Create Date: 2026-07-07 00:00:00.000000

Tasks 3.3 / 3.4 of the directory-gating plan: server-side counters for
trial users' record-detail opens (25/day) and paid users' exported records
(1,000 per billing cycle). Stored in Postgres so the caps survive restarts;
increments are atomic via upsert on the unique (user, kind, period) key.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260707_0001"
down_revision: str | None = "20260603_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "directory_usage_counters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(length=30), nullable=False),
        sa.Column("period_key", sa.String(length=20), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "user_id", "kind", "period_key", name="uq_directory_usage_user_kind_period"
        ),
    )
    op.create_index(
        "ix_directory_usage_counters_user_id", "directory_usage_counters", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_directory_usage_counters_user_id", table_name="directory_usage_counters")
    op.drop_table("directory_usage_counters")
