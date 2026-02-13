"""Add device_tokens table for push notifications

Revision ID: 20260212_0001
Revises: 20260210_0001
Create Date: 2026-02-12 12:00:00.000000

"""
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision = "20260212_0001"
down_revision = "20260210_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("token", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column(
            "device_platform",
            sa.Enum("ios", "android", name="deviceplatform"),
            nullable=False,
        ),
        sa.Column("device_name", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False, server_default="true"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("device_tokens")
    # Drop the enum type created for device_platform
    op.execute("DROP TYPE IF EXISTS deviceplatform")
