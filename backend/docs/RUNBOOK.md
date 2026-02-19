# DealGapIQ Operational Runbook

Quick-reference procedures for the top 5 operational scenarios.
All commands assume you have a shell with database access
(e.g. `railway run` or a direct `psql` connection).

---

## 1. Unlock a Locked User Account

A user may be locked after too many failed login attempts (`failed_login_count` exceeds the threshold) or because an admin set `is_active = false`.

```sql
-- Find the user
SELECT id, email, is_active, failed_login_count, locked_until
FROM users
WHERE email = 'user@example.com';

-- Unlock
UPDATE users
SET is_active = true,
    failed_login_count = 0,
    locked_until = NULL
WHERE email = 'user@example.com';
```

Verify the user can log in again. If MFA is the blocker, see "Reset MFA" below:

```sql
UPDATE users
SET mfa_enabled = false,
    mfa_secret = NULL
WHERE email = 'user@example.com';
```

---

## 2. Manually Reset Monthly Usage Counters

Usage counters (`searches_used`, `api_calls_used`) normally reset automatically every 30 days. To force a reset:

```sql
UPDATE subscriptions
SET searches_used = 0,
    api_calls_used = 0,
    usage_reset_date = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
```

To reset for **all** users (e.g. start of billing cycle):

```sql
UPDATE subscriptions
SET searches_used = 0,
    api_calls_used = 0,
    usage_reset_date = NOW();
```

---

## 3. Handle a Stuck Stripe Subscription

Symptoms: Stripe dashboard shows active subscription, but the app still shows the user on Free tier.

### Step A — Check local state

```sql
SELECT s.*, u.email
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE u.email = 'user@example.com';
```

### Step B — Sync from Stripe

If the `stripe_subscription_id` is set, fetch the current state from Stripe:

```bash
stripe subscriptions retrieve sub_XXXXXXXXXXXX
```

### Step C — Fix locally

```sql
UPDATE subscriptions
SET tier = 'pro',
    status = 'active',
    stripe_subscription_id = 'sub_XXXXXXXXXXXX',
    current_period_start = '2026-02-01T00:00:00Z',
    current_period_end = '2026-03-01T00:00:00Z',
    properties_limit = -1,
    searches_per_month = -1,
    api_calls_per_month = -1
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
```

### Step D — Verify webhook

Check if the webhook secret is configured:

```bash
# In Railway / production environment
echo $STRIPE_WEBHOOK_SECRET
```

If empty, the app logs `STRIPE_SECRET_KEY is configured but STRIPE_WEBHOOK_SECRET is empty` at startup. Set the secret and redeploy.

---

## 4. Rollback a Failed Migration

### Identify the current head

```bash
alembic current
```

### Rollback one step

```bash
alembic downgrade -1
```

### Rollback to a specific revision

```bash
alembic downgrade <revision_id>
```

### If the migration table itself is corrupted

```sql
-- Check Alembic's version table
SELECT * FROM alembic_version;

-- Force-set to a known-good revision
UPDATE alembic_version SET version_num = '<revision_id>';
```

### Verify

```bash
alembic current
alembic check  # should show "No new upgrade operations detected"
```

---

## 5. Revoke All Sessions for a Compromised Account

When an account is suspected compromised, immediately revoke all sessions and force password reset.

```sql
-- Revoke all active sessions
UPDATE user_sessions
SET is_revoked = true
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
  AND is_revoked = false;

-- Invalidate all pending tokens
UPDATE verification_tokens
SET used_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
  AND used_at IS NULL;

-- Force password change on next login (lock account until reset)
UPDATE users
SET is_active = false
WHERE email = 'user@example.com';
```

Then contact the user and have them use the "Forgot Password" flow. After they reset their password, re-enable their account:

```sql
UPDATE users
SET is_active = true
WHERE email = 'user@example.com';
```

---

## Quick Reference: Useful Queries

```sql
-- Active user count
SELECT COUNT(*) FROM users WHERE is_active = true;

-- Users by subscription tier
SELECT s.tier, COUNT(*)
FROM subscriptions s
GROUP BY s.tier;

-- Properties saved in last 24h
SELECT COUNT(*) FROM saved_properties
WHERE saved_at > NOW() - INTERVAL '24 hours';

-- Active sessions
SELECT COUNT(*) FROM user_sessions
WHERE is_revoked = false AND expires_at > NOW();

-- Failed webhooks (last 24h)
SELECT event_type, COUNT(*)
FROM audit_logs
WHERE action LIKE 'webhook%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```
