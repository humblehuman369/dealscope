"""Add document_blobs table for Postgres-backed document storage

Revision ID: 20260603_0001
Revises: 20260527_0003
Create Date: 2026-06-03 02:30:00.000000

Stores uploaded document file bytes in Postgres so files survive redeploys on
hosts with ephemeral disks (Railway). Kept in a separate table from
``documents`` so metadata/list queries never load file bytes. Active when
``STORAGE_BACKEND=postgres``.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260603_0001"
down_revision: str | None = "20260527_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "document_blobs",
        sa.Column("storage_key", sa.String(length=500), primary_key=True),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=True),
        sa.Column("byte_size", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("document_blobs")
