"""Add actuals column to saved_properties.

Revision ID: 20260803_0004
Revises: 20260803_0003
Create Date: 2026-07-30

Assumptions-vs-actuals v1: owned properties can record actual monthly rent
and all-in monthly expenses so the deal page can show underwriting variance.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260803_0004"
down_revision: Union[str, None] = "20260803_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "saved_properties",
        sa.Column("actuals", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("saved_properties", "actuals")
