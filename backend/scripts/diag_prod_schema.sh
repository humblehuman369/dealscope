#!/usr/bin/env bash
# diag_prod_schema.sh
# ----------------------------------------------------------------------
# Read-only diagnosis of prod alembic_version vs the actual saved_properties
# schema. Detects the "silent stamp head" drift class of bug.
#
# Usage:
#   railway run --service Postgres -- bash backend/scripts/diag_prod_schema.sh
#
# Note: --service Postgres (NOT dealscope) — the Postgres service exposes
# DATABASE_PUBLIC_URL with the right TCP proxy host:port for external
# connections. The dealscope service only has DATABASE_URL pointing at
# Railway's internal hostname which isn't reachable from your laptop.
#
# Prints:
#   alembic_version       — what Alembic *thinks* the DB is at
#   flip_stage_exists     — whether the column actually exists
#   rehab_budgets_exists  — whether the new table actually exists
#
# Security: never echoes the URL or its password.
# ----------------------------------------------------------------------

set -euo pipefail

if [[ -z "${DATABASE_PUBLIC_URL:-}" ]]; then
  cat >&2 <<MSG
ERROR: DATABASE_PUBLIC_URL not set.

You probably ran this script via the wrong service. The Postgres service
is the one that exposes the public proxy URL. Re-run with:

    railway run --service Postgres -- bash backend/scripts/diag_prod_schema.sh

(Not --service dealscope — that one only has the internal DATABASE_URL.)
MSG
  exit 1
fi

PROXY_HOST="$(echo "$DATABASE_PUBLIC_URL" | sed -E 's|.*@([^:/]+):.*|\1|')"
PROXY_PORT="$(echo "$DATABASE_PUBLIC_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')"
echo "Connecting via $PROXY_HOST:$PROXY_PORT ..."
echo

psql "$DATABASE_PUBLIC_URL" -At <<'SQL'
SELECT 'alembic_version'        AS check, version_num AS value FROM alembic_version
UNION ALL
SELECT 'flip_stage_exists'      AS check, (
  EXISTS(SELECT 1 FROM information_schema.columns
         WHERE table_name='saved_properties' AND column_name='flip_stage')
)::text AS value
UNION ALL
SELECT 'rehab_budgets_exists'   AS check, (
  EXISTS(SELECT 1 FROM information_schema.tables
         WHERE table_name='rehab_budgets')
)::text AS value;
SQL
