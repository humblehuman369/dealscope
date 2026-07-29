"""Add directory_service_area — one indexed answer to "who covers this location?"

Revision ID: 20260731_0001
Revises: 20260730_0001
Create Date: 2026-07-31 00:00:00.000000

Creates the shape only; rows are derived by
backend/scripts/backfill_service_area.py.

The restructure plan specified
``PRIMARY KEY (entity_type, entity_id, scope, state, county_fips)``, which
Postgres rejects: a primary key cannot contain NULL, and both ``state`` and
``county_fips`` are null by design (``state`` for nationwide rows,
``county_fips`` for everything coarser than a county). A surrogate key plus a
unique index over COALESCE'd columns gives the same guarantee and works on every
server version, unlike ``UNIQUE NULLS NOT DISTINCT`` which needs Postgres 15+.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260731_0001"
down_revision: str | None = "20260730_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "directory_service_area",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("state", sa.String(length=2), nullable=True),
        sa.Column("county_fips", sa.String(length=5), nullable=True),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["county_fips"], ["geo_counties.fips"], name="fk_dsa_county_fips"
        ),
        sa.CheckConstraint(
            "entity_type IN ('lender', 'buyer')", name="ck_dsa_entity_type"
        ),
        # Makes the scope/state/county_fips invariant unrepresentable rather than
        # merely documented.
        sa.CheckConstraint(
            "(scope = 'nationwide' AND state IS NULL AND county_fips IS NULL) OR "
            "(scope = 'state' AND state IS NOT NULL AND county_fips IS NULL) OR "
            "(scope = 'county' AND state IS NOT NULL AND county_fips IS NOT NULL)",
            name="ck_dsa_scope_shape",
        ),
    )

    op.execute(
        "CREATE UNIQUE INDEX uq_dsa_entity_area ON directory_service_area "
        "(entity_type, entity_id, scope, COALESCE(state, ''), COALESCE(county_fips, ''))"
    )
    op.create_index("ix_dsa_state", "directory_service_area", ["state", "entity_type"])
    op.create_index(
        "ix_dsa_county", "directory_service_area", ["county_fips", "entity_type"]
    )
    # Refreshing one derivation pass without touching the others.
    op.create_index(
        "ix_dsa_entity_source", "directory_service_area", ["entity_type", "source"]
    )


def downgrade() -> None:
    op.drop_index("ix_dsa_entity_source", table_name="directory_service_area")
    op.drop_index("ix_dsa_county", table_name="directory_service_area")
    op.drop_index("ix_dsa_state", table_name="directory_service_area")
    op.execute("DROP INDEX IF EXISTS uq_dsa_entity_area")
    op.drop_table("directory_service_area")
