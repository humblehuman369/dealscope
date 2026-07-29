"""Add lenders table (directory moves out of lenders.json into Postgres)

Revision ID: 20260730_0001
Revises: 20260729_0001
Create Date: 2026-07-30 00:00:00.000000

Creates the shape only. Rows are loaded from app/data/lenders.json by
backend/scripts/seed_lenders.py, so refreshing the dataset never needs a new
revision.

Two identity decisions are load-bearing:

* ``id`` is INTEGER with no sequence — values come from the JSON dataset because
  ``saved_directory_contacts.entity_id`` already references them and has no FK to
  catch a mismatch. Letting Postgres renumber would silently repoint saved
  contacts at different companies.
* ``domain`` is UNIQUE, giving future refreshes a stable natural key to match on
  instead of file position.

Rates and ratios are DOUBLE PRECISION rather than NUMERIC(5,2): max_ltv 0.925
means 92.5%, min_interest_rate carries up to 6 decimals, and one max_arv value is
500000.0. NUMERIC(5,2) would round 188 seeded values and overflow on that row.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260730_0001"
down_revision: str | None = "20260729_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "lenders",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("domain", sa.Text(), nullable=False),
        sa.Column("company_name", sa.Text(), nullable=False),
        sa.Column("website", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("contact_type", sa.Text(), nullable=False),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("state", sa.String(length=2), nullable=True),
        sa.Column("nationwide", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "states_served",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        sa.Column(
            "loan_products",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("min_loan_amount", sa.Integer(), nullable=True),
        sa.Column("max_loan_amount", sa.Integer(), nullable=True),
        sa.Column("max_ltv", postgresql.DOUBLE_PRECISION(), nullable=True),
        sa.Column("max_arv", postgresql.DOUBLE_PRECISION(), nullable=True),
        sa.Column("min_interest_rate", postgresql.DOUBLE_PRECISION(), nullable=True),
        sa.Column("max_interest_rate", postgresql.DOUBLE_PRECISION(), nullable=True),
        sa.Column("min_points", postgresql.DOUBLE_PRECISION(), nullable=True),
        sa.Column("max_points", postgresql.DOUBLE_PRECISION(), nullable=True),
        sa.Column("min_term_months", sa.Integer(), nullable=True),
        sa.Column("max_term_months", sa.Integer(), nullable=True),
        sa.Column("interest_only", sa.Boolean(), nullable=True),
        sa.Column(
            "display",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("nmls_id", sa.Text(), nullable=True),
        sa.Column("aapl_member", sa.Boolean(), nullable=True),
        sa.Column("year_founded", sa.Integer(), nullable=True),
        sa.Column("credit_check_policy", sa.Text(), nullable=True),
        sa.Column("min_credit_score", sa.Integer(), nullable=True),
        sa.Column("no_credit_check", sa.Boolean(), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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

    op.create_unique_constraint("uq_lenders_domain", "lenders", ["domain"])

    # Coverage and product filters are array containment, so they need GIN.
    op.create_index(
        "ix_lenders_states_gin",
        "lenders",
        ["states_served"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_lenders_products_gin",
        "lenders",
        ["loan_products"],
        postgresql_using="gin",
    )
    # Partial index: every list query filters on is_active.
    op.execute("CREATE INDEX ix_lenders_state_active ON lenders (state) WHERE is_active")
    # Name search and the locality tiebreak both sort/filter case-folded.
    op.execute("CREATE INDEX ix_lenders_company_lower ON lenders (lower(company_name))")
    op.create_index("ix_lenders_max_loan", "lenders", ["max_loan_amount"])


def downgrade() -> None:
    op.drop_index("ix_lenders_max_loan", table_name="lenders")
    op.execute("DROP INDEX IF EXISTS ix_lenders_company_lower")
    op.execute("DROP INDEX IF EXISTS ix_lenders_state_active")
    op.drop_index("ix_lenders_products_gin", table_name="lenders")
    op.drop_index("ix_lenders_states_gin", table_name="lenders")
    op.drop_constraint("uq_lenders_domain", "lenders", type_="unique")
    op.drop_table("lenders")
