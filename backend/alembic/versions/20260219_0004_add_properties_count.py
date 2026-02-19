"""Add denormalized properties_count to subscriptions

Removes the need for COUNT(*) on saved_properties in the hot
get_usage() path.  Backfills existing rows from current data.

Revision ID: 20260219_0004
Revises: 20260219_0003
Create Date: 2026-02-19 07:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "20260219_0004"
down_revision = "20260219_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "subscriptions",
        sa.Column("properties_count", sa.Integer(), nullable=False, server_default="0"),
    )
    # Backfill from current data
    op.execute(
        """
        UPDATE subscriptions s
        SET properties_count = (
            SELECT COUNT(*) FROM saved_properties sp WHERE sp.user_id = s.user_id
        )
        """
    )


def downgrade() -> None:
    op.drop_column("subscriptions", "properties_count")
