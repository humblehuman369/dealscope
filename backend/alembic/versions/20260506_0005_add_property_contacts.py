"""Add property_contacts table

Revision ID: 20260506_0005
Revises: 20260506_0004
Create Date: 2026-05-06 02:00:00.000000

Per-property contact list (seller, agent, lender, contractor, etc.). Cascade-
deletes with the parent saved_property. Role is stored as VARCHAR(32) — the
SQLAlchemy enum is non-native, so adding new roles is a code-only change.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "20260506_0005"
down_revision = "20260506_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "property_contacts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "saved_property_id",
            UUID(as_uuid=True),
            sa.ForeignKey("saved_properties.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(32), nullable=False, server_default="other"),
        sa.Column("company", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(64), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
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


def downgrade() -> None:
    op.drop_table("property_contacts")
