"""
APScheduler integration for periodic cleanup tasks.

Plugs into the FastAPI lifespan so jobs start automatically on boot
and shut down cleanly.

In multi-worker deployments (WEB_CONCURRENCY > 1), a Redis-based leader
lock ensures only ONE worker runs the scheduler.  Workers without the
lock skip scheduler startup.  If the leader dies, the lock expires and
a restarted worker can reclaim it.

Usage in ``main.py``::

    from app.tasks.scheduler import try_start_scheduler, stop_scheduler

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await try_start_scheduler()
        yield
        stop_scheduler()
"""

from __future__ import annotations

import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None

LEADER_LOCK_KEY = "scheduler:leader"
LEADER_LOCK_TTL = 300  # 5 minutes


async def _try_acquire_leader_lock() -> bool:
    """Attempt to claim the scheduler leader lock via Redis SET NX.

    Returns True if this worker should run the scheduler — either because
    it acquired the Redis lock, or because Redis is unavailable (single-
    worker fallback).
    """
    try:
        from app.services.cache_service import get_cache_service

        cache = get_cache_service()
        if not (cache.use_redis and cache.redis_client):
            return True

        acquired = await cache.redis_client.set(
            LEADER_LOCK_KEY,
            str(os.getpid()),
            nx=True,
            ex=LEADER_LOCK_TTL,
        )
        return bool(acquired)
    except Exception as e:
        logger.warning("Scheduler leader lock check failed, defaulting to run: %s", e)
        return True


async def _renew_leader_lock() -> None:
    """Renew the leader lock TTL so it doesn't expire while we're alive."""
    try:
        from app.services.cache_service import get_cache_service

        cache = get_cache_service()
        if cache.use_redis and cache.redis_client:
            await cache.redis_client.set(
                LEADER_LOCK_KEY,
                str(os.getpid()),
                ex=LEADER_LOCK_TTL,
            )
    except Exception:
        pass


async def try_start_scheduler() -> None:
    """Acquire leader lock and start scheduler if this worker is the leader.

    Safe to call from every worker — only the lock winner starts jobs.
    """
    is_leader = await _try_acquire_leader_lock()
    if not is_leader:
        logger.info("Another worker holds the scheduler lock — skipping scheduler in this worker (pid=%s)", os.getpid())
        return

    logger.info("Scheduler leader lock acquired (pid=%s)", os.getpid())
    _start_scheduler()


def _start_scheduler() -> None:
    """Create and start the APScheduler instance with all periodic jobs."""
    global _scheduler

    from app.tasks.cleanup import (
        archive_old_audit_logs,
        cleanup_expired_sessions,
        cleanup_expired_tokens,
        encrypt_plaintext_mfa_secrets,
    )
    from app.tasks.email_tasks import (
        send_activity_digests,
        send_annual_renewal_reminders,
        send_onboarding_nudges,
        send_reengagement_emails,
        send_winback_emails,
    )

    _scheduler = AsyncIOScheduler(timezone="UTC")

    # -- Leader lock renewal (keeps the lock alive while this worker runs) --
    _scheduler.add_job(
        _renew_leader_lock,
        IntervalTrigger(seconds=120),
        id="renew_leader_lock",
        replace_existing=True,
    )

    # -- Cleanup jobs --
    _scheduler.add_job(
        cleanup_expired_sessions,
        CronTrigger(minute=0),
        id="cleanup_sessions",
        replace_existing=True,
    )
    _scheduler.add_job(
        cleanup_expired_tokens,
        CronTrigger(minute=5),
        id="cleanup_tokens",
        replace_existing=True,
    )
    _scheduler.add_job(
        archive_old_audit_logs,
        CronTrigger(hour=3, minute=0),
        id="archive_audit_logs",
        replace_existing=True,
    )
    _scheduler.add_job(
        encrypt_plaintext_mfa_secrets,
        CronTrigger(hour=4, minute=0),
        id="encrypt_mfa_secrets",
        replace_existing=True,
    )

    # -- Lifecycle email jobs --
    _scheduler.add_job(
        send_onboarding_nudges,
        CronTrigger(hour=14, minute=0),
        id="email_onboarding_nudge",
        replace_existing=True,
    )
    _scheduler.add_job(
        send_reengagement_emails,
        CronTrigger(hour=15, minute=0),
        id="email_reengagement",
        replace_existing=True,
    )
    _scheduler.add_job(
        send_winback_emails,
        CronTrigger(hour=15, minute=30),
        id="email_winback",
        replace_existing=True,
    )
    _scheduler.add_job(
        send_annual_renewal_reminders,
        CronTrigger(hour=16, minute=0),
        id="email_annual_renewal",
        replace_existing=True,
    )
    _scheduler.add_job(
        send_activity_digests,
        CronTrigger(day_of_week="mon", hour=14, minute=0),
        id="email_activity_digest",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        "APScheduler started with %d jobs: %s",
        len(_scheduler.get_jobs()),
        [j.id for j in _scheduler.get_jobs()],
    )


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler and release the leader lock."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down")
        _scheduler = None
