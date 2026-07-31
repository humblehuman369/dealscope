"""Add gap-alert price tracking columns to saved_properties.

Revision ID: 20260803_0002
Revises: 20260803_0001
Create Date: 2026-07-30

Gap Alerts v1: the daily price-check job stores the last list price it saw
per property so a subsequent drop can be detected (and alerted) exactly once.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260803_0002"
down_revision: Union[str, None] = "20260803_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "saved_properties",
        sa.Column("last_known_list_price", sa.Numeric(12, 2), nullable=True),
    )
    op.add_column(
        "saved_properties",
        sa.Column("price_checked_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("saved_properties", "price_checked_at")
    op.drop_column("saved_properties", "last_known_list_price")
