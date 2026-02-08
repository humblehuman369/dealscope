"""
fix_alembic.py — Run pending database migrations before app startup.

Called by Railway's start command:
    python fix_alembic.py && uvicorn app.main:app ...

Handles common migration edge cases:
  1. Clean database → runs all migrations from scratch.
  2. Partially migrated → runs only pending migrations.
  3. Stamped-but-not-applied → detects schema gaps, resets Alembic
     version to the correct point, then re-applies.

Always exits 0 so the app can start even if migrations have issues
(main.py's create_all serves as a fallback for new-table creation).
"""

import logging
import os
import subprocess
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)-5s  %(message)s")
log = logging.getLogger("fix_alembic")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# The revision just before the auth-system rebuild migration.
# If the auth columns are missing we need to re-run from here.
PRE_AUTH_REVISION = "20260204_0001"


def _run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m"] + args,
        capture_output=True,
        text=True,
        cwd=SCRIPT_DIR,
    )


def _check_auth_columns_exist() -> bool:
    """Return True if the auth-rebuild migration has actually been applied."""
    try:
        import asyncio

        async def _check():
            from app.core.config import settings
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text

            db_url = settings.async_database_url
            # Add sslmode for Railway public endpoints
            if "railway" in db_url and "sslmode=" not in db_url:
                sep = "&" if "?" in db_url else "?"
                db_url = f"{db_url}{sep}sslmode=require"

            engine = create_async_engine(db_url)
            try:
                async with engine.connect() as conn:
                    result = await conn.execute(text(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_name = 'users' AND column_name = 'failed_login_attempts'"
                    ))
                    return result.fetchone() is not None
            finally:
                await engine.dispose()

        return asyncio.run(_check())
    except Exception as e:
        log.warning("Could not verify schema: %s", e)
        return True  # Assume OK to avoid destructive action


def main() -> None:
    log.info("Running database migrations ...")

    # --- Step 1: Try a normal upgrade ---
    result = _run(["alembic", "upgrade", "head"])

    if result.returncode == 0:
        log.info("Migrations applied successfully.")
        for line in result.stdout.strip().splitlines():
            log.info("  %s", line)

        # --- Step 2: Verify the auth columns actually exist ---
        if not _check_auth_columns_exist():
            log.warning(
                "Alembic reports head but auth columns are missing. "
                "Resetting to %s and re-applying ...",
                PRE_AUTH_REVISION,
            )
            stamp = _run(["alembic", "stamp", PRE_AUTH_REVISION])
            if stamp.returncode != 0:
                log.error("Stamp failed: %s", stamp.stderr.strip())
            else:
                retry = _run(["alembic", "upgrade", "head"])
                if retry.returncode == 0:
                    log.info("Re-applied migrations successfully.")
                    return
                log.error("Re-apply failed: %s", (retry.stderr + retry.stdout).strip())
        else:
            log.info("Schema verification passed.")
            return

    err = result.stderr + result.stdout
    log.warning("Migration attempt failed:\n%s", err.strip())

    # --- Step 3: Handle "already exists" errors from fresh create_all state ---
    table_exists = any(
        phrase in err.lower()
        for phrase in ("already exists", "duplicate table", "duplicate key")
    )
    if table_exists:
        log.info("Tables already exist. Checking if auth columns need to be added ...")
        if not _check_auth_columns_exist():
            # Tables exist from create_all, but auth migration hasn't run.
            # Stamp to just before the auth migration, then upgrade.
            log.info("Stamping to %s and upgrading ...", PRE_AUTH_REVISION)
            _run(["alembic", "stamp", PRE_AUTH_REVISION])
            retry = _run(["alembic", "upgrade", "head"])
            if retry.returncode == 0:
                log.info("Auth migration applied successfully.")
                return
            log.error("Auth migration failed: %s", (retry.stderr + retry.stdout).strip())
        else:
            # Tables and columns all exist — just stamp to head
            _run(["alembic", "stamp", "head"])
            log.info("Stamped to head. Schema is current.")
            return

    log.warning(
        "Could not fully resolve migrations. "
        "The app will attempt to start; create_all may handle missing tables."
    )


if __name__ == "__main__":
    main()
