"""Add admin_assumption_defaults table

Revision ID: 20260122_0001
Revises: 20250113_0001
Create Date: 2026-01-22 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

# revision identifiers, used by Alembic.
revision = '20260122_0001'
down_revision = '20250113_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'admin_assumption_defaults',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('assumptions', JSON, nullable=False),
        sa.Column('updated_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('admin_assumption_defaults')
