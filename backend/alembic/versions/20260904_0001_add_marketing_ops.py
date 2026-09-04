"""Add Marketing Ops Hub tables and linkedin_posts.created_by.

Revision ID: 20260904_0001
Revises: 20260903_0002
Create Date: 2026-09-04

bot_runs, marketing_metrics_daily, and marketing_briefs back the draft-only
bot API and the /admin/marketing dashboard. ``created_by`` records whether a
LinkedIn row came from a human YAML import or a bot draft.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260904_0001"
down_revision: str | None = "20260903_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "bot_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("bot_name", sa.String(length=64), nullable=False),
        sa.Column("routine", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="running"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_bot_runs_bot_name", "bot_runs", ["bot_name"])
    op.create_index("ix_bot_runs_started_at", "bot_runs", ["started_at"])

    op.create_table(
        "marketing_metrics_daily",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("metric", sa.String(length=64), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column(
            "run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bot_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.UniqueConstraint("date", "channel", "metric", "source", name="uq_marketing_metrics_daily_key"),
    )
    op.create_index("ix_marketing_metrics_daily_date", "marketing_metrics_daily", ["date"])
    op.create_index("ix_marketing_metrics_daily_channel", "marketing_metrics_daily", ["channel"])

    op.create_table(
        "marketing_briefs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("body_md", sa.Text(), nullable=False),
        sa.Column("highlights", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="draft"),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.Column("reviewed_by", sa.String(length=255), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bot_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("date", name="uq_marketing_briefs_date"),
    )
    op.create_index("ix_marketing_briefs_status", "marketing_briefs", ["status"])

    op.add_column(
        "linkedin_posts",
        sa.Column("created_by", sa.String(length=255), nullable=False, server_default="human"),
    )


def downgrade() -> None:
    op.drop_column("linkedin_posts", "created_by")
    op.drop_index("ix_marketing_briefs_status", table_name="marketing_briefs")
    op.drop_table("marketing_briefs")
    op.drop_index("ix_marketing_metrics_daily_channel", table_name="marketing_metrics_daily")
    op.drop_index("ix_marketing_metrics_daily_date", table_name="marketing_metrics_daily")
    op.drop_table("marketing_metrics_daily")
    op.drop_index("ix_bot_runs_started_at", table_name="bot_runs")
    op.drop_index("ix_bot_runs_bot_name", table_name="bot_runs")
    op.drop_table("bot_runs")
