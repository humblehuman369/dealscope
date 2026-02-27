"""
APScheduler integration for periodic cleanup tasks.

Plugs into the FastAPI lifespan so jobs start automatically on boot
and shut down cleanly.

Usage in ``main.py``::

    from app.tasks.scheduler import start_scheduler, stop_scheduler

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        start_scheduler()
        yield
        stop_scheduler()
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> None:
    """Start the background scheduler with all periodic jobs."""
    global _scheduler

    from app.tasks.cleanup import (
        archive_old_audit_logs,
        cleanup_expired_sessions,
        cleanup_expired_tokens,
        encrypt_plaintext_mfa_secrets,
    )

    _scheduler = AsyncIOScheduler(timezone="UTC")

    _scheduler.add_job(
        cleanup_expired_sessions,
        CronTrigger(minute=0),  # every hour at :00
        id="cleanup_sessions",
        replace_existing=True,
    )
    _scheduler.add_job(
        cleanup_expired_tokens,
        CronTrigger(minute=5),  # every hour at :05
        id="cleanup_tokens",
        replace_existing=True,
    )
    _scheduler.add_job(
        archive_old_audit_logs,
        CronTrigger(hour=3, minute=0),  # daily at 03:00 UTC
        id="archive_audit_logs",
        replace_existing=True,
    )
    _scheduler.add_job(
        encrypt_plaintext_mfa_secrets,
        CronTrigger(hour=4, minute=0),  # daily at 04:00 UTC
        id="encrypt_mfa_secrets",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        "APScheduler started with %d jobs: %s",
        len(_scheduler.get_jobs()),
        [j.id for j in _scheduler.get_jobs()],
    )


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down")
        _scheduler = None
