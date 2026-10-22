#!/usr/bin/env bash
# DealGapIQ Cloud Agent — per-boot runtime initialization.
#
# Idempotent and non-blocking: starts Postgres + Redis, ensures the app and
# test databases exist, and applies Alembic migrations. Returns when the
# services are ready. The dev servers themselves run as `terminals`.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Starting PostgreSQL cluster"
if ! sudo pg_lsclusters -h 2>/dev/null | grep -q online; then
  sudo pg_ctlcluster 16 main start || true
fi
# Wait for readiness (up to ~30s)
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q 2>/dev/null; then break; fi
  sleep 1
done

echo "==> Starting Redis"
if ! redis-cli ping >/dev/null 2>&1; then
  sudo redis-server --daemonize yes
fi

echo "==> Ensuring databases and roles exist (idempotent)"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL' || true
ALTER USER postgres PASSWORD 'postgres';
SELECT 'CREATE DATABASE dealgapiq'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dealgapiq')\gexec
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test') THEN
    CREATE ROLE test LOGIN PASSWORD 'test';
  END IF;
END $$;
SELECT 'CREATE DATABASE test_db OWNER test'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'test_db')\gexec
GRANT ALL PRIVILEGES ON DATABASE test_db TO test;
SQL

echo "==> Applying Alembic migrations (app database)"
cd "$REPO_ROOT/backend"
./.venv/bin/alembic upgrade head

echo "==> start.sh complete — services ready"
