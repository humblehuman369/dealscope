"""Add saved_directory_contacts table

Revision ID: 20260527_0003
Revises: 20260527_0002
Create Date: 2026-05-27 22:00:00.000000

User-saved lenders and cash buyers from Paid Pro directories.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260527_0003"
down_revision: str | None = "20260527_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "saved_directory_contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(length=16), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column(
            "snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "user_id",
            "entity_type",
            "entity_id",
            name="uq_saved_directory_contacts_user_entity",
        ),
    )
    op.create_index(
        "ix_saved_directory_contacts_user_id",
        "saved_directory_contacts",
        ["user_id"],
    )
    op.create_index(
        "ix_saved_directory_contacts_user_entity_type",
        "saved_directory_contacts",
        ["user_id", "entity_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_saved_directory_contacts_user_entity_type", table_name="saved_directory_contacts")
    op.drop_index("ix_saved_directory_contacts_user_id", table_name="saved_directory_contacts")
    op.drop_table("saved_directory_contacts")
