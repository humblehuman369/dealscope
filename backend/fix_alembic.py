"""
fix_alembic.py — Run pending database migrations before app startup.

Called by Railway's start command:
    python fix_alembic.py && uvicorn app.main:app ...

Handles three common scenarios:
  1. Clean database → runs all migrations from scratch
  2. Tables created by SQLAlchemy create_all but no Alembic tracking
     → stamps to head (tables already match the models)
  3. Partially migrated → runs only the pending migrations

Always exits 0 so the app can start even if migrations have issues
(main.py's create_all serves as a fallback for table creation).
"""

import logging
import os
import subprocess
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)-5s  %(message)s")
log = logging.getLogger("fix_alembic")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def _run(args: list[str]) -> subprocess.CompletedProcess:
    """Run a command and return the result."""
    return subprocess.run(
        [sys.executable, "-m"] + args,
        capture_output=True,
        text=True,
        cwd=SCRIPT_DIR,
    )


def main() -> None:
    log.info("Running database migrations ...")

    # --- Attempt: alembic upgrade head ---
    result = _run(["alembic", "upgrade", "head"])

    if result.returncode == 0:
        log.info("Migrations applied successfully.")
        for line in result.stdout.strip().splitlines():
            log.info("  %s", line)
        return

    err = result.stderr + result.stdout
    log.warning("Migration attempt failed:\n%s", err.strip())

    # --- Fallback: tables may already exist (created by create_all) ---
    table_exists = any(
        phrase in err.lower()
        for phrase in ("already exists", "duplicate table", "relation", "duplicate key")
    )
    if table_exists:
        log.info("Tables appear to already exist. Stamping Alembic version to head ...")
        stamp = _run(["alembic", "stamp", "head"])
        if stamp.returncode == 0:
            log.info("Stamped to head. Schema is considered current.")
            return
        log.error("Stamp failed:\n%s", stamp.stderr.strip())

    # --- Non-fatal: let the app start and rely on create_all as fallback ---
    log.warning(
        "Could not fully apply migrations. "
        "The app will attempt to start; create_all may handle missing tables."
    )


if __name__ == "__main__":
    main()
