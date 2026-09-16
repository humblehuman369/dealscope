"""Store a hashed 6-digit code next to email-verification tokens.

Revision ID: 20260916_0001
Revises: 20260912_0002
Create Date: 2026-09-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260916_0001"
down_revision: str | None = "20260912_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("verification_tokens", sa.Column("code_hash", sa.String(64), nullable=True))
    op.add_column(
        "verification_tokens",
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("verification_tokens", "attempt_count")
    op.drop_column("verification_tokens", "code_hash")
