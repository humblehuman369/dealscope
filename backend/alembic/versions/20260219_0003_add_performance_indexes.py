"""Add performance indexes for common query patterns

- saved_properties(user_id, status): pipeline filtering
- saved_properties(user_id, saved_at DESC): default sort order
- payment_history(created_at): time-range pagination
- user_sessions(user_id) WHERE is_revoked = FALSE: active session lookups

Revision ID: 20260219_0003
Revises: 20260219_0002
Create Date: 2026-02-19 07:00:00.000000

"""
from alembic import op

revision = "20260219_0003"
down_revision = "20260219_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_sp_user_status",
        "saved_properties",
        ["user_id", "status"],
    )
    op.execute(
        "CREATE INDEX ix_sp_user_saved_at "
        "ON saved_properties (user_id, saved_at DESC)"
    )
    op.create_index(
        "ix_ph_created_at",
        "payment_history",
        ["created_at"],
    )
    op.execute(
        "CREATE INDEX ix_us_user_active "
        "ON user_sessions (user_id) "
        "WHERE is_revoked = FALSE"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_us_user_active")
    op.drop_index("ix_ph_created_at", table_name="payment_history")
    op.execute("DROP INDEX IF EXISTS ix_sp_user_saved_at")
    op.drop_index("ix_sp_user_status", table_name="saved_properties")
