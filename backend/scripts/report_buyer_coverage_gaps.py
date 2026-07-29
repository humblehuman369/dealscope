"""Report which cash_buyers.coverage[] strings cannot be resolved to a county.

Run from the backend/ directory:

    cd backend && python -m scripts.report_buyer_coverage_gaps

Writes docs/geo/coverage-unmatched.csv. Reads the buyer dataset file rather than
the table so it can be run without a seeded cash_buyers table, and matches
against geo_counties, which must be seeded.

This exists because the buyer half of the service-area backfill cannot be built
honestly yet: roughly a third of coverage entries are city names with no city ->
county reference to resolve them. The report is the evidence for that, and the
worklist for closing it.
"""

from __future__ import annotations

import asyncio
import collections
import csv
import json
import logging
import re
from pathlib import Path

from app.db.session import close_db, get_session_factory
from app.models.geo_county import GeoCounty
from sqlalchemy import select

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("report_buyer_coverage_gaps")

BUYERS_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "buyers.json"
REPORT_PATH = (
    Path(__file__).resolve().parents[2] / "docs" / "geo" / "coverage-unmatched.csv"
)

# Ordered longest-first so " census area" is stripped before " area".
SUFFIXES = (
    " city and borough",
    " census area",
    " municipality",
    " counties",
    " county",
    " parish",
    " borough",
    " metro",
    " area",
    " co.",
    " cty",
    " co",
)

# "All of CA", "58 CA Counties", "Statewide"
STATE_SCOPE = re.compile(
    r"^(all of|entire|statewide|state of|all)\b|^\d+\s+[a-z]{2}\s+counties$",
    re.IGNORECASE,
)


def normalize(raw: str) -> str:
    text = re.sub(r"\s+", " ", raw.strip().lower().replace("&", "and"))
    changed = True
    while changed:
        changed = False
        for suffix in SUFFIXES:
            if text.endswith(suffix) and len(text) > len(suffix) + 1:
                text = text[: -len(suffix)].strip()
                changed = True
    return re.sub(r"^(st|saint)\.?\s+", "st. ", text).strip(" ,.")


async def main() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Retired counties are included on purpose: Connecticut replaced its
        # counties with planning regions in 2022, but buyers still describe their
        # coverage as "Hartford" or "New Haven". Excluding them drops CT to zero.
        counties = (
            await session.execute(select(GeoCounty.fips, GeoCounty.short_name, GeoCounty.state))
        ).all()

    index: dict[tuple[str, str], list[str]] = collections.defaultdict(list)
    for fips, short_name, state in counties:
        index[(state, short_name.lower())].append(fips)

    buyers = json.loads(BUYERS_PATH.read_text(encoding="utf-8"))

    stats: collections.Counter = collections.Counter()
    gaps: collections.Counter = collections.Counter()
    reasons: dict[str, str] = {}

    for buyer in buyers:
        state = (buyer.get("state") or "").strip().upper()[:2]
        for raw in buyer.get("coverage") or []:
            stats["total"] += 1
            if STATE_SCOPE.match(raw.strip()):
                stats["state_scope"] += 1
                continue
            if not state:
                stats["no_buyer_state"] += 1
                gaps[f"{'??'}|{raw}"] += 1
                reasons[f"{'??'}|{raw}"] = "buyer has no state, cannot scope the lookup"
                continue
            matches = index.get((state, normalize(raw)), [])
            if len(matches) == 1:
                stats["matched"] += 1
            elif len(matches) > 1:
                stats["ambiguous"] += 1
                gaps[f"{state}|{raw}"] += 1
                reasons[f"{state}|{raw}"] = (
                    f"ambiguous — matches {len(matches)} counties: {','.join(sorted(matches))}"
                )
            else:
                stats["unmatched"] += 1
                gaps[f"{state}|{raw}"] += 1
                reasons[f"{state}|{raw}"] = "no county of this name in the state"

    total = stats["total"]
    resolvable = stats["state_scope"] + stats["matched"]
    logger.info("coverage strings      : %s", total)
    for key, label in [
        ("matched", "resolved to a county"),
        ("state_scope", "state-wide markers"),
        ("ambiguous", "ambiguous"),
        ("unmatched", "unmatched"),
        ("no_buyer_state", "buyer has no state"),
    ]:
        logger.info("  %-22s: %5s  (%.1f%%)", label, stats[key], 100 * stats[key] / total)
    logger.info("RESOLVABLE NOW        : %s/%s (%.1f%%)", resolvable, total, 100 * resolvable / total)

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
