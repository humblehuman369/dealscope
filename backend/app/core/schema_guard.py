"""
Schema-mismatch safeguards for read endpoints.

Background — incident May 2026
------------------------------
Code shipped to production several minutes before the corresponding Alembic
migration applied. SQLAlchemy queries against newly-mapped columns blew up
with `column "saved_properties.flip_stage" does not exist`, every saved-
properties endpoint returned 500, and the dashboard rendered "0 saved
properties" along with an error banner on the Pipeline page.

This module narrows that blast radius. Read endpoints that we expect to
"survive" a schema gap can wrap their service call with `is_schema_mismatch`
and return a safe empty payload, so the UI degrades gracefully instead of
hard-erroring during the brief window between a code deploy and the schema
catching up.

Design rules
------------
1. Only use this on idempotent **read** endpoints. Write paths must always
   propagate the error so we don't silently lose user actions.
2. The helper must NEVER suppress non-schema errors. We narrow on Postgres
   SQLSTATE codes for `undefined_column` (42703) and `undefined_table`
   (42P01) and re-raise everything else.
3. Every suppressed error is logged at ERROR with enough context for
   alerting to fire — this is a degraded mode, not a silent success.
"""

from __future__ import annotations

import logging

from sqlalchemy.exc import ProgrammingError

logger = logging.getLogger(__name__)

# Postgres SQLSTATE codes that mean "the schema you're querying doesn't
# match what the running code expects."
#   42703 — undefined_column   (e.g. SELECT new_col FROM old_table)
#   42P01 — undefined_table    (e.g. SELECT * FROM new_table)
_SCHEMA_MISMATCH_SQLSTATES = frozenset({"42703", "42P01"})


def is_schema_mismatch(exc: BaseException) -> bool:
    """Return True iff *exc* is a Postgres "schema is behind the code" error.

    Returns False for every other ProgrammingError (syntax errors, type
    errors, etc.) so callers don't accidentally hide real bugs.
    """
    if not isinstance(exc, ProgrammingError):
        return False

    orig = getattr(exc, "orig", None)
    # psycopg3 exposes `sqlstate`; psycopg2 used `pgcode`. Support both.
    pgcode = getattr(orig, "sqlstate", None) or getattr(orig, "pgcode", None)
    return pgcode in _SCHEMA_MISMATCH_SQLSTATES


def log_schema_mismatch(endpoint: str, exc: BaseException) -> None:
    """Emit a loud, structured log line so monitoring can alert on this.

    Format is intentionally easy to grep:
        SCHEMA_MISMATCH endpoint=... pgcode=... message=...
    """
    orig = getattr(exc, "orig", None)
    pgcode = getattr(orig, "sqlstate", None) or getattr(orig, "pgcode", None)
    logger.error(
        "SCHEMA_MISMATCH endpoint=%s pgcode=%s — DB schema is behind the "
        "deployed code; serving empty fallback to keep the UI alive. "
        "Apply pending migrations (`alembic upgrade head`) immediately. "
        "Original error: %s",
        endpoint,
        pgcode,
        exc,
    )
