"""Add comp_analysis column to saved_properties.

Revision ID: 20260802_0002
Revises: 20260802_0001
Create Date: 2026-07-30

Stores the Comps page state (selected comp ids and value overrides) with the
saved property, so a user's comp selections and adjustments persist and are
visible from the dashboard.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260802_0002"
down_revision: Union[str, None] = "20260802_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "saved_properties",
        sa.Column("comp_analysis", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("saved_properties", "comp_analysis")
