"""
Periodic cleanup tasks for auth-related data.

These should be run on a schedule (e.g. every hour via cron, or via
FastAPI's BackgroundTasks, or an APScheduler integration).

Usage from FastAPI lifespan::

    from contextlib import asynccontextmanager
    from app.tasks.cleanup import run_all_cleanup

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # ... startup ...
        yield
        # optional: run cleanup on shutdown
        await run_all_cleanup()

Or invoke individually via a management command / cron endpoint.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.db.session import get_session_factory
from app.repositories.session_repository import session_repo
from app.repositories.token_repository import token_repo
from app.repositories.audit_repository import audit_repo

logger = logging.getLogger(__name__)


async def cleanup_expired_sessions() -> int:
    """Remove expired and revoked sessions from the database."""
    factory = get_session_factory()
    async with factory() as db:
        try:
            count = await session_repo.delete_expired(db)
            await db.commit()
            logger.info("Cleaned up %d expired/revoked sessions", count)
            return count
        except Exception:
            await db.rollback()
            logger.exception("Failed to cleanup sessions")
            return 0


async def cleanup_expired_tokens() -> int:
    """Remove expired verification tokens."""
    factory = get_session_factory()
    async with factory() as db:
        try:
            count = await token_repo.delete_expired(db)
            await db.commit()
            logger.info("Cleaned up %d expired verification tokens", count)
            return count
        except Exception:
            await db.rollback()
            logger.exception("Failed to cleanup tokens")
            return 0


async def archive_old_audit_logs(days: int | None = None) -> int:
    """Delete audit log entries older than ``days``.

    When *days* is ``None`` the value is read from
    ``settings.AUDIT_LOG_RETENTION_DAYS`` (default 90).
    """
    if days is None:
        from app.core.config import settings
        days = getattr(settings, "AUDIT_LOG_RETENTION_DAYS", 90)

    factory = get_session_factory()
    async with factory() as db:
        try:
            count = await audit_repo.delete_older_than(db, days=days)
            await db.commit()
            logger.info("Archived %d audit log entries older than %d days", count, days)
            return count
        except Exception:
            await db.rollback()
            logger.exception("Failed to archive audit logs")
            return 0


async def encrypt_plaintext_mfa_secrets() -> int:
    """Encrypt any MFA secrets stored as plaintext (legacy data).

    MFA secrets created before field-level encryption was introduced may
    be stored as plaintext base32 strings.  Encrypted values carry the
    ``enc:`` prefix so we can detect and skip already-encrypted rows.

    Safe to run multiple times (idempotent).
    """
    from sqlalchemy import text as sa_text
    from app.core.encryption import encrypt_value, is_encrypted

    factory = get_session_factory()
    async with factory() as db:
        try:
            result = await db.execute(
                sa_text(
                    "SELECT id, mfa_secret FROM users "
                    "WHERE mfa_secret IS NOT NULL "
                    "  AND mfa_secret != '' "
                    "  AND mfa_secret NOT LIKE 'enc:%'"
                )
            )
            rows = result.fetchall()
            if not rows:
                return 0

            for row in rows:
                user_id, plaintext = row[0], row[1]
                encrypted = encrypt_value(plaintext)
                await db.execute(
                    sa_text("UPDATE users SET mfa_secret = :secret WHERE id = :uid"),
                    {"secret": encrypted, "uid": user_id},
                )

            await db.commit()
            logger.info("Encrypted %d legacy plaintext MFA secrets", len(rows))
            return len(rows)
        except Exception:
            await db.rollback()
            logger.exception("Failed to encrypt MFA secrets")
            return 0


async def run_all_cleanup() -> dict:
    """Run all cleanup tasks and return counts."""
    sessions = await cleanup_expired_sessions()
    tokens = await cleanup_expired_tokens()
    audit = await archive_old_audit_logs()
    mfa = await encrypt_plaintext_mfa_secrets()
    return {
        "expired_sessions_removed": sessions,
        "expired_tokens_removed": tokens,
        "old_audit_logs_archived": audit,
        "mfa_secrets_encrypted": mfa,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
