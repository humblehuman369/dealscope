"""Add cash_buyers table

Revision ID: 20260527_0001
Revises: 20260526_0001
Create Date: 2026-05-27 12:00:00.000000

Cash buyer directory records for paid Pro directory search and filtering.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260527_0001"
down_revision: str | None = "20260526_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_EMPTY_TEXT_ARRAY = sa.text("'{}'::text[]")


def upgrade() -> None:
    op.create_table(
        "cash_buyers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_name", sa.Text(), nullable=False),
        sa.Column("owner_name", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("street", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("state", sa.String(length=2), nullable=True),
        sa.Column("zip", sa.Text(), nullable=True),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "strategies",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=_EMPTY_TEXT_ARRAY,
        ),
        sa.Column(
            "coverage",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=_EMPTY_TEXT_ARRAY,
        ),
        sa.Column("buyer_type", sa.Text(), nullable=True),
        sa.Column("deals", sa.Integer(), nullable=True),
        sa.Column("years", sa.Integer(), nullable=True),
        sa.Column("response_time", sa.Text(), nullable=True),
        sa.Column("accent", sa.Text(), nullable=True),
        sa.Column("initials", sa.String(length=2), nullable=True),
        sa.Column(
            "passes_strict_filter",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
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

    op.execute(
        """
        CREATE INDEX ix_cash_buyers_state_strict
        ON cash_buyers (state)
        WHERE passes_strict_filter = TRUE
        """
    )
    op.execute(
        """
        CREATE INDEX ix_cash_buyers_city_lower_strict
        ON cash_buyers (lower(city))
        WHERE passes_strict_filter = TRUE
        """
    )
    op.create_index("ix_cash_buyers_phone", "cash_buyers", ["phone"])
    op.execute(
        """
        CREATE INDEX ix_cash_buyers_coverage_gin
        ON cash_buyers USING GIN (coverage)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_cash_buyers_strategies_gin
        ON cash_buyers USING GIN (strategies)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_cash_buyers_strategies_gin")
    op.execute("DROP INDEX IF EXISTS ix_cash_buyers_coverage_gin")
    op.drop_index("ix_cash_buyers_phone", table_name="cash_buyers")
    op.execute("DROP INDEX IF EXISTS ix_cash_buyers_city_lower_strict")
    op.execute("DROP INDEX IF EXISTS ix_cash_buyers_state_strict")
    op.drop_table("cash_buyers")
