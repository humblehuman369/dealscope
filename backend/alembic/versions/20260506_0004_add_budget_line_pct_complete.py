"""Add pct_complete column to budget_lines

Revision ID: 20260506_0004
Revises: 20260506_0003
Create Date: 2026-05-06 01:30:00.000000

Powers the Budget vs Actual comparison page — % Complete drives Projected,
which drives Variance. Existing rows default to 0%.
"""

import sqlalchemy as sa
from alembic import op

revision = "20260506_0004"
down_revision = "20260506_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "budget_lines",
        sa.Column(
            "pct_complete",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("budget_lines", "pct_complete")
