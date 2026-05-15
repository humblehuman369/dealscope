# DealGapIQ Backend — Incident Response Runbook

**Owner**: Backend Platform Team  
**Last Updated**: 2026-05-15 (Phase 5)

---

## 1. On-Call Responsibilities

- **First 5 minutes**: Acknowledge the alert in PagerDuty / Slack.
- **Next 10 minutes**: Triage (see decision tree below).
- **Ongoing**: Update `#backend-incidents` channel every 15 minutes until resolved.
- **Post-incident**: Fill out the incident report within 24 hours.

---

## 2. Triage Decision Tree

```
Is the service completely down?
├── YES → Go to "Service Down" runbook
└── NO  → Is it a data integrity issue (wrong rent/value, billing)?
          ├── YES → Go to "Data Integrity" runbook
          └── NO  → Is it a provider outage (RentCast, AXESSO, Stripe, etc.)?
                    ├── YES → Go to "External Provider Outage" runbook
                    └── NO  → Open a ticket and investigate
```

---

## 3. Common Scenarios & Immediate Actions

### 3.1 Service Down (5xx errors, health check failing)

**Symptoms**
- `/health` returns 5xx or times out
- Sentry shows `InternalError` spike
- Railway / Vercel shows container restart loop

**Immediate Actions**
1. Check Railway logs for the exact error (search for `Traceback`).
2. If `RuntimeError: Configuration errors` → missing required env var (most common after deploys).
   - Fix the variable in Railway → redeploy.
3. If database connection error:
   - Verify `DATABASE_URL` and SSL mode.
   - Check Railway Postgres status.
4. If `alembic` migration failed:
   - Run `alembic downgrade -1` manually in the Railway shell, then re-deploy.

**Rollback**
- Railway → Deployments → select last known-good commit → "Redeploy".

---

### 3.2 External Provider Outage (RentCast, AXESSO, Redfin, Stripe, etc.)

**Symptoms**
- Property search returns "Unavailable" for many users
- Circuit breaker metrics in Sentry show `OPEN` state
- `CircuitOpenError` exceptions

**Immediate Actions**
1. Confirm the provider status page (RentCast status, AXESSO status, Stripe status).
2. If transient → wait (circuit breaker will recover automatically after 30s).
3. If prolonged outage:
   - Increase circuit breaker timeout temporarily via env var (if needed).
   - Communicate to users via status page / in-app banner.

**Recovery**
- No manual action required — circuit breaker will transition `HALF_OPEN` → `CLOSED` automatically once the provider recovers.

---

### 3.3 Data Integrity / Billing Issues

**Symptoms**
- Users report incorrect rent/value estimates
- Subscriptions not activating after payment
- Duplicate charges

**Immediate Actions**
1. **Stop the bleeding**:
   - If billing is involved, put Stripe in test mode or disable webhooks temporarily.
   - Revoke affected subscriptions via admin panel if needed.
2. Identify the root cause:
   - Check `property_service` cache staleness logic.
   - Check `billing_service` webhook handler logs.
3. Fix the code, deploy, then backfill affected records (use one-off scripts in `scripts/`).

**Never**
- Do not manually edit production database rows unless the change is fully audited and reversible.

---

### 3.4 Database Migration Failure

**Symptoms**
- Pre-deploy `alembic upgrade head` fails
- Container starts but schema is inconsistent

**Immediate Actions**
1. Connect to the Railway Postgres shell.
2. Run:
   ```sql
   SELECT * FROM alembic_version;
   ```
3. If the migration is partially applied:
   - Manually revert the failing migration steps (see migration file `downgrade`).
   - Mark the migration as applied or create a new corrective migration.
4. Re-deploy.

**Golden Rule**
- Never delete a migration file that has been applied in production.
- Always write a proper `downgrade()` function.

---

## 4. Useful Commands

```bash
# View current database schema version
alembic current

# Roll back one migration (use with extreme caution)
alembic downgrade -1

# Force a full schema check
python -m app.core.schema_guard

# Run chaos test against staging
python scripts/chaos_test.py --env=staging
```

---

## 5. Escalation

- **Level 1** (on-call engineer) — handles 95% of incidents.
- **Level 2** (Backend Platform owner) — paged for:
  - Data loss or corruption
  - Billing or payment integrity issues
  - Any incident lasting > 30 minutes
- **Level 3** (CTO) — paged for:
  - Full production outage > 1 hour
  - Security incident or data breach

---

## 6. Post-Incident Checklist

- [ ] Root cause documented in incident report
- [ ] Fix merged and deployed
- [ ] Monitoring/alert improved (if applicable)
- [ ] Runbook updated
- [ ] Blameless retrospective held within 48 hours

---

**Remember**: Speed of communication > speed of the fix. Users forgive downtime more than silence.