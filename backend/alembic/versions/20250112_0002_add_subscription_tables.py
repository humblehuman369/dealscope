"""Add subscription and payment history tables

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-12

Creates tables for Stripe billing integration:
- subscriptions: User subscription plans and usage tracking
- payment_history: Record of payment events from Stripe
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ===========================================
    # Subscriptions Table
    # ===========================================
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        
        # Stripe IDs
        sa.Column('stripe_customer_id', sa.String(255), nullable=True, index=True),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True, unique=True),
        sa.Column('stripe_price_id', sa.String(255), nullable=True),
        
        # Subscription details
        sa.Column('tier', sa.String(50), nullable=False, default='free'),  # free, starter, pro, enterprise
        sa.Column('status', sa.String(50), nullable=False, default='active'),  # active, past_due, canceled, etc.
        
        # Billing period
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean(), default=False),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
        
        # Trial
        sa.Column('trial_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True),
        
        # Usage limits
        sa.Column('properties_limit', sa.Integer(), default=5),
        sa.Column('searches_per_month', sa.Integer(), default=25),
        sa.Column('api_calls_per_month', sa.Integer(), default=100),
        
        # Usage tracking
        sa.Column('searches_used', sa.Integer(), default=0),
        sa.Column('api_calls_used', sa.Integer(), default=0),
        sa.Column('usage_reset_date', sa.DateTime(timezone=True), nullable=True),
        
        # Metadata
        sa.Column('metadata', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create index on user_id for faster lookups
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'])
    
    # ===========================================
    # Payment History Table
    # ===========================================
    op.create_table(
        'payment_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        
        # Stripe IDs
        sa.Column('stripe_invoice_id', sa.String(255), nullable=True),
        sa.Column('stripe_payment_intent_id', sa.String(255), nullable=True),
        sa.Column('stripe_charge_id', sa.String(255), nullable=True),
        
        # Payment details
        sa.Column('amount', sa.Integer(), nullable=False),  # Amount in cents
        sa.Column('currency', sa.String(3), default='usd'),
        sa.Column('status', sa.String(50), nullable=False),  # succeeded, failed, pending, refunded
        sa.Column('description', sa.String(500), nullable=True),
        
        # Invoice details
        sa.Column('invoice_pdf_url', sa.String(500), nullable=True),
        sa.Column('receipt_url', sa.String(500), nullable=True),
        
        # Metadata
        sa.Column('metadata', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create index on user_id for faster lookups
    op.create_index('ix_payment_history_user_id', 'payment_history', ['user_id'])
    
    # ===========================================
    # Search History Table (if not exists)
    # ===========================================
    # Check if search_history table exists, create if not
    # This handles the case where search_history was added but not migrated
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'search_history' not in inspector.get_table_names():
        op.create_table(
            'search_history',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('query', sa.String(), nullable=False),
            sa.Column('search_type', sa.String(50), nullable=True),
            sa.Column('results_count', sa.Integer(), nullable=True),
            sa.Column('search_params', postgresql.JSON(), nullable=True),
            sa.Column('searched_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index('ix_search_history_user_id', 'search_history', ['user_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'search_history' in inspector.get_table_names():
        op.drop_index('ix_search_history_user_id', table_name='search_history')
        op.drop_table('search_history')
    
    op.drop_index('ix_payment_history_user_id', table_name='payment_history')
    op.drop_table('payment_history')
    
    op.drop_index('ix_subscriptions_user_id', table_name='subscriptions')
    op.drop_table('subscriptions')

