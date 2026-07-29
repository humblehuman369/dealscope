"""Seed or refresh the lenders table from app/data/lenders.json.

Run from the backend/ directory so the app package resolves:

    cd backend && python -m scripts.seed_lenders [--dry-run]

Idempotent, and deliberately asymmetric about identity:

* New domains are inserted with the ``id`` from the dataset. That id is what
  ``saved_directory_contacts.entity_id`` stores, and there is no foreign key to
  catch a mismatch, so the first load must preserve it exactly.
* Existing domains are updated **by domain, never by id**, and their stored id is
  left alone. A regenerated dataset reshuffles ids (they are positional), so
  trusting the incoming id on refresh would repoint saved contacts at other
  companies.
* If a new domain arrives carrying an id that another domain already owns, the
  script aborts rather than guessing. That means the dataset was renumbered and a
  human needs to decide how to reconcile it.

Rows whose domain has disappeared from the source are reported and marked
inactive rather than deleted, so saved contacts keep resolving.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from pathlib import Path
from typing import Any

from app.db.session import close_db, get_session_factory
from app.models.lender import Lender
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("seed_lenders")

DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "lenders.json"

# Columns copied straight across from the dataset. `id` and `domain` are handled
# separately because they carry identity semantics, and `states_served_count` is
# dropped — it is cardinality(states_served) and storing it invites drift.
FIELDS = (
    "company_name",
    "website",
    "phone",
    "email",
    "contact_type",
    "city",
    "state",
    "nationwide",
    "states_served",
    "loan_products",
    "description",
    "min_loan_amount",
    "max_loan_amount",
    "max_ltv",
    "max_arv",
    "min_interest_rate",
    "max_interest_rate",
    "min_points",
    "max_points",
    "min_term_months",
    "max_term_months",
    "interest_only",
    "display",
    "nmls_id",
    "aapl_member",
    "year_founded",
    "credit_check_policy",
    "min_credit_score",
    "no_credit_check",
    "source",
)


def load_lenders() -> list[dict[str, Any]]:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    lenders = payload.get("lenders")
    if not isinstance(lenders, list) or not lenders:
        raise SystemExit(f"No lenders found in {DATA_PATH}")

    domains = [row.get("domain") for row in lenders]
    ids = [row.get("id") for row in lenders]
    if not all(domains):
        raise SystemExit("Every lender needs a domain — it is the natural key")
    if len(set(domains)) != len(domains):
        raise SystemExit("Duplicate domains in the dataset; the natural key must be unique")
    if len(set(ids)) != len(ids):
        raise SystemExit("Duplicate ids in the dataset")

    logger.info(
        "Loaded %s lenders from %s (generated %s)",
        len(lenders),
        DATA_PATH.name,
        payload.get("generated_at", "unknown"),
    )
    return lenders


def row_values(row: dict[str, Any]) -> dict[str, Any]:
    return {field: row.get(field) for field in FIELDS}


async def seed(dry_run: bool) -> None:
    lenders = load_lenders()

    session_factory = get_session_factory()
    async with session_factory() as session:
        existing = {
            domain: lender_id
            for lender_id, domain in (
                await session.execute(select(Lender.id, Lender.domain))
            ).all()
        }
        taken_ids = set(existing.values())

        incoming_domains = {row["domain"] for row in lenders}
        new_rows = [row for row in lenders if row["domain"] not in existing]
        update_rows = [row for row in lenders if row["domain"] in existing]

        # A new domain may not claim an id another domain already holds.
        collisions = [
            (row["domain"], row["id"]) for row in new_rows if row["id"] in taken_ids
        ]
        if collisions:
            raise SystemExit(
                "Dataset renumbered: these new domains claim ids that already belong "
                f"to other lenders — {collisions[:10]}. Reconcile by hand; seeding "
                "would repoint saved contacts at the wrong companies."
            )

        retired = sorted(set(existing) - incoming_domains)

        logger.info(
            "Existing rows: %s | incoming: %s | new: %s | updated: %s | retired: %s",
            len(existing),
            len(lenders),
            len(new_rows),
            len(update_rows),
            len(retired),
        )
        if retired:
            logger.warning(
                "%s domain(s) absent from the source will be marked inactive: %s",
                len(retired),
                retired[:10],
            )

        if dry_run:
            logger.info("Dry run — nothing written.")
            return

        if new_rows:
            statement = insert(Lender).values(
                [
                    {
                        "id": row["id"],
                        "domain": row["domain"],
                        **row_values(row),
                        "is_active": True,
                        "created_at": func.now(),
                        "updated_at": func.now(),
                    }
                    for row in new_rows
                ]
            )
            await session.execute(statement)

        for row in update_rows:
            await session.execute(
                update(Lender)
                .where(Lender.domain == row["domain"])
                .values(**row_values(row), is_active=True, updated_at=func.now())
            )

        if retired:
            await session.execute(
                update(Lender)
                .where(Lender.domain.in_(retired))
                .values(is_active=False, updated_at=func.now())
            )

        await session.commit()

        total = (await session.execute(select(func.count()).select_from(Lender))).scalar_one()
        active = (
            await session.execute(
                select(func.count()).select_from(Lender).where(Lender.is_active.is_(True))
            )
        ).scalar_one()
        logger.info("Done. lenders now holds %s rows (%s active).", total, active)


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
