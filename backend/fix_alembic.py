"""
fix_alembic.py — Ensure database schema is up to date before app startup.

Called by Railway's start command:
    python fix_alembic.py && uvicorn app.main:app ...

Strategy:
  1. Connect to the database directly and check if auth columns exist.
  2. If missing, stamp Alembic to the pre-auth revision and re-run migrations.
  3. If Alembic fails, apply the schema changes via raw SQL as a fallback.
  4. Always exit 0 so the app can start.
"""

import asyncio
import logging
import os
import subprocess
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)-5s  %(message)s")
log = logging.getLogger("fix_alembic")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PRE_AUTH_REVISION = "20260204_0001"


def _alembic(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "alembic"] + cmd,
        capture_output=True, text=True, cwd=SCRIPT_DIR,
    )


def _get_database_url() -> str:
    """Get the DATABASE_URL from the environment (same as the app uses)."""
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        log.warning("DATABASE_URL not set, skipping migrations")
        return ""
    return url


def _check_column_exists(url: str, table: str, column: str) -> bool:
    """Check if a column exists using a sync psycopg connection."""
    try:
        import psycopg
        # Use the raw DATABASE_URL (psycopg handles postgresql:// natively)
        conn_url = url
        # Railway internal network doesn't need SSL
        if "railway.internal" in conn_url:
            if "sslmode=" not in conn_url:
                sep = "&" if "?" in conn_url else "?"
                conn_url = f"{conn_url}{sep}sslmode=disable"

        with psycopg.connect(conn_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = %s AND column_name = %s",
                    (table, column),
                )
                return cur.fetchone() is not None
    except Exception as e:
        log.error("DB check failed: %s", e)
        return False  # Assume missing so we try to fix it


def _apply_auth_columns_sql(url: str) -> bool:
    """Fallback: add auth columns via raw SQL if Alembic can't."""
    try:
        import psycopg
        conn_url = url
        if "railway.internal" in conn_url:
            if "sslmode=" not in conn_url:
                sep = "&" if "?" in conn_url else "?"
                conn_url = f"{conn_url}{sep}sslmode=disable"

        with psycopg.connect(conn_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                # Add columns to users table (IF NOT EXISTS via DO blocks)
                columns = [
                    ("failed_login_attempts", "INTEGER DEFAULT 0 NOT NULL"),
                    ("locked_until", "TIMESTAMPTZ"),
                    ("password_changed_at", "TIMESTAMPTZ"),
                    ("mfa_secret", "VARCHAR(255)"),
                    ("mfa_enabled", "BOOLEAN DEFAULT FALSE NOT NULL"),
                ]
                for col_name, col_type in columns:
                    cur.execute(f"""
                        DO $$ BEGIN
                            ALTER TABLE users ADD COLUMN {col_name} {col_type};
                        EXCEPTION
                            WHEN duplicate_column THEN NULL;
                        END $$;
                    """)
                    log.info("  Column users.%s — ensured", col_name)

                # Create auth tables if they don't exist
                tables_sql = [
                    """CREATE TABLE IF NOT EXISTS user_sessions (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        session_token VARCHAR(128) UNIQUE NOT NULL,
                        refresh_token VARCHAR(128) UNIQUE NOT NULL,
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        device_name VARCHAR(255),
                        is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
                        last_active_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                        expires_at TIMESTAMPTZ NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
                    )""",
                    """CREATE TABLE IF NOT EXISTS roles (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name VARCHAR(50) UNIQUE NOT NULL,
                        description TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )""",
                    """CREATE TABLE IF NOT EXISTS permissions (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        codename VARCHAR(100) UNIQUE NOT NULL,
                        description TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )""",
                    """CREATE TABLE IF NOT EXISTS role_permissions (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                        UNIQUE(role_id, permission_id)
                    )""",
                    """CREATE TABLE IF NOT EXISTS user_roles (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                        granted_at TIMESTAMPTZ DEFAULT NOW(),
                        granted_by UUID,
                        UNIQUE(user_id, role_id)
                    )""",
                    """CREATE TABLE IF NOT EXISTS audit_logs (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                        action VARCHAR(50) NOT NULL,
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        metadata JSONB,
                        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
                    )""",
                    """CREATE TABLE IF NOT EXISTS verification_tokens (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        token_hash VARCHAR(64) UNIQUE NOT NULL,
                        token_type VARCHAR(30) NOT NULL,
                        expires_at TIMESTAMPTZ NOT NULL,
                        used_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
                    )""",
                ]
                for sql in tables_sql:
                    table_name = sql.split("IF NOT EXISTS")[1].split("(")[0].strip()
                    cur.execute(sql)
                    log.info("  Table %s — ensured", table_name)

                # Seed default roles if empty
                cur.execute("SELECT COUNT(*) FROM roles")
                if cur.fetchone()[0] == 0:
                    log.info("  Seeding default roles and permissions ...")
                    import uuid
                    role_ids = {}
                    for name, desc in [
                        ("owner", "Full platform owner"),
                        ("admin", "Administrative access"),
                        ("member", "Standard user"),
                        ("viewer", "Read-only access"),
                    ]:
                        rid = str(uuid.uuid4())
                        cur.execute(
                            "INSERT INTO roles (id, name, description) VALUES (%s, %s, %s)",
                            (rid, name, desc),
                        )
                        role_ids[name] = rid

                    perms = [
                        "properties:read", "properties:write", "properties:delete",
                        "documents:read", "documents:write", "documents:delete",
                        "reports:read", "reports:generate", "search:execute",
                        "profile:read", "profile:write",
                        "billing:read", "billing:manage",
                        "admin:users", "admin:roles", "admin:system", "admin:audit",
                    ]
                    perm_ids = {}
                    for codename in perms:
                        pid = str(uuid.uuid4())
                        cur.execute(
                            "INSERT INTO permissions (id, codename) VALUES (%s, %s)",
                            (pid, codename),
                        )
                        perm_ids[codename] = pid

                    # Assign all permissions to owner and admin
                    for role in ("owner", "admin"):
                        for codename in perms:
                            cur.execute(
                                "INSERT INTO role_permissions (id, role_id, permission_id) VALUES (%s, %s, %s)",
                                (str(uuid.uuid4()), role_ids[role], perm_ids[codename]),
                            )

                    # Assign member permissions
                    member_perms = [p for p in perms if not p.startswith("admin:")]
                    for codename in member_perms:
                        cur.execute(
                            "INSERT INTO role_permissions (id, role_id, permission_id) VALUES (%s, %s, %s)",
                            (str(uuid.uuid4()), role_ids["member"], perm_ids[codename]),
                        )

                    # Assign viewer permissions
                    viewer_perms = [p for p in perms if p.endswith(":read")]
                    for codename in viewer_perms:
                        cur.execute(
                            "INSERT INTO role_permissions (id, role_id, permission_id) VALUES (%s, %s, %s)",
                            (str(uuid.uuid4()), role_ids["viewer"], perm_ids[codename]),
                        )

                    # Assign member role to all existing users without a role
                    cur.execute(
                        "INSERT INTO user_roles (id, user_id, role_id) "
                        "SELECT gen_random_uuid(), u.id, %s FROM users u "
                        "WHERE u.id NOT IN (SELECT user_id FROM user_roles)",
                        (role_ids["member"],),
                    )
                    log.info("  Roles and permissions seeded.")

        # Stamp alembic to head so future migrations work
        _alembic(["stamp", "head"])
        return True
    except Exception as e:
        log.error("SQL fallback failed: %s", e)
        return False


def main() -> None:
    db_url = _get_database_url()
    if not db_url:
        return

    log.info("Checking database schema ...")

    # Check if auth columns exist
    has_auth = _check_column_exists(db_url, "users", "failed_login_attempts")
    log.info("Auth columns present: %s", has_auth)

    if has_auth:
        # Schema looks good — just run normal alembic upgrade
        result = _alembic(["upgrade", "head"])
        if result.returncode == 0:
            log.info("Alembic upgrade succeeded.")
        else:
            log.warning("Alembic upgrade output: %s", (result.stderr + result.stdout).strip())
            # Non-fatal — stamp to head if already at correct state
            _alembic(["stamp", "head"])
        return

    # Auth columns missing — try Alembic first
    log.info("Auth columns missing. Attempting Alembic migration ...")
    _alembic(["stamp", PRE_AUTH_REVISION])
    result = _alembic(["upgrade", "head"])

    if result.returncode == 0:
        log.info("Alembic migration applied successfully.")
        return

    log.warning("Alembic failed: %s", (result.stderr + result.stdout).strip())

    # Fallback: apply schema changes via raw SQL
    log.info("Applying auth schema via raw SQL fallback ...")
    if _apply_auth_columns_sql(db_url):
        log.info("Auth schema applied successfully via SQL.")
    else:
        log.error("Could not apply auth schema. Login will not work.")


if __name__ == "__main__":
    main()
