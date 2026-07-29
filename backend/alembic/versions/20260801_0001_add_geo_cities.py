"""Add geo_cities — Census places and the counties they sit in

Revision ID: 20260801_0001
Revises: 20260731_0001
Create Date: 2026-08-01 00:00:00.000000

31,909 Census places across the 50 states, DC and PR, each carrying the county
FIPS it belongs to (an array: 1,302 places straddle a county line).

This is what makes buyer coverage resolvable. Roughly a third of
``cash_buyers.coverage[]`` entries are city names — San Antonio, Orlando,
Atlanta — and without a place table they could not be turned into county
coverage. Adding it lifts resolvable buyer coverage from 59.6% to 89.2%.

Seeded from app/data/geo/cities.json via backend/scripts/seed_geo_cities.py, so
refreshing the data never requires a new revision.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260801_0001"
down_revision: str | None = "20260731_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "geo_cities",
        sa.Column("geoid", sa.String(length=7), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("short_name", sa.Text(), nullable=False),
        sa.Column(
            "aliases",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        sa.Column("state", sa.String(length=2), nullable=False),
        sa.Column(
            "county_fips",
            postgresql.ARRAY(sa.String(length=5)),
            nullable=False,
            server_default=sa.text("'{}'::varchar[]"),
        ),
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

    op.create_index("ix_geo_cities_state", "geo_cities", ["state"])
    # Lookups arrive as user- or scraper-supplied text of unknown casing, and are
    # always scoped by state — "Springfield" alone is meaningless.
    op.execute(
        "CREATE INDEX ix_geo_cities_state_short_name_lower "
        "ON geo_cities (state, lower(short_name))"
    )
    op.create_index(
        "ix_geo_cities_aliases_gin", "geo_cities", ["aliases"], postgresql_using="gin"
    )
    op.create_index(
        "ix_geo_cities_counties_gin",
        "geo_cities",
        ["county_fips"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    op.drop_index("ix_geo_cities_counties_gin", table_name="geo_cities")
    op.drop_index("ix_geo_cities_aliases_gin", table_name="geo_cities")
    op.execute("DROP INDEX IF EXISTS ix_geo_cities_state_short_name_lower")
    op.drop_index("ix_geo_cities_state", table_name="geo_cities")
    op.drop_table("geo_cities")
