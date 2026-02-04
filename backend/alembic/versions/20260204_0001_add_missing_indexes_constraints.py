"""Add missing indexes and constraints

This migration adds indexes and constraints identified during the backend audit:
- Index on admin_assumption_defaults.updated_by (FK lookup performance)
- Index on search_history.zpid (Zillow ID queries)
- Index on shared_links.expires_at (expiration checks)
- Index on documents.storage_key (file lookups)
- Index on documents.uploaded_at (date sorting)
- Unique constraint on subscriptions.stripe_customer_id
- Unique constraint on shared_links(user_id, property_id)

Revision ID: 20260204_0001
Revises: 20260130_0002
Create Date: 2026-02-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260204_0001'
down_revision = '20260130_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add missing indexes and constraints."""
    
    # 1. Index on admin_assumption_defaults.updated_by (FK lookup)
    op.create_index(
        'ix_admin_assumption_defaults_updated_by',
        'admin_assumption_defaults',
        ['updated_by'],
        unique=False
    )
    
    # 2. Index on search_history.zpid (Zillow ID queries)
    op.create_index(
        'ix_search_history_zpid',
        'search_history',
        ['zpid'],
        unique=False
    )
    
    # 3. Index on shared_links.expires_at (expiration checks)
    op.create_index(
        'ix_shared_links_expires_at',
        'shared_links',
        ['expires_at'],
        unique=False
    )
    
    # 4. Index on documents.storage_key (file lookups)
    op.create_index(
        'ix_documents_storage_key',
        'documents',
        ['storage_key'],
        unique=False
    )
    
    # 5. Index on documents.uploaded_at (date sorting)
    op.create_index(
        'ix_documents_uploaded_at',
        'documents',
        ['uploaded_at'],
        unique=False
    )
    
    # 6. Unique constraint on subscriptions.stripe_customer_id
    # Note: This may fail if there are duplicates - check data first
    op.create_index(
        'ix_subscriptions_stripe_customer_id_unique',
        'subscriptions',
        ['stripe_customer_id'],
        unique=True,
        postgresql_where=sa.text('stripe_customer_id IS NOT NULL')
    )
    
    # 7. Unique constraint on shared_links(user_id, property_id)
    # Prevent duplicate shares for the same property by the same user
    op.create_index(
        'ix_shared_links_user_property_unique',
        'shared_links',
        ['user_id', 'property_id'],
        unique=True
    )


def downgrade() -> None:
    """Remove indexes and constraints."""
    
    op.drop_index('ix_shared_links_user_property_unique', table_name='shared_links')
    op.drop_index('ix_subscriptions_stripe_customer_id_unique', table_name='subscriptions')
    op.drop_index('ix_documents_uploaded_at', table_name='documents')
    op.drop_index('ix_documents_storage_key', table_name='documents')
    op.drop_index('ix_shared_links_expires_at', table_name='shared_links')
    op.drop_index('ix_search_history_zpid', table_name='search_history')
    op.drop_index('ix_admin_assumption_defaults_updated_by', table_name='admin_assumption_defaults')
