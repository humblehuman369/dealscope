"""Import a LinkedIn batch YAML into Postgres.

    cd backend && python -m scripts.import_linkedin_batch \\
        ../docs/marketing/linkedin/batches/batch-01.yaml

Validates body length, media fields, UTMs, reshare keys, hashtag taxonomy,
and that every referenced asset exists. Upserts by key. Never touches
published rows. Imported rows land as ``draft``.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from app.db.session import close_db, get_session_factory
from app.services.linkedin_batch import BatchValidationError, import_batch, parse_batch_file


def _print_table(changes) -> None:
    if not changes:
        print("No posts in batch.")
        return
    width = max(len(c.key) for c in changes)
    print(f"{'key'.ljust(width)}  action              status")
    print(f"{'-' * width}  -------------------  --------")
    for change in changes:
        print(f"{change.key.ljust(width)}  {change.action.ljust(19)}  {change.status}")


async def _run(path: Path) -> int:
    try:
        parsed = parse_batch_file(path)
    except BatchValidationError as exc:
        print("Import rejected:\n", file=sys.stderr)
        for error in exc.errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    except FileNotFoundError:
        print(f"File not found: {path}", file=sys.stderr)
        return 1

    factory = get_session_factory()
    async with factory() as db:
        changes = await import_batch(db, parsed)
    await close_db()
    _print_table(changes)
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("yaml_path", type=Path, help="Path to a batch YAML file")
    args = parser.parse_args()
    path = args.yaml_path.expanduser().resolve()
    raise SystemExit(asyncio.run(_run(path)))


if __name__ == "__main__":
    main()
