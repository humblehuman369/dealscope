"""Seed or refresh the cash_buyers table from app/data/buyers.json.

Run from the backend/ directory so the app package resolves:

    cd backend && python -m scripts.seed_cash_buyers [--dry-run]

Until now this table was populated by hand, so a fresh database came up empty and
the directory silently fell back to reading buyers.json in-process. That fallback
cannot support Stage 3: ``directory_service_area`` rows point at
``cash_buyers.id``, so the rows have to actually exist.

Identity follows the same rules as ``seed_lenders``:

* ``phone`` is the natural key — it is the one field with a unique constraint and
  the one that survives a company renaming itself.
* New phones are inserted with the ``id`` from the dataset, because
  ``saved_directory_contacts.entity_id`` already stores those ids and no foreign
  key would catch a mismatch.
* Existing phones are updated **by phone, never by id**, leaving the stored id
  untouched, so a regenerated dataset cannot repoint saved contacts.
* A new phone claiming an id another buyer already holds aborts the run.

Buyers whose phone disappears from the source get ``passes_strict_filter=False``
rather than being deleted. That is the column the directory queries filter on, so
they drop out of listings while saved contacts still resolve to a real row.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from pathlib import Path
from typing import Any

from app.db.session import close_db, get_session_factory
from app.models.cash_buyer import CashBuyer
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("seed_cash_buyers")

DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "buyers.json"

# Keeps each INSERT under Postgres' 65,535 bind-parameter ceiling.
CHUNK_SIZE = 1_000

# dataset key -> column. `id` and `phone` carry identity semantics and are
# handled separately.
TEXT_FIELDS = {
    "company": "company_name",
    "owner": "owner_name",
    "email": "email",
    "street": "street",
    "city": "city",
    "state": "state",
    "zip": "zip",
    "website": "website",
    "description": "description",
    "response": "response_time",
    "accent": "accent",
    "initials": "initials",
    "buyerType": "buyer_type",
}
LIST_FIELDS = {"strategies": "strategies", "coverage": "coverage"}
INT_FIELDS = {"deals": "deals", "years": "years"}


def _text(value: object) -> str | None:
    """Blank strings become NULL.

    Both read paths (``row_to_buyer_record`` and ``_normalize_buyer``) coerce a
    missing value back to ``""``, so this is invisible to the API and keeps the
    table free of empty-string noise.
    """
    if not isinstance(value, str):
        return None
    return value.strip() or None


def load_buyers() -> list[dict[str, Any]]:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or not payload:
        raise SystemExit(f"No buyers found in {DATA_PATH}")

    phones = [(_text(row.get("phone")) or "") for row in payload]
    ids = [row.get("id") for row in payload]
    if not all(phones):
        raise SystemExit("Every buyer needs a phone — it is the natural key")
    if len(set(phones)) != len(phones):
        raise SystemExit("Duplicate phones in the dataset; the natural key must be unique")
    if not all(isinstance(value, int) for value in ids):
        raise SystemExit("Every buyer needs an integer id")
    if len(set(ids)) != len(ids):
        raise SystemExit("Duplicate ids in the dataset")

    logger.info("Loaded %s buyers from %s", len(payload), DATA_PATH.name)
    return payload


def row_values(row: dict[str, Any]) -> dict[str, Any]:
    values: dict[str, Any] = {
        column: _text(row.get(key)) for key, column in TEXT_FIELDS.items()
    }
    values["company_name"] = values["company_name"] or "Unknown"
    for key, column in LIST_FIELDS.items():
        raw = row.get(key)
        values[column] = (
            [item.strip() for item in raw if isinstance(item, str) and item.strip()]
            if isinstance(raw, list)
            else []
        )
    for key, column in INT_FIELDS.items():
        raw = row.get(key)
        values[column] = raw if isinstance(raw, int) and not isinstance(raw, bool) else None
    if values["state"]:
        values["state"] = values["state"].upper()[:2]
    if values["initials"]:
        values["initials"] = values["initials"][:2]
    return values


async def seed(dry_run: bool) -> None:
    buyers = load_buyers()

    session_factory = get_session_factory()
    async with session_factory() as session:
        existing = {
            phone: buyer_id
            for buyer_id, phone in (
                await session.execute(select(CashBuyer.id, CashBuyer.phone))
            ).all()
        }
        taken_ids = set(existing.values())

        incoming_phones = {_text(row["phone"]) for row in buyers}
        new_rows = [row for row in buyers if _text(row["phone"]) not in existing]
        update_rows = [row for row in buyers if _text(row["phone"]) in existing]

        collisions = [
            (_text(row["phone"]), row["id"]) for row in new_rows if row["id"] in taken_ids
        ]
        if collisions:
            raise SystemExit(
                "Dataset renumbered: these new buyers claim ids that already belong "
                f"to other rows — {collisions[:10]}. Reconcile by hand; seeding would "
                "repoint saved contacts at the wrong companies."
            )

        retired = sorted(set(existing) - incoming_phones)

        logger.info(
            "Existing rows: %s | incoming: %s | new: %s | updated: %s | retired: %s",
            len(existing),
            len(buyers),
            len(new_rows),
            len(update_rows),
            len(retired),
        )
        if retired:
            logger.warning(
                "%s buyer(s) absent from the source will be hidden from listings: %s",
                len(retired),
                retired[:10],
            )

        if dry_run:
            logger.info("Dry run — nothing written.")
            return

        for start in range(0, len(new_rows), CHUNK_SIZE):
            chunk = new_rows[start : start + CHUNK_SIZE]
            await session.execute(
                insert(CashBuyer).values(
                    [
                        {
                            "id": row["id"],
                            "phone": _text(row["phone"]),
                            **row_values(row),
                            "passes_strict_filter": True,
                            "created_at": func.now(),
                            "updated_at": func.now(),
                        }
                        for row in chunk
                    ]
                )
            )

        for row in update_rows:
            await session.execute(
                update(CashBuyer)
                .where(CashBuyer.phone == _text(row["phone"]))
                .values(**row_values(row), passes_strict_filter=True, updated_at=func.now())
            )

        if retired:
            await session.execute(
                update(CashBuyer)
                .where(CashBuyer.phone.in_(retired))
                .values(passes_strict_filter=False, updated_at=func.now())
            )

        await session.commit()

        total = (await session.execute(select(func.count()).select_from(CashBuyer))).scalar_one()
        listed = (
            await session.execute(
                select(func.count())
                .select_from(CashBuyer)
                .where(CashBuyer.passes_strict_filter.is_(True))
            )
        ).scalar_one()
        logger.info("Done. cash_buyers now holds %s rows (%s listed).", total, listed)


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
