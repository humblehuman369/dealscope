"""Add saved_map_searches for saved map searches and new-inventory alerts.

Revision ID: 20260903_0001
Revises: 20260804_0001
Create Date: 2026-09-03

The partial index on alert_frequency is what the cron reads: it scans only the
rows actually on a schedule, so a large table of alert-free saved searches
costs the job nothing.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260903_0001"
down_revision: Union[str, None] = "20260804_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "saved_map_searches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("north", sa.Float(), nullable=False),
        sa.Column("south", sa.Float(), nullable=False),
        sa.Column("east", sa.Float(), nullable=False),
        sa.Column("west", sa.Float(), nullable=False),
        sa.Column("polygon", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "filters",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "alert_frequency",
            sa.Enum("off", "daily", "weekly", name="alertfrequency"),
            nullable=False,
            server_default="off",
        ),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_alert_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "seen_address_keys",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        op.f("ix_saved_map_searches_user_id"),
        "saved_map_searches",
        ["user_id"],
    )
    op.create_index(
        "ix_saved_map_searches_alerts_due",
        "saved_map_searches",
        ["alert_frequency", "last_alert_sent_at"],
        postgresql_where=sa.text("alert_frequency <> 'off'"),
    )


def downgrade() -> None:
    op.drop_index("ix_saved_map_searches_alerts_due", table_name="saved_map_searches")
    op.drop_index(op.f("ix_saved_map_searches_user_id"), table_name="saved_map_searches")
    op.drop_table("saved_map_searches")
    sa.Enum(name="alertfrequency").drop(op.get_bind(), checkfirst=True)
