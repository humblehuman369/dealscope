"""Drop legacy token columns and worksheet_assumptions

Removes deprecated columns that have been fully replaced:
- users.verification_token / verification_token_expires (replaced by verification_tokens table)
- users.reset_token / reset_token_expires (replaced by verification_tokens table)
- saved_properties.worksheet_assumptions (replaced by deal_maker_record)

Revision ID: 20260219_0001
Revises: 20260217_0001
Create Date: 2026-02-19 05:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "20260219_0001"
down_revision = "20260217_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("users", "verification_token")
    op.drop_column("users", "verification_token_expires")
    op.drop_column("users", "reset_token")
    op.drop_column("users", "reset_token_expires")
    op.drop_column("saved_properties", "worksheet_assumptions")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("verification_token", sa.String(255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("verification_token_expires", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("reset_token", sa.String(255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("reset_token_expires", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "saved_properties",
        sa.Column("worksheet_assumptions", sa.JSON(), nullable=True),
    )
