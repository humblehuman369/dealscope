"""Add marketing_briefs.kind (daily | weekly) and widen the unique key.

Revision ID: 20260904_0003
Revises: 20260904_0002
Create Date: 2026-09-04

The Monday weekly rollup is written by a cron, not a bot, and must coexist
with the Analyst's daily brief for the same date.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260904_0003"
down_revision: str | None = "20260904_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "marketing_briefs",
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="daily"),
    )
    op.drop_constraint("uq_marketing_briefs_date", "marketing_briefs", type_="unique")
    op.create_unique_constraint("uq_marketing_briefs_date_kind", "marketing_briefs", ["date", "kind"])


def downgrade() -> None:
    op.execute("DELETE FROM marketing_briefs WHERE kind <> 'daily'")
    op.drop_constraint("uq_marketing_briefs_date_kind", "marketing_briefs", type_="unique")
    op.create_unique_constraint("uq_marketing_briefs_date", "marketing_briefs", ["date"])
    op.drop_column("marketing_briefs", "kind")
