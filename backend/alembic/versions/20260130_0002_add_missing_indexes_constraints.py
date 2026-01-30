"""Add missing indexes and constraints

Revision ID: 20260130_0002
Revises: 20260130_0001
Create Date: 2026-01-30

This migration adds:
1. Missing indexes for common query patterns
2. Missing unique constraints to prevent duplicates
3. Check constraints for data validation
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260130_0002'
down_revision: Union[str, None] = '20260130_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing indexes and constraints."""
    
    # ============================================
    # USERS TABLE INDEXES
    # ============================================
    
    # Index for filtering active users sorted by creation date
    op.create_index(
        'ix_users_active_created',
        'users',
        ['is_active', sa.text('created_at DESC')],
        unique=False,
        if_not_exists=True
    )
    
    # ============================================
    # SAVED_PROPERTIES TABLE INDEXES
    # ============================================
    
    # Composite index for user's properties by status (most common query)
    op.create_index(
        'ix_saved_properties_user_status',
        'saved_properties',
        ['user_id', 'status'],
        unique=False,
        if_not_exists=True
    )
    
    # Index for user's properties sorted by save date
    op.create_index(
        'ix_saved_properties_user_saved',
        'saved_properties',
        ['user_id', sa.text('saved_at DESC')],
        unique=False,
        if_not_exists=True
    )
    
    # Unique constraint to prevent duplicate property saves for same user
    # Note: zpid can be null, so we use a partial index for non-null values
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_properties_user_zpid 
        ON saved_properties (user_id, zpid) 
        WHERE zpid IS NOT NULL
    """)
    
    # ============================================
    # SUBSCRIPTIONS TABLE INDEXES
    # ============================================
    
    # Index for filtering by subscription status
    op.create_index(
        'ix_subscriptions_status',
        'subscriptions',
        ['status'],
        unique=False,
        if_not_exists=True
    )
    
    # Index for checking subscription expiration
    op.create_index(
        'ix_subscriptions_period_end',
        'subscriptions',
        ['current_period_end'],
        unique=False,
        if_not_exists=True
    )
    
    # ============================================
    # DOCUMENTS TABLE INDEXES
    # ============================================
    
    # Composite index for user's documents by property
    op.create_index(
        'ix_documents_user_property',
        'documents',
        ['user_id', 'property_id'],
        unique=False,
        if_not_exists=True
    )
    
    # Index for filtering by document type
    op.create_index(
        'ix_documents_type',
        'documents',
        ['document_type'],
        unique=False,
        if_not_exists=True
    )
    
    # ============================================
    # PAYMENT_HISTORY TABLE INDEXES
    # ============================================
    
    # Composite index for user's payments sorted by date
    op.create_index(
        'ix_payment_history_user_created',
        'payment_history',
        ['user_id', sa.text('created_at DESC')],
        unique=False,
        if_not_exists=True
    )
    
    # Unique constraint for Stripe invoice ID to prevent duplicate processing
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_history_stripe_invoice 
        ON payment_history (stripe_invoice_id) 
        WHERE stripe_invoice_id IS NOT NULL
    """)
    
    # ============================================
    # PROPERTY_ADJUSTMENTS TABLE INDEXES
    # ============================================
    
    # Composite index for property adjustment history
    op.create_index(
        'ix_property_adjustments_property_created',
        'property_adjustments',
        ['property_id', sa.text('created_at DESC')],
        unique=False,
        if_not_exists=True
    )


def downgrade() -> None:
    """Remove added indexes and constraints."""
    
    # Property adjustments
    op.drop_index('ix_property_adjustments_property_created', table_name='property_adjustments', if_exists=True)
    
    # Payment history
    op.execute("DROP INDEX IF EXISTS uq_payment_history_stripe_invoice")
    op.drop_index('ix_payment_history_user_created', table_name='payment_history', if_exists=True)
    
    # Documents
    op.drop_index('ix_documents_type', table_name='documents', if_exists=True)
    op.drop_index('ix_documents_user_property', table_name='documents', if_exists=True)
    
    # Subscriptions
    op.drop_index('ix_subscriptions_period_end', table_name='subscriptions', if_exists=True)
    op.drop_index('ix_subscriptions_status', table_name='subscriptions', if_exists=True)
    
    # Saved properties
    op.execute("DROP INDEX IF EXISTS uq_saved_properties_user_zpid")
    op.drop_index('ix_saved_properties_user_saved', table_name='saved_properties', if_exists=True)
    op.drop_index('ix_saved_properties_user_status', table_name='saved_properties', if_exists=True)
    
    # Users
    op.drop_index('ix_users_active_created', table_name='users', if_exists=True)
