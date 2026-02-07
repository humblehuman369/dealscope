# Deployment Runbook

## Prerequisites

- Access to Railway dashboard
- GitHub repo write access
- PostgreSQL connection string for production
- All required environment variables set (see `.env.example`)

## Standard Deployment (via CI/CD)

1. Create a PR from your feature branch to `main`
2. CI runs automatically (lint, test, security scan)
3. All checks must pass before merge
4. Merge the PR
5. Railway auto-deploys from `main`
6. Monitor logs in Railway dashboard for 5 minutes post-deploy

## Manual Deployment (Emergency)

```bash
# 1. SSH / connect to Railway CLI
railway login

# 2. Deploy specific commit
railway up --detach

# 3. Verify health
curl https://YOUR_APP.railway.app/health
curl https://YOUR_APP.railway.app/health/deep
```

## Pre-Deployment Checklist

- [ ] All tests passing locally (`pytest tests/ -v`)
- [ ] No new linter errors (`ruff check app/`)
- [ ] Database migrations tested locally
- [ ] Environment variables updated if needed
- [ ] Backup taken (see Rollback section)

## Post-Deployment Verification

1. Check `/health` returns `"status": "healthy"`
2. Check `/health/deep` for external service connectivity
3. Check `/metrics` for Prometheus counters
4. Verify a test login works
5. Check Sentry for new errors (wait 5 min)

---

# Rollback Procedure

## Quick Rollback (Railway)

```bash
# Railway keeps previous deployments
# In Railway dashboard: Deployments → click previous successful deployment → Redeploy
```

## Database Rollback

```bash
# 1. Take current backup first
./scripts/backup.sh

# 2. Rollback one migration
cd backend
alembic downgrade -1

# 3. Verify
alembic current
```

## Full Rollback to Specific Version

```bash
# 1. Identify the target migration
alembic history

# 2. Downgrade to target
alembic downgrade <revision_id>

# 3. Deploy the previous code version
git revert HEAD
git push origin main
```

---

# Database Migration Procedure

## Before Migration

```bash
# 1. Backup the database
./scripts/backup.sh "$DATABASE_URL"

# 2. Review the migration
alembic history
alembic show head
```

## Run Migration

```bash
# 3. Apply
cd backend
alembic upgrade head

# 4. Verify
alembic current
```

## If Migration Fails

```bash
# Roll back the failed migration
alembic downgrade -1

# Restore from backup if data was corrupted
psql "$DATABASE_URL" < backups/investiq_YYYYMMDD_HHMMSS.sql
```

---

# Incident Response Checklist

1. **Acknowledge** — Post in #incidents channel
2. **Assess severity**
   - P1: Service down, data loss → All hands
   - P2: Degraded performance → On-call engineer
   - P3: Minor issue, workaround exists → Next business day
3. **Investigate**
   - Check `/health/deep` for failing services
   - Check Sentry for error spikes
   - Check Railway logs for crash loops
   - Check `/metrics` for latency spikes
4. **Mitigate** — Rollback if the deploy caused it
5. **Communicate** — Update status page
6. **Post-mortem** — Within 48 hours for P1/P2

---

# Scaling Guidelines

## Horizontal Scaling (Railway)

- Railway scales replicas automatically
- Ensure Redis is configured for shared state (rate limiting, cache)
- Database connection pool: `DB_POOL_SIZE=10`, `DB_MAX_OVERFLOW=20`

## When to Scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| p99 latency | > 2s sustained | Add replica |
| CPU usage | > 80% sustained | Add replica |
| DB connections | > 25 active | Increase pool or add read replica |
| Memory | > 85% | Increase container memory |
| Error rate | > 1% of requests | Investigate root cause first |

## Database Scaling

1. **Read replicas** — Route analytics/report queries to replica
2. **Connection pooling** — Use PgBouncer if > 50 concurrent connections
3. **Table partitioning** — Partition `audit_logs` by month when > 10M rows
