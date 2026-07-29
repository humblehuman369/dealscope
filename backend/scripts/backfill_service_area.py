"""Derive directory_service_area rows from the directory tables.

Run from the backend/ directory so the app package resolves:

    cd backend && python -m scripts.backfill_service_area [--dry-run]

Idempotent per derivation pass: each pass deletes the rows carrying its own
``source`` tag and rebuilds them, so re-running never duplicates and a later pass
(city-derived buyer coverage) can be added without disturbing what is here.

Currently implements the lender half only. Buyer coverage is deliberately absent:
36% of ``cash_buyers.coverage[]`` entries are city names ("San Antonio",
"Orlando", "Atlanta") with no city -> county reference table to resolve them, and
guessing is worse than not matching. See the restructure plan, Stage 3.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from datetime import UTC, datetime

from app.db.session import close_db, get_session_factory
from app.models.directory_service_area import DirectoryServiceArea
from app.models.lender import Lender
from sqlalchemy import delete, func, insert, select

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill_service_area")

SOURCE_LENDER_STATES = "lender_states_served"


async def backfill_lender_states(session, dry_run: bool) -> int:
    """One state row per entry in ``states_served``, plus a nationwide marker.

    Nationwide lenders get explicit state rows too, rather than only the marker.
    All 79 of them already enumerate 51 states, so writing the rows out keeps a
    state lookup exactly equivalent to the previous ``states_served`` filter
    instead of depending on a nationwide special case at query time.
    """
    lenders = (
        await session.execute(
            select(Lender.id, Lender.states_served, Lender.nationwide).where(
                Lender.is_active.is_(True)
            )
        )
    ).all()

    now = datetime.now(UTC)
    rows: list[dict[str, object]] = []
    nationwide_count = 0
    for lender_id, states_served, nationwide in lenders:
        if nationwide:
            nationwide_count += 1
            rows.append(
                {
                    "entity_type": "lender",
                    "entity_id": lender_id,
                    "scope": "nationwide",
                    "state": None,
                    "county_fips": None,
                    "source": SOURCE_LENDER_STATES,
                    "created_at": now,
                }
            )
        for state in sorted(set(states_served or [])):
            rows.append(
                {
                    "entity_type": "lender",
                    "entity_id": lender_id,
                    "scope": "state",
                    "state": state,
                    "county_fips": None,
                    "source": SOURCE_LENDER_STATES,
                    "created_at": now,
                }
            )

    logger.info(
        "Lenders: %s active | %s nationwide | %s rows to write (%s state, %s nationwide)",
        len(lenders),
        nationwide_count,
        len(rows),
        len(rows) - nationwide_count,
        nationwide_count,
    )
    if dry_run:
        return len(rows)

    await session.execute(
        delete(DirectoryServiceArea).where(
            DirectoryServiceArea.source == SOURCE_LENDER_STATES
        )
    )
    if rows:
        await session.execute(insert(DirectoryServiceArea), rows)
    return len(rows)


async def run(dry_run: bool) -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        await backfill_lender_states(session, dry_run)

        if dry_run:
            logger.info("Dry run — nothing written.")
            return

        await session.commit()

        by_scope = (
            await session.execute(
                select(
                    DirectoryServiceArea.entity_type,
                    DirectoryServiceArea.scope,
                    func.count(),
                ).group_by(DirectoryServiceArea.entity_type, DirectoryServiceArea.scope)
            )
        ).all()
        logger.info("Done. directory_service_area now holds:")
        for entity_type, scope, count in sorted(by_scope):
            logger.info("  %-7s %-11s %s", entity_type, scope, count)


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing")
    args = parser.parse_args()
    try:
        await run(args.dry_run)
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
