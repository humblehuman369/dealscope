#!/usr/bin/env bash
# diag_prod_schema.sh
# ----------------------------------------------------------------------
# Read-only diagnosis of prod alembic_version vs the actual saved_properties
# schema. Detects the "silent stamp head" drift class of bug.
#
# Usage:
#   railway run --service dealscope -- bash backend/scripts/diag_prod_schema.sh
#
# Prints:
#   alembic_version       — what Alembic *thinks* the DB is at
#   flip_stage_exists     — whether the column actually exists
#   rehab_budgets_exists  — whether the new table actually exists
#
# Security: never echoes the DATABASE_URL or its password. The proxy URL is
# constructed inside the script's own subshell.
# ----------------------------------------------------------------------

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set. Run via 'railway run --service dealscope -- bash <this-script>'." >&2
  exit 1
fi

if [[ -z "${RAILWAY_TCP_PROXY_DOMAIN:-}" || -z "${RAILWAY_TCP_PROXY_PORT:-}" ]]; then
  echo "ERROR: RAILWAY_TCP_PROXY_DOMAIN/PORT not set. Are you running this via 'railway run'?" >&2
  exit 1
fi

# Swap Railway's internal host:port for the public TCP proxy so psql can
# actually connect from outside Railway's network.
PROXY_URL="${DATABASE_URL/postgres.railway.internal:5432/$RAILWAY_TCP_PROXY_DOMAIN:$RAILWAY_TCP_PROXY_PORT}"

echo "Connecting via $RAILWAY_TCP_PROXY_DOMAIN:$RAILWAY_TCP_PROXY_PORT ..."
echo

psql "$PROXY_URL" -At <<'SQL'
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
