"""Initial user and property tables

Revision ID: 0001
Revises: 
Create Date: 2024-12-28

Creates the foundational tables for:
- users: User accounts and authentication
- user_profiles: Investment preferences and settings
- saved_properties: User's saved property portfolio
- property_adjustments: History of property modifications
- documents: File uploads linked to properties
- shared_links: Shareable property links
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ===========================================
    # Users Table
    # ===========================================
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255)),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('is_superuser', sa.Boolean(), default=False),
        sa.Column('verification_token', sa.String(255)),
        sa.Column('verification_token_expires', sa.DateTime()),
        sa.Column('reset_token', sa.String(255)),
        sa.Column('reset_token_expires', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('last_login', sa.DateTime()),
    )

    # ===========================================
    # User Profiles Table
    # ===========================================
    op.create_table(
        'user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('users.id', ondelete='CASCADE'), 
                  unique=True, nullable=False),
        sa.Column('investment_experience', sa.String(50)),
        sa.Column('preferred_strategies', postgresql.ARRAY(sa.String())),
        sa.Column('target_markets', postgresql.ARRAY(sa.String())),
        sa.Column('investment_budget_min', sa.Float()),
        sa.Column('investment_budget_max', sa.Float()),
        sa.Column('target_cash_on_cash', sa.Float()),
        sa.Column('target_cap_rate', sa.Float()),
        sa.Column('risk_tolerance', sa.String(20)),
        sa.Column('default_assumptions', postgresql.JSON()),
        sa.Column('notification_preferences', postgresql.JSON()),
        sa.Column('dashboard_layout', postgresql.JSON()),
        sa.Column('preferred_theme', sa.String(20), default='system'),
        sa.Column('onboarding_completed', sa.Boolean(), default=False),
        sa.Column('onboarding_step', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ===========================================
    # Saved Properties Table
    # ===========================================
    op.create_table(
        'saved_properties',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('users.id', ondelete='CASCADE'), 
                  nullable=False, index=True),
        sa.Column('external_property_id', sa.String(100), index=True),
        sa.Column('zpid', sa.String(50), index=True),
        sa.Column('address_street', sa.String(255), nullable=False),
        sa.Column('address_city', sa.String(100)),
        sa.Column('address_state', sa.String(10)),
        sa.Column('address_zip', sa.String(20)),
        sa.Column('full_address', sa.String(500), index=True),
        sa.Column('property_data_snapshot', postgresql.JSON()),
        sa.Column('status', sa.String(20), default='watching'),
        sa.Column('nickname', sa.String(100)),
        sa.Column('tags', postgresql.ARRAY(sa.String())),
        sa.Column('color_label', sa.String(20)),
        sa.Column('priority', sa.Integer()),
        sa.Column('display_order', sa.Integer()),
        sa.Column('custom_purchase_price', sa.Float()),
        sa.Column('custom_rent_estimate', sa.Float()),
        sa.Column('custom_arv', sa.Float()),
        sa.Column('custom_rehab_budget', sa.Float()),
        sa.Column('custom_daily_rate', sa.Float()),
        sa.Column('custom_occupancy_rate', sa.Float()),
        sa.Column('custom_assumptions', postgresql.JSON()),
        sa.Column('notes', sa.Text()),
        sa.Column('last_analytics_result', postgresql.JSON()),
        sa.Column('analytics_calculated_at', sa.DateTime()),
        sa.Column('best_strategy', sa.String(20)),
        sa.Column('best_cash_flow', sa.Float()),
        sa.Column('best_coc_return', sa.Float()),
        sa.Column('saved_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('last_viewed_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('data_refreshed_at', sa.DateTime()),
    )

    # ===========================================
    # Property Adjustments Table
    # ===========================================
    op.create_table(
        'property_adjustments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('property_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('saved_properties.id', ondelete='CASCADE'), 
                  nullable=False, index=True),
        sa.Column('adjustment_type', sa.String(50), nullable=False),
        sa.Column('field_name', sa.String(100)),
        sa.Column('previous_value', postgresql.JSON()),
        sa.Column('new_value', postgresql.JSON()),
        sa.Column('reason', sa.Text()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
    )

    # ===========================================
    # Documents Table
    # ===========================================
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('users.id', ondelete='CASCADE'), 
                  nullable=False, index=True),
        sa.Column('property_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('saved_properties.id', ondelete='SET NULL'), 
                  index=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255)),
        sa.Column('file_type', sa.String(100)),
        sa.Column('file_extension', sa.String(20)),
        sa.Column('file_size', sa.Integer()),
        sa.Column('storage_key', sa.String(500), nullable=False),
        sa.Column('storage_bucket', sa.String(100)),
        sa.Column('thumbnail_key', sa.String(500)),
        sa.Column('has_thumbnail', sa.Boolean(), default=False),
        sa.Column('document_type', sa.String(50), default='other'),
        sa.Column('title', sa.String(255)),
        sa.Column('description', sa.Text()),
        sa.Column('tags', postgresql.ARRAY(sa.String())),
        sa.Column('document_date', sa.DateTime()),
        sa.Column('is_private', sa.Boolean(), default=True),
        sa.Column('processing_status', sa.String(50)),
        sa.Column('processing_error', sa.Text()),
        sa.Column('extracted_text', sa.Text()),
        sa.Column('uploaded_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ===========================================
    # Shared Links Table
    # ===========================================
    op.create_table(
        'shared_links',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('users.id', ondelete='CASCADE'), 
                  nullable=False, index=True),
        sa.Column('property_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('saved_properties.id', ondelete='CASCADE'), 
                  nullable=False, index=True),
        sa.Column('share_type', sa.String(20), default='public_link'),
        sa.Column('share_token', sa.String(64), unique=True, index=True),
        sa.Column('password_hash', sa.String(255)),
        sa.Column('allowed_emails', postgresql.ARRAY(sa.String())),
        sa.Column('view_count', sa.Integer(), default=0),
        sa.Column('max_views', sa.Integer()),
        sa.Column('include_analytics', sa.Boolean(), default=True),
        sa.Column('include_documents', sa.Boolean(), default=False),
        sa.Column('include_adjustments', sa.Boolean(), default=True),
        sa.Column('include_notes', sa.Boolean(), default=False),
        sa.Column('visible_strategies', postgresql.ARRAY(sa.String())),
        sa.Column('message', sa.Text()),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('expires_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('last_accessed_at', sa.DateTime()),
    )


def downgrade() -> None:
    op.drop_table('shared_links')
    op.drop_table('documents')
    op.drop_table('property_adjustments')
    op.drop_table('saved_properties')
    op.drop_table('user_profiles')
    op.drop_table('users')

