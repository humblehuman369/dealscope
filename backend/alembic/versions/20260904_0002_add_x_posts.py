"""Add x_posts queue (sibling of linkedin_posts).

Revision ID: 20260904_0002
Revises: 20260904_0001
Create Date: 2026-09-04

Same draft -> approved -> publishing -> published | failed | cancelled
lifecycle as linkedin_posts. A row is a thread (``thread_json``); the head
post id is persisted before status flips so a crash never double-posts.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260904_0002"
down_revision: str | None = "20260904_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "x_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("batch", sa.Text(), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("thread_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="draft"),
        sa.Column("approved_by", sa.String(length=255), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("x_post_id", sa.Text(), nullable=True),
        sa.Column(
            "published_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by", sa.String(length=255), nullable=False, server_default="human"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("key", name="uq_x_posts_key"),
    )
    op.create_index("ix_x_posts_batch", "x_posts", ["batch"])
    op.create_index("ix_x_posts_scheduled_at", "x_posts", ["scheduled_at"])
    op.create_index("ix_x_posts_status", "x_posts", ["status"])


def downgrade() -> None:
    op.drop_index("ix_x_posts_status", table_name="x_posts")
    op.drop_index("ix_x_posts_scheduled_at", table_name="x_posts")
    op.drop_index("ix_x_posts_batch", table_name="x_posts")
    op.drop_table("x_posts")
