"""Add Google OAuth fields to users table

Revision ID: 20260217_0001
Revises: 20260214_0002
Create Date: 2026-02-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "20260217_0001"
down_revision = "20260214_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("oauth_provider", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("oauth_id", sa.String(255), nullable=True))
    op.create_index("ix_users_oauth_provider", "users", ["oauth_provider"], unique=False)
    op.create_index("ix_users_oauth_id", "users", ["oauth_id"], unique=False)
    # Unique on (provider, oauth_id) so one Google account = one user; multiple NULLs allowed
    op.create_index(
        "uq_users_oauth_provider_id",
        "users",
        ["oauth_provider", "oauth_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_users_oauth_provider_id", table_name="users")
    op.drop_index("ix_users_oauth_id", table_name="users")
    op.drop_index("ix_users_oauth_provider", table_name="users")
    op.drop_column("users", "oauth_id")
    op.drop_column("users", "oauth_provider")
