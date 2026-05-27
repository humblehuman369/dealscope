"""Add unique index on cash_buyers.phone for upserts

Revision ID: 20260527_0002
Revises: 20260527_0001
Create Date: 2026-05-27 14:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260527_0002"
down_revision: str | None = "20260527_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_buyers_phone
        ON cash_buyers (phone)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_cash_buyers_phone")
