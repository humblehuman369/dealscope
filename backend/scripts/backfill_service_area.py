"""Derive directory_service_area rows from the directory tables.

Run from the backend/ directory so the app package resolves:

    cd backend && python -m scripts.backfill_service_area [--dry-run]

Idempotent per derivation pass: each pass deletes the rows carrying its own
``source`` tag and rebuilds them, so re-running never duplicates and one pass can
be re-derived without disturbing the other.

Two passes:

* ``lender_states_served`` — mechanical, from ``lenders.states_served``.
* ``buyer_coverage`` — resolves ``cash_buyers.coverage[]`` prose through
  ``app.services.geo_matching``. Unresolvable strings are skipped and counted;
  ``scripts/report_buyer_coverage_gaps.py`` lists them individually.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from collections import Counter
from datetime import UTC, datetime

from app.db.session import close_db, get_session_factory
from app.models.cash_buyer import CashBuyer
from app.models.directory_service_area import DirectoryServiceArea
from app.models.lender import Lender
from app.services.geo_matching import CoverageResolver
from sqlalchemy import delete, func, insert, select

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill_service_area")

SOURCE_LENDER_STATES = "lender_states_served"
SOURCE_BUYER_COVERAGE = "buyer_coverage"

# Keeps each INSERT under Postgres' 65,535 bind-parameter ceiling.
CHUNK_SIZE = 5_000


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


async def backfill_buyer_coverage(session, dry_run: bool) -> int:
    """Resolve ``cash_buyers.coverage[]`` prose into state and county rows.

    The buyer's own state is always emitted, mirroring the existing state filter
    (``cash_buyers.state = ?``) so that lookup stays equivalent. Coverage strings
    add county rows on top. Anything that does not resolve cleanly is skipped and
    counted — see ``scripts/report_buyer_coverage_gaps.py`` for the itemised list.
    """
    resolver = await CoverageResolver.from_db(session)
    buyers = (
        await session.execute(select(CashBuyer.id, CashBuyer.state, CashBuyer.coverage))
    ).all()

    now = datetime.now(UTC)
    seen: set[tuple[str, str | None, str | None]] = set()
    rows: list[dict[str, object]] = []
    outcomes: Counter = Counter()

    def add(entity_id: int, scope: str, state: str | None, county_fips: str | None) -> None:
        key = (f"{entity_id}:{scope}", state, county_fips)
        if key in seen:
            return
        seen.add(key)
        rows.append(
            {
                "entity_type": "buyer",
                "entity_id": entity_id,
                "scope": scope,
                "state": state,
                "county_fips": county_fips,
                "source": SOURCE_BUYER_COVERAGE,
                "created_at": now,
            }
        )

    for buyer_id, buyer_state, coverage in buyers:
        state = (buyer_state or "").strip().upper()[:2] or None
        if state:
            add(buyer_id, "state", state, None)

        for raw in coverage or []:
            resolution = resolver.resolve(raw, state)
            outcomes[resolution.kind] += 1
            if resolution.kind == "nationwide":
                add(buyer_id, "nationwide", None, None)
            elif resolution.kind == "state" and resolution.state:
                add(buyer_id, "state", resolution.state, None)
            elif resolution.kind == "county":
                for fips in resolution.county_fips:
                    add(buyer_id, "county", resolution.state, fips)

    resolved = outcomes["county"] + outcomes["state"] + outcomes["nationwide"]
    total = sum(outcomes.values())
    logger.info(
        "Buyers: %s | coverage strings %s | resolved %s (%.1f%%) | ambiguous %s | unmatched %s",
        len(buyers),
        total,
        resolved,
        (100 * resolved / total) if total else 0.0,
        outcomes["ambiguous"],
        outcomes["unmatched"],
    )
    logger.info("Buyer rows to write: %s", len(rows))

    if dry_run:
        return len(rows)

    await session.execute(
        delete(DirectoryServiceArea).where(
            DirectoryServiceArea.source == SOURCE_BUYER_COVERAGE
        )
    )
    for start in range(0, len(rows), CHUNK_SIZE):
        await session.execute(insert(DirectoryServiceArea), rows[start : start + CHUNK_SIZE])
    return len(rows)


async def run(dry_run: bool) -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        await backfill_lender_states(session, dry_run)
        await backfill_buyer_coverage(session, dry_run)

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
