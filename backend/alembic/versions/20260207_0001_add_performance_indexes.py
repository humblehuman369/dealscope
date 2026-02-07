"""Add performance indexes for common query patterns

Indexes identified during Phase 4 audit:
- saved_properties(user_id, status): composite index for filtered listing queries
- payment_history(stripe_invoice_id): lookup by Stripe invoice
- payment_history(stripe_payment_intent_id): lookup by Stripe payment intent
- role_permissions(role_id): FK join performance
- role_permissions(permission_id): FK join performance
- user_roles(user_id): FK join performance
- user_roles(role_id): FK join performance

Revision ID: 20260207_0001
Revises: 20260206_0001
Create Date: 2026-02-07 12:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260207_0001"
down_revision = "20260206_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add performance indexes for common query patterns."""

    # 1. Composite index on saved_properties(user_id, status)
    #    Used by: list_properties filtered by status (most common query)
    op.create_index(
        "ix_saved_properties_user_status",
        "saved_properties",
        ["user_id", "status"],
        unique=False,
    )

    # 2. Index on payment_history.stripe_invoice_id
    #    Used by: webhook handlers looking up payments by Stripe invoice
    op.create_index(
        "ix_payment_history_stripe_invoice_id",
        "payment_history",
        ["stripe_invoice_id"],
        unique=False,
    )

    # 3. Index on payment_history.stripe_payment_intent_id
    #    Used by: webhook handlers looking up payments by payment intent
    op.create_index(
        "ix_payment_history_stripe_payment_intent_id",
        "payment_history",
        ["stripe_payment_intent_id"],
        unique=False,
    )

    # 4. Index on role_permissions.role_id
    #    Used by: RBAC permission checks (role -> permissions join)
    op.create_index(
        "ix_role_permissions_role_id",
        "role_permissions",
        ["role_id"],
        unique=False,
    )

    # 5. Index on role_permissions.permission_id
    #    Used by: reverse permission lookups
    op.create_index(
        "ix_role_permissions_permission_id",
        "role_permissions",
        ["permission_id"],
        unique=False,
    )

    # 6. Index on user_roles.user_id
    #    Used by: loading user roles during auth
    op.create_index(
        "ix_user_roles_user_id",
        "user_roles",
        ["user_id"],
        unique=False,
    )

    # 7. Index on user_roles.role_id
    #    Used by: listing users with a specific role
    op.create_index(
        "ix_user_roles_role_id",
        "user_roles",
        ["role_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove performance indexes."""
    op.drop_index("ix_user_roles_role_id", table_name="user_roles")
    op.drop_index("ix_user_roles_user_id", table_name="user_roles")
    op.drop_index("ix_role_permissions_permission_id", table_name="role_permissions")
    op.drop_index("ix_role_permissions_role_id", table_name="role_permissions")
    op.drop_index("ix_payment_history_stripe_payment_intent_id", table_name="payment_history")
    op.drop_index("ix_payment_history_stripe_invoice_id", table_name="payment_history")
    op.drop_index("ix_saved_properties_user_status", table_name="saved_properties")
