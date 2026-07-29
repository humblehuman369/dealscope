"""Seed or refresh the geo_cities table from app/data/geo/cities.json.

Run from the backend/ directory so the app package resolves:

    cd backend && python -m scripts.seed_geo_cities [--dry-run]

Idempotent: upserts on the GEOID primary key, so a Census refresh updates renamed
or re-districted places in place. Rows whose GEOID has disappeared from the source
are reported but not deleted — a disappearance means a bad source file far more
often than a dissolved place.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from pathlib import Path

from app.db.session import close_db, get_session_factory
from app.models.geo_city import GeoCity
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("seed_geo_cities")

DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "geo" / "cities.json"

# One statement per chunk keeps the parameter count under Postgres' 65,535 limit;
# 31,909 rows x 8 columns would blow through it in a single insert.
CHUNK_SIZE = 4_000


def load_cities() -> list[dict[str, object]]:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    cities = payload.get("cities")
    if not isinstance(cities, list) or not cities:
        raise SystemExit(f"No cities found in {DATA_PATH}")
    logger.info("Loaded %s places from %s (%s)", len(cities), DATA_PATH.name, payload["source"])
    return cities


async def seed(dry_run: bool) -> None:
    cities = load_cities()

    session_factory = get_session_factory()
    async with session_factory() as session:
        existing = set((await session.execute(select(GeoCity.geoid))).scalars().all())
        incoming = {str(city["geoid"]) for city in cities}

        logger.info(
            "Existing rows: %s | incoming: %s | new: %s | updated: %s",
            len(existing),
            len(incoming),
            len(incoming - existing),
            len(incoming & existing),
        )
        orphaned = existing - incoming
        if orphaned:
            logger.warning(
                "%s row(s) in the table are absent from the source and were left untouched: %s",
                len(orphaned),
                sorted(orphaned)[:10],
            )

        if dry_run:
            logger.info("Dry run — nothing written.")
            return

        for start in range(0, len(cities), CHUNK_SIZE):
            chunk = cities[start : start + CHUNK_SIZE]
            statement = insert(GeoCity).values(
                [
                    {
                        "geoid": city["geoid"],
                        "name": city["name"],
                        "short_name": city["short_name"],
                        "aliases": city["aliases"],
                        "state": city["state"],
                        "county_fips": city["county_fips"],
                        "created_at": func.now(),
                        "updated_at": func.now(),
                    }
                    for city in chunk
                ]
            )
            await session.execute(
                statement.on_conflict_do_update(
                    index_elements=[GeoCity.geoid],
                    set_={
                        "name": statement.excluded.name,
                        "short_name": statement.excluded.short_name,
                        "aliases": statement.excluded.aliases,
                        "state": statement.excluded.state,
                        "county_fips": statement.excluded.county_fips,
                        "updated_at": func.now(),
                    },
                )
            )
        await session.commit()

        total = (await session.execute(select(func.count()).select_from(GeoCity))).scalar_one()
        logger.info("Done. geo_cities now holds %s rows.", total)


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing")
    args = parser.parse_args()
    try:
        await seed(args.dry_run)
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
