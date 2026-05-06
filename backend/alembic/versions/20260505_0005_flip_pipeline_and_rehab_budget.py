"""Flip pipeline columns on saved_properties + rehab budget tables

Revision ID: 20260505_0005
Revises: 20260219_0004
Create Date: 2026-05-05 12:00:00.000000

"""

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20260505_0005"
down_revision = "20260219_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("saved_properties", sa.Column("flip_stage", sa.String(20), nullable=True))
    op.add_column("saved_properties", sa.Column("flip_stage_entered_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("saved_properties", sa.Column("acquired_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("saved_properties", sa.Column("rehab_started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("saved_properties", sa.Column("listed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("saved_properties", sa.Column("sold_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("saved_properties", sa.Column("sold_price", sa.Numeric(12, 2), nullable=True))

    op.create_table(
        "rehab_budgets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "saved_property_id",
            UUID(as_uuid=True),
            sa.ForeignKey("saved_properties.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("contingency_pct", sa.Numeric(6, 4), nullable=False, server_default="0.1000"),
        sa.Column("baseline_total", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("baseline_locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
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
    op.create_table(
        "budget_lines",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "budget_id",
            UUID(as_uuid=True),
            sa.ForeignKey("rehab_budgets.id", ondelete="CASCADE"),
            nullable=False,
            # `index=True` auto-creates `ix_budget_lines_budget_id`. Do NOT
            # also add `op.create_index(...)` for the same name below — that
            # duplicate caused the migration to fail with "relation already
            # exists" on every environment.
            index=True,
        ),
        sa.Column("category_id", sa.String(64), nullable=False),
        sa.Column("item_id", sa.String(64), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("tier", sa.String(8), nullable=False),
        sa.Column("quantity", sa.Numeric(14, 4), nullable=False),
        sa.Column("unit_cost", sa.Numeric(14, 4), nullable=False),
        sa.Column("estimate_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    # Composite index is NOT auto-created — needs explicit op.create_index.
    op.create_index("ix_budget_lines_budget_category", "budget_lines", ["budget_id", "category_id"], unique=False)

    op.create_table(
        "budget_expenses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "budget_id",
            UUID(as_uuid=True),
            sa.ForeignKey("rehab_budgets.id", ondelete="CASCADE"),
            nullable=False,
            # `index=True` auto-creates `ix_budget_expenses_budget_id` —
            # don't also add an explicit `op.create_index` for it (see note
            # on budget_lines above).
            index=True,
        ),
        sa.Column(
            "budget_line_id",
            UUID(as_uuid=True),
            sa.ForeignKey("budget_lines.id", ondelete="SET NULL"),
            nullable=True,
            # Same — auto-creates `ix_budget_expenses_budget_line_id`.
            index=True,
        ),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("spent_on", sa.Date(), nullable=False),
        sa.Column("vendor", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "receipt_document_id",
            UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    # Indexes auto-created by `index=True` on the column declarations are
    # removed automatically when their parent table is dropped — we only
    # need to drop the composite index explicitly.
    op.drop_table("budget_expenses")

    op.drop_index("ix_budget_lines_budget_category", table_name="budget_lines")
    op.drop_table("budget_lines")

    op.drop_table("rehab_budgets")

    op.drop_column("saved_properties", "sold_price")
    op.drop_column("saved_properties", "sold_at")
    op.drop_column("saved_properties", "listed_at")
    op.drop_column("saved_properties", "rehab_started_at")
    op.drop_column("saved_properties", "acquired_at")
    op.drop_column("saved_properties", "flip_stage_entered_at")
    op.drop_column("saved_properties", "flip_stage")
