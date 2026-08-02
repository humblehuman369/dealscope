"""Add latitude/longitude to saved_properties for My Deal Map pins.

Revision ID: 20260804_0001
Revises: 20260803_0004
Create Date: 2026-08-02

Nullable coordinates so existing rows remain valid; new saves and client
geocode backfills populate them for the My Deal Map layer.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260804_0001"
down_revision: Union[str, None] = "20260803_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "saved_properties",
        sa.Column("latitude", sa.Float(), nullable=True),
    )
    op.add_column(
        "saved_properties",
        sa.Column("longitude", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("saved_properties", "longitude")
    op.drop_column("saved_properties", "latitude")
