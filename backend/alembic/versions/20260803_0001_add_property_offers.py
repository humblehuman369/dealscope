"""Add property_offers table.

Revision ID: 20260803_0001
Revises: 20260802_0002
Create Date: 2026-07-30

Offer Tracker v1: each saved property carries an offer history (amount,
status, counter, expiration, notes) so the pipeline's Negotiating and
Under Contract stages have a tracked record behind them.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260803_0001"
down_revision: Union[str, None] = "20260802_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OFFER_STATUSES = (
    "draft",
    "submitted",
    "countered",
    "accepted",
    "rejected",
    "withdrawn",
    "expired",
)


def upgrade() -> None:
    offer_status = postgresql.ENUM(*OFFER_STATUSES, name="offerstatus", create_type=False)
    offer_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "property_offers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "saved_property_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("saved_properties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("counter_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("status", offer_status, nullable=False, server_default="submitted"),
        sa.Column("offer_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_property_offers_saved_property_id", "property_offers", ["saved_property_id"]
    )
    op.create_index("ix_property_offers_created_by_id", "property_offers", ["created_by_id"])


def downgrade() -> None:
    op.drop_index("ix_property_offers_created_by_id", table_name="property_offers")
    op.drop_index("ix_property_offers_saved_property_id", table_name="property_offers")
    op.drop_table("property_offers")
    postgresql.ENUM(name="offerstatus").drop(op.get_bind(), checkfirst=True)
