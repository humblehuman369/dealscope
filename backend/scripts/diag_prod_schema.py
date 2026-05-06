"""
diag_prod_schema.py
====================
Diagnose (and optionally repair) Alembic schema drift on production.

Designed to be run *inside* the Railway dealscope container, where
DATABASE_URL with the internal hostname is reachable. From there it uses
the same `psycopg` driver the app uses, so credentials never have to leave
the container or get pasted into a local terminal.

Usage
-----
Open a shell inside the running container:

    railway ssh --service dealscope

Then from inside:

    cd /app/backend
    python scripts/diag_prod_schema.py            # diagnose only (read-only)
    python scripts/diag_prod_schema.py --apply    # also recover if drift detected

Recovery strategy
-----------------
If `alembic_version` says we're at head but the columns the model declares
don't actually exist, we have schema drift caused by the historical
`alembic stamp head` silent-failure pattern (now fixed in fix_alembic.py).
Recovery: stamp Alembic at the *real* prior head, then `alembic upgrade head`
to actually apply the missed migration.
"""

from __future__ import annotations

import os
import subprocess
import sys
from contextlib import contextmanager

import psycopg

# Migration that should be at head when this script ships.
EXPECTED_HEAD = "20260505_0005"

# The previous head — the one that *was* genuinely applied if the silent
# stamp-head bug fired during the deploy of EXPECTED_HEAD.
PREVIOUS_HEAD = "20260219_0004"

# Columns and tables that EXPECTED_HEAD adds. We probe these to confirm
# whether the migration actually ran.
EXPECTED_COLUMNS = [
    ("saved_properties", "flip_stage"),
    ("saved_properties", "flip_stage_entered_at"),
    ("saved_properties", "acquired_at"),
    ("saved_properties", "rehab_started_at"),
    ("saved_properties", "listed_at"),
    ("saved_properties", "sold_at"),
    ("saved_properties", "sold_price"),
]
EXPECTED_TABLES = ["rehab_budgets", "budget_lines", "budget_expenses"]


def _conn_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        sys.exit("ERROR: DATABASE_URL not set. Are you running this inside the Railway container?")
    return url


@contextmanager
def _connect():
    url = _conn_url()
    # psycopg handles postgres:// natively. railway.internal doesn't need SSL.
    if "railway.internal" in url and "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=disable"
    with psycopg.connect(url, autocommit=True, connect_timeout=10) as conn:
        yield conn


def _alembic_version(conn: psycopg.Connection) -> str | None:
    with conn.cursor() as cur:
        try:
            cur.execute("SELECT version_num FROM alembic_version")
            row = cur.fetchone()
            return row[0] if row else None
        except psycopg.errors.UndefinedTable:
            return None


def _column_exists(conn: psycopg.Connection, table: str, column: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM information_schema.columns WHERE table_name=%s AND column_name=%s",
            (table, column),
        )
        return cur.fetchone() is not None


def _table_exists(conn: psycopg.Connection, table: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name=%s",
            (table,),
        )
        return cur.fetchone() is not None


def _diagnose() -> dict:
    """Read-only inspection. Returns a dict ready to print as a report."""
    with _connect() as conn:
        version = _alembic_version(conn)
        missing_cols = [
            (t, c) for (t, c) in EXPECTED_COLUMNS if not _column_exists(conn, t, c)
        ]
        missing_tables = [t for t in EXPECTED_TABLES if not _table_exists(conn, t)]

    if version == EXPECTED_HEAD and not missing_cols and not missing_tables:
        verdict = "OK"
        recommendation = "Schema matches model — no action needed."
    elif version == EXPECTED_HEAD and (missing_cols or missing_tables):
        verdict = "DRIFT"
        recommendation = (
            f"Alembic says head ({EXPECTED_HEAD}) but the schema is missing the columns/tables "
            f"that revision adds. Run with --apply to stamp back to {PREVIOUS_HEAD} and re-run "
            f"`alembic upgrade head`."
        )
    elif version == PREVIOUS_HEAD:
        verdict = "BEHIND"
        recommendation = (
            f"Alembic is at {PREVIOUS_HEAD}. The {EXPECTED_HEAD} migration genuinely never ran. "
            f"Run with --apply to execute `alembic upgrade head`."
        )
    elif version is None:
        verdict = "NO_ALEMBIC_TABLE"
        recommendation = "alembic_version table doesn't exist. This is a fresh DB — manual setup needed."
    else:
        verdict = "UNEXPECTED"
        recommendation = (
            f"Alembic is at {version}, which is neither the expected head ({EXPECTED_HEAD}) "
            f"nor the previous head ({PREVIOUS_HEAD}). Investigate before taking any action."
        )

    return {
        "alembic_version": version,
        "missing_columns": missing_cols,
        "missing_tables": missing_tables,
        "verdict": verdict,
        "recommendation": recommendation,
    }


def _print_report(report: dict) -> None:
    print("=" * 60)
    print("DEALGAPIQ — PROD SCHEMA DIAGNOSIS")
    print("=" * 60)
    print(f"Expected head:      {EXPECTED_HEAD}")
    print(f"Previous head:      {PREVIOUS_HEAD}")
    print(f"Alembic reports:    {report['alembic_version']}")
    print()
    if report["missing_columns"]:
        print("MISSING COLUMNS:")
        for table, col in report["missing_columns"]:
            print(f"  - {table}.{col}")
    else:
        print("MISSING COLUMNS:    none ✓")
    if report["missing_tables"]:
        print("MISSING TABLES:")
        for table in report["missing_tables"]:
            print(f"  - {table}")
    else:
        print("MISSING TABLES:     none ✓")
    print()
    print(f"VERDICT:            {report['verdict']}")
    print(f"RECOMMENDATION:     {report['recommendation']}")
    print("=" * 60)


def _alembic(args: list[str]) -> int:
    """Run an alembic subcommand and stream its output."""
    print(f"\n$ alembic {' '.join(args)}")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    )
    return result.returncode


def _apply_recovery(verdict: str) -> int:
    if verdict == "OK":
        print("\nNothing to do — schema is consistent.")
        return 0
    if verdict == "DRIFT":
        print("\nApplying drift recovery: stamp PREVIOUS_HEAD then upgrade head ...")
        rc = _alembic(["stamp", PREVIOUS_HEAD])
        if rc != 0:
            print(f"!!! `alembic stamp {PREVIOUS_HEAD}` failed with exit {rc}. Aborting.")
            return rc
        rc = _alembic(["upgrade", "head"])
        if rc != 0:
            print(f"!!! `alembic upgrade head` failed with exit {rc}.")
            return rc
        return 0
    if verdict == "BEHIND":
        print("\nApplying upgrade: alembic upgrade head ...")
        rc = _alembic(["upgrade", "head"])
        if rc != 0:
            print(f"!!! `alembic upgrade head` failed with exit {rc}.")
            return rc
        return 0
    print(f"\nUnsupported verdict for --apply: {verdict}. Investigate manually.")
    return 2


def main() -> int:
    apply = "--apply" in sys.argv

    print("Running diagnosis ...\n")
    before = _diagnose()
    _print_report(before)

    if not apply:
        print("\nThis was a read-only diagnosis. Re-run with --apply to perform recovery.")
        return 0

    rc = _apply_recovery(before["verdict"])
    if rc != 0:
        return rc

    print("\nRe-checking schema after recovery ...\n")
    after = _diagnose()
    _print_report(after)
    if after["verdict"] != "OK":
        print("\n!!! Recovery did not fully reconcile the schema. Investigate the verdict above.")
        return 1
    print("\nRecovery complete — schema matches model.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
