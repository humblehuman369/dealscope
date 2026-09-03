"""Add linkedin_posts queue for the cron-gated LinkedIn publisher.

Revision ID: 20260903_0002
Revises: 20260903_0001
Create Date: 2026-09-03

Humans write and approve every row. The job selects due approved rows with
FOR UPDATE SKIP LOCKED, publishes to LinkedIn, and records the post URN
before anything else so a crash cannot double-post.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260903_0002"
down_revision: str | None = "20260903_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    linkedin_account = postgresql.ENUM("founder", "company", name="linkedin_account")
    linkedin_media_type = postgresql.ENUM("none", "image", "document", name="linkedin_media_type")
    linkedin_post_status = postgresql.ENUM(
        "draft",
        "approved",
        "publishing",
        "published",
        "failed",
        "cancelled",
        name="linkedin_post_status",
    )
    linkedin_account.create(op.get_bind(), checkfirst=True)
    linkedin_media_type.create(op.get_bind(), checkfirst=True)
    linkedin_post_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "linkedin_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("batch", sa.Text(), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column(
            "account",
            postgresql.ENUM("founder", "company", name="linkedin_account", create_type=False),
            nullable=False,
        ),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "media_type",
            postgresql.ENUM("none", "image", "document", name="linkedin_media_type", create_type=False),
            nullable=False,
            server_default="none",
        ),
        sa.Column("media_path", sa.Text(), nullable=True),
        sa.Column("media_alt_text", sa.Text(), nullable=True),
        sa.Column("document_title", sa.Text(), nullable=True),
        sa.Column("media_bytes", sa.LargeBinary(), nullable=True),
        sa.Column("first_comment", sa.Text(), nullable=True),
        sa.Column("reshare_of_key", sa.Text(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "draft",
                "approved",
                "publishing",
                "published",
                "failed",
                "cancelled",
                name="linkedin_post_status",
                create_type=False,
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("approved_by", sa.String(length=255), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("linkedin_post_urn", sa.Text(), nullable=True),
        sa.Column("linkedin_comment_urn", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
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
        sa.UniqueConstraint("key", name="uq_linkedin_posts_key"),
    )
    op.create_index("ix_linkedin_posts_batch", "linkedin_posts", ["batch"])
    op.create_index("ix_linkedin_posts_scheduled_at", "linkedin_posts", ["scheduled_at"])
    op.create_index("ix_linkedin_posts_status", "linkedin_posts", ["status"])
    op.create_index("ix_linkedin_posts_reshare_of_key", "linkedin_posts", ["reshare_of_key"])


def downgrade() -> None:
    op.drop_index("ix_linkedin_posts_reshare_of_key", table_name="linkedin_posts")
    op.drop_index("ix_linkedin_posts_status", table_name="linkedin_posts")
    op.drop_index("ix_linkedin_posts_scheduled_at", table_name="linkedin_posts")
    op.drop_index("ix_linkedin_posts_batch", table_name="linkedin_posts")
    op.drop_table("linkedin_posts")
    op.execute("DROP TYPE IF EXISTS linkedin_post_status")
    op.execute("DROP TYPE IF EXISTS linkedin_media_type")
    op.execute("DROP TYPE IF EXISTS linkedin_account")
