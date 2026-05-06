"""Add property_tasks table

Revision ID: 20260506_0003
Revises: 20260506_0002
Create Date: 2026-05-06 01:00:00.000000

Per-property to-do items. Drives the kanban card task badge and the slide-over
TasksPanel. Cascade-deletes with the parent saved_property.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "20260506_0003"
down_revision = "20260506_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "property_tasks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "saved_property_id",
            UUID(as_uuid=True),
            sa.ForeignKey("saved_properties.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "completed_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
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
    )
    # Composite index for the dashboard kanban "open task count per property"
    # rollup query — by far the hottest read path on this table.
    op.create_index(
        "ix_property_tasks_property_open",
        "property_tasks",
        ["saved_property_id", "completed_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_property_tasks_property_open", table_name="property_tasks")
    op.drop_table("property_tasks")
