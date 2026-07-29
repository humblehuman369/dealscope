"""Report which cash_buyers.coverage[] strings cannot be resolved to a county.

Run from the backend/ directory:

    cd backend && python -m scripts.report_buyer_coverage_gaps

Writes docs/geo/coverage-unmatched.csv — the worklist for the coverage strings
the backfill has to skip. It resolves through the same
``app.services.geo_matching.CoverageResolver`` the backfill uses, so the two can
never disagree about what a string means: whatever shows up here is exactly what
did not become a ``directory_service_area`` row.

Reads the buyer dataset file rather than the table so it can run before
``seed_cash_buyers``. ``geo_counties`` and ``geo_cities`` must be seeded.
"""

from __future__ import annotations

import asyncio
import collections
import csv
import json
import logging
from pathlib import Path

from app.db.session import close_db, get_session_factory
from app.services.geo_matching import CoverageResolver

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("report_buyer_coverage_gaps")

BUYERS_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "buyers.json"
REPORT_PATH = (
    Path(__file__).resolve().parents[2] / "docs" / "geo" / "coverage-unmatched.csv"
)


async def main() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        resolver = await CoverageResolver.from_db(session)

    buyers = json.loads(BUYERS_PATH.read_text(encoding="utf-8"))

    stats: collections.Counter = collections.Counter()
    gaps: collections.Counter = collections.Counter()
    reasons: dict[str, str] = {}

    for buyer in buyers:
        state = (buyer.get("state") or "").strip().upper()[:2] or None
        for raw in buyer.get("coverage") or []:
            stats["total"] += 1
            resolution = resolver.resolve(raw, state)
            stats[resolution.kind] += 1
            if resolution.kind in {"ambiguous", "unmatched"}:
                key = f"{state or '??'}|{raw}"
                gaps[key] += 1
                reasons[key] = resolution.detail

    total = stats["total"]
    resolvable = stats["county"] + stats["state"] + stats["nationwide"]
    logger.info("coverage strings      : %s", total)
    for key, label in [
        ("county", "resolved to county/ies"),
        ("state", "state-wide markers"),
        ("nationwide", "nationwide markers"),
        ("ambiguous", "ambiguous"),
        ("unmatched", "unmatched"),
    ]:
        logger.info("  %-22s: %5s  (%.1f%%)", label, stats[key], 100 * stats[key] / total)
    logger.info(
        "RESOLVABLE            : %s/%s (%.1f%%)", resolvable, total, 100 * resolvable / total
    )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with REPORT_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["state", "coverage_string", "occurrences", "reason"])
        for key, count in gaps.most_common():
            state, raw = key.split("|", 1)
            writer.writerow([state, raw, count, reasons[key]])

    logger.info("Wrote %s distinct unresolved strings to %s", len(gaps), REPORT_PATH)
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
