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


async def archive_old_audit_logs(days: int = 90) -> int:
    """Delete audit log entries older than ``days``."""
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


async def run_all_cleanup() -> dict:
    """Run all cleanup tasks and return counts."""
    sessions = await cleanup_expired_sessions()
    tokens = await cleanup_expired_tokens()
    audit = await archive_old_audit_logs()
    return {
        "expired_sessions_removed": sessions,
        "expired_tokens_removed": tokens,
        "old_audit_logs_archived": audit,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
