"""Add geo_counties canonical county reference table

Revision ID: 20260729_0001
Revises: 20260707_0001
Create Date: 2026-07-29 00:00:00.000000

Canonical US county reference data (3,230 rows: 3,222 current county-equivalents
across the 50 states, DC and PR, plus Connecticut's 8 pre-2022 counties retained
so the 2020-vintage ZIP crosswalk still joins) keyed by Census FIPS GEOID.

Seeded from app/data/geo/counties.json via backend/scripts/seed_geo_counties.py —
the migration creates the shape only, so refreshing the data never requires a new
revision.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0001"
down_revision: str | None = "20260707_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "geo_counties",
        sa.Column("fips", sa.String(length=5), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("short_name", sa.Text(), nullable=False),
        sa.Column("state", sa.String(length=2), nullable=False),
        sa.Column(
            "is_current",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("lat", sa.Numeric(9, 6), nullable=True),
        sa.Column("lng", sa.Numeric(9, 6), nullable=True),
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
    op.create_index("ix_geo_counties_state", "geo_counties", ["state"])
    # Lookups arrive as user- or scraper-supplied text of unknown casing, so the
    # indexes match how the columns are actually queried: by state plus a
    # case-folded name, or by name alone when the state is unknown.
    op.execute("CREATE INDEX ix_geo_counties_state_short_name_lower ON geo_counties (state, lower(short_name))")
    op.execute("CREATE INDEX ix_geo_counties_short_name_lower ON geo_counties (lower(short_name))")
    op.execute("CREATE INDEX ix_geo_counties_name_lower ON geo_counties (lower(name))")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_geo_counties_name_lower")
    op.execute("DROP INDEX IF EXISTS ix_geo_counties_short_name_lower")
    op.execute("DROP INDEX IF EXISTS ix_geo_counties_state_short_name_lower")
    op.drop_index("ix_geo_counties_state", table_name="geo_counties")
    op.drop_table("geo_counties")
