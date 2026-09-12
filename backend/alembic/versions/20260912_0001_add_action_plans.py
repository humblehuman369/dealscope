"""Add action_plans and source columns on tasks and contacts.

Revision ID: 20260912_0001
Revises: 20260907_0001
Create Date: 2026-09-12

Phase 0 of the AI Action Plan feature. New ``action_plans`` table plus
``source`` and ``action_plan_id`` on ``property_tasks`` and
``property_contacts`` so template (and later AI) rows can be told apart
from ones the user typed.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID

revision: str = "20260912_0001"
down_revision: str | None = "20260907_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "action_plans",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "saved_property_id",
            UUID(as_uuid=True),
            sa.ForeignKey("saved_properties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("case", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="ready"),
        sa.Column("research", JSON, nullable=True),
        sa.Column("plan", JSON, nullable=True),
        sa.Column("cost_cents", sa.Integer(), nullable=True),
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
    op.create_index("ix_action_plans_saved_property_id", "action_plans", ["saved_property_id"])
    op.create_index("ix_action_plans_user_id", "action_plans", ["user_id"])

    op.add_column(
        "property_tasks",
        sa.Column("source", sa.String(16), nullable=False, server_default="user"),
    )
    op.add_column(
        "property_tasks",
        sa.Column(
            "action_plan_id",
            UUID(as_uuid=True),
            sa.ForeignKey("action_plans.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_property_tasks_action_plan_id", "property_tasks", ["action_plan_id"])

    op.add_column(
        "property_contacts",
        sa.Column("source", sa.String(16), nullable=False, server_default="user"),
    )
    op.add_column(
        "property_contacts",
        sa.Column(
            "action_plan_id",
            UUID(as_uuid=True),
            sa.ForeignKey("action_plans.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_property_contacts_action_plan_id", "property_contacts", ["action_plan_id"])


def downgrade() -> None:
    op.drop_index("ix_property_contacts_action_plan_id", table_name="property_contacts")
    op.drop_column("property_contacts", "action_plan_id")
    op.drop_column("property_contacts", "source")
    op.drop_index("ix_property_tasks_action_plan_id", table_name="property_tasks")
    op.drop_column("property_tasks", "action_plan_id")
    op.drop_column("property_tasks", "source")
    op.drop_index("ix_action_plans_user_id", table_name="action_plans")
    op.drop_index("ix_action_plans_saved_property_id", table_name="action_plans")
    op.drop_table("action_plans")
