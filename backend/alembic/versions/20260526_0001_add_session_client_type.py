"""Add client_type to user sessions.

Revision ID: 20260526_0001
Revises: 7753088d860a
Create Date: 2026-05-26 04:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260526_0001"
down_revision: str | None = "7753088d860a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user_sessions",
        sa.Column("client_type", sa.String(length=20), server_default="desktop", nullable=False),
    )
    op.create_index(
        "ix_user_sessions_user_active_client_type",
        "user_sessions",
        ["user_id", "is_revoked", "client_type"],
    )
    op.alter_column("user_sessions", "client_type", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_user_sessions_user_active_client_type", table_name="user_sessions")
    op.drop_column("user_sessions", "client_type")
