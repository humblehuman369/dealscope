"""Add deal_memo column to saved_properties.

Revision ID: 20260803_0003
Revises: 20260803_0002
Create Date: 2026-07-30

Explainable deal memo v1: stores the generated memo ({text, source,
generated_at}) so it survives reloads without re-spending an AI call.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260803_0003"
down_revision: Union[str, None] = "20260803_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "saved_properties",
        sa.Column("deal_memo", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("saved_properties", "deal_memo")
