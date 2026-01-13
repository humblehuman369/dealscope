"""Add worksheet_assumptions column to saved_properties

Revision ID: 20250113_0001
Revises: 20250112_0002
Create Date: 2025-01-13 06:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '20250113_0001'
down_revision = '20250112_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add worksheet_assumptions column to saved_properties table."""
    op.add_column(
        'saved_properties',
        sa.Column('worksheet_assumptions', JSON, nullable=True, default=dict)
    )


def downgrade() -> None:
    """Remove worksheet_assumptions column from saved_properties table."""
    op.drop_column('saved_properties', 'worksheet_assumptions')

