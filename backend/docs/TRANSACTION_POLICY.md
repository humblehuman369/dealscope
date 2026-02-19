# Transaction & Commit Policy

## Ownership Rule

**Routers own the commit.** Services use savepoints (`begin_nested()`) for
sub-transaction atomicity but never call `db.commit()` themselves.

```
Router (HTTP boundary)
  └─ await service.do_work(db, ...)   # uses begin_nested() internally
  └─ await db.commit()                # router commits on success
```

If the request raises an exception, `get_db()` rolls back automatically —
no partial state is persisted.

## Why This Pattern

| Concern | Router-commits | Service-commits |
|---|---|---|
| Single responsibility | Router = HTTP + tx boundary | Service mixes business logic with tx control |
| Composability | Two services in one request share one tx | Each service commits independently — partial writes possible |
| Testability | Tests can inspect state before commit | State is committed mid-test, harder to assert |
| Error recovery | One rollback undoes everything | Must manually compensate for already-committed writes |

## Current State

The auth router (`app/routers/auth.py`) follows the new pattern as of Phase 1.

Several other services (`billing_service`, `saved_property_service`,
`user_service`, `document_service`, etc.) still call `db.commit()` internally.
These are functional and should be migrated incrementally — **do not batch-move
all commits at once**, as that risks regressions across many endpoints.

### Migration Priority

1. **New code**: Always follow this policy.
2. **Billing webhooks**: `billing_service` webhook handlers are an exception —
   they are called outside a router context (Stripe calls us) and must manage
   their own transactions.
3. **Existing services**: Migrate when touching the file for other reasons.

## Savepoint Usage

Services should wrap multi-step mutations in a savepoint:

```python
async def register_user(self, db: AsyncSession, ...):
    async with db.begin_nested():
        user = await user_repo.create(db, ...)
        await role_repo.assign_default_role(db, user.id)
        await audit_repo.log(db, ...)
    # No commit here — the calling router commits
```

This ensures that if any step within the service fails, the savepoint rolls
back without affecting other work in the same session.

## `get_db()` Dependency

The `get_db()` dependency (defined in `app/db/session.py`) does **not**
auto-commit. On exception it rolls back; on normal exit it closes the session
without committing. This is intentional — it forces explicit commit calls
at the router level.
