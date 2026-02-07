#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Pre-migration database backup script
#
# Usage:
#   ./scripts/backup.sh                  # Uses DATABASE_URL env var
#   ./scripts/backup.sh <database_url>   # Explicit URL
#
# Creates a timestamped pg_dump in ./backups/ and prints the path.
# Designed to run in CI/CD before `alembic upgrade head`.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DB_URL="${1:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "ERROR: No database URL provided."
  echo "Set DATABASE_URL or pass as first argument."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/investiq_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "──────────────────────────────────────"
echo "InvestIQ Database Backup"
echo "  Time:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "  Target: ${BACKUP_FILE}"
echo "──────────────────────────────────────"

# Convert postgres:// or postgresql+psycopg:// to standard postgresql://
CLEAN_URL="$DB_URL"
CLEAN_URL="${CLEAN_URL/postgresql+psycopg:\/\//postgresql:\/\/}"
CLEAN_URL="${CLEAN_URL/postgresql+asyncpg:\/\//postgresql:\/\/}"
CLEAN_URL="${CLEAN_URL/postgres:\/\//postgresql:\/\/}"

# Run pg_dump with compression
pg_dump "$CLEAN_URL" \
  --no-owner \
  --no-privileges \
  --format=plain \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✓ Backup complete: ${BACKUP_FILE} (${SIZE})"

# Keep only last 10 backups to avoid filling disk
cd "$BACKUP_DIR"
ls -1t investiq_*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
echo "✓ Old backups pruned (keeping last 10)"
