"""Seed or refresh the geo_counties table from app/data/geo/counties.json.

Run from the backend/ directory so the app package resolves:

    cd backend && python -m scripts.seed_geo_counties [--dry-run]

Idempotent: upserts on the FIPS primary key, so running it repeatedly is safe
and a Gazetteer refresh updates renamed counties in place. Rows whose FIPS has
disappeared from the source are reported but not deleted — county FIPS codes are
effectively permanent, so a disappearance means a bad source file far more often
than a real dissolution.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from pathlib import Path

from app.db.session import close_db, get_session_factory
from app.models.geo_county import GeoCounty
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("seed_geo_counties")

DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "geo" / "counties.json"


def load_counties() -> list[dict[str, object]]:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    counties = payload.get("counties")
    if not isinstance(counties, list) or not counties:
        raise SystemExit(f"No counties found in {DATA_PATH}")
    logger.info("Loaded %s counties from %s (%s)", len(counties), DATA_PATH.name, payload["source"])
    return counties


async def seed(dry_run: bool) -> None:
    counties = load_counties()

    session_factory = get_session_factory()
    async with session_factory() as session:
        existing = set((await session.execute(select(GeoCounty.fips))).scalars().all())
        incoming = {str(county["fips"]) for county in counties}

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

        statement = insert(GeoCounty).values(
            [
                {
                    "fips": county["fips"],
                    "name": county["name"],
                    "short_name": county["short_name"],
                    "state": county["state"],
                    "is_current": county["is_current"],
                    "lat": county["lat"],
                    "lng": county["lng"],
                    "created_at": func.now(),
                    "updated_at": func.now(),
                }
                for county in counties
            ]
        )
        await session.execute(
            statement.on_conflict_do_update(
                index_elements=[GeoCounty.fips],
                set_={
                    "name": statement.excluded.name,
                    "short_name": statement.excluded.short_name,
                    "state": statement.excluded.state,
                    "is_current": statement.excluded.is_current,
                    "lat": statement.excluded.lat,
                    "lng": statement.excluded.lng,
                    "updated_at": func.now(),
                },
            )
        )
        await session.commit()

        total = (await session.execute(select(func.count()).select_from(GeoCounty))).scalar_one()
        logger.info("Done. geo_counties now holds %s rows.", total)


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
