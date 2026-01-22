"""Add search history and business profile fields

Revision ID: 20250112_0001
Revises: 0002
Create Date: 2025-01-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250112_0001'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add business profile fields to users table
    op.add_column('users', sa.Column('business_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('business_type', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('business_address_street', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('business_address_city', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('business_address_state', sa.String(10), nullable=True))
    op.add_column('users', sa.Column('business_address_zip', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('business_address_country', sa.String(100), nullable=True, server_default='USA'))
    op.add_column('users', sa.Column('phone_numbers', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('users', sa.Column('additional_emails', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('users', sa.Column('social_links', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('users', sa.Column('license_number', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('license_state', sa.String(10), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))

    # Create search_history table
    op.create_table(
        'search_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('search_query', sa.String(500), nullable=False),
        sa.Column('address_street', sa.String(255), nullable=True),
        sa.Column('address_city', sa.String(100), nullable=True),
        sa.Column('address_state', sa.String(10), nullable=True),
        sa.Column('address_zip', sa.String(20), nullable=True),
        sa.Column('property_cache_id', sa.String(100), nullable=True),
        sa.Column('zpid', sa.String(50), nullable=True),
        sa.Column('result_summary', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('search_source', sa.String(50), nullable=True, server_default='web'),
        sa.Column('was_successful', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('error_message', sa.String(500), nullable=True),
        sa.Column('was_saved', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('searched_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    
    # Create indexes for search_history
    op.create_index('ix_search_history_user_id', 'search_history', ['user_id'])
    op.create_index('ix_search_history_property_cache_id', 'search_history', ['property_cache_id'])
    op.create_index('ix_search_history_user_searched', 'search_history', ['user_id', 'searched_at'])


def downgrade() -> None:
    # Drop search_history table and indexes
    op.drop_index('ix_search_history_user_searched', 'search_history')
    op.drop_index('ix_search_history_property_cache_id', 'search_history')
    op.drop_index('ix_search_history_user_id', 'search_history')
    op.drop_table('search_history')
    
    # Remove business profile columns from users
    op.drop_column('users', 'bio')
    op.drop_column('users', 'license_state')
    op.drop_column('users', 'license_number')
    op.drop_column('users', 'social_links')
    op.drop_column('users', 'additional_emails')
    op.drop_column('users', 'phone_numbers')
    op.drop_column('users', 'business_address_country')
    op.drop_column('users', 'business_address_zip')
    op.drop_column('users', 'business_address_state')
    op.drop_column('users', 'business_address_city')
    op.drop_column('users', 'business_address_street')
    op.drop_column('users', 'business_type')
    op.drop_column('users', 'business_name')

