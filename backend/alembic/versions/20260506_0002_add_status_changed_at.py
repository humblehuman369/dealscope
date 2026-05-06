"""Add status_changed_at column to saved_properties

Revision ID: 20260506_0002
Revises: 20260506_0001
Create Date: 2026-05-06 00:30:00.000000

Used by the dashboard kanban to surface "days in current stage" — a far
better signal than ``updated_at``, which churns on any field change. For
existing rows we backfill from ``updated_at`` (best available approximation).
"""

import sqlalchemy as sa
from alembic import op

revision = "20260506_0002"
down_revision = "20260506_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add column nullable so the backfill doesn't fail on a non-null violation.
    op.add_column(
        "saved_properties",
        sa.Column(
            "status_changed_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.func.now(),
        ),
    )

    # Best approximation for existing rows: when did we last touch this row?
    op.execute(
        "UPDATE saved_properties "
        "SET status_changed_at = COALESCE(updated_at, saved_at, NOW()) "
        "WHERE status_changed_at IS NULL"
    )

    # Now enforce NOT NULL — every row has a value after backfill.
    op.alter_column("saved_properties", "status_changed_at", nullable=False)


def downgrade() -> None:
    op.drop_column("saved_properties", "status_changed_at")
