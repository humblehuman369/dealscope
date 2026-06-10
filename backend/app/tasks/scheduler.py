"""Embedded APScheduler with Redis leader election.

This is the supported production path for scheduled jobs when no dedicated
worker service is deployed (single Railway web service). A Redis ``SET NX``
leader lock guarantees exactly one scheduler across all web workers/replicas.

Leader lifecycle:
- Every worker runs a lightweight supervisor loop that tries to acquire the
  leader lock once a minute.
- The winner starts APScheduler and renews the lock every 2 minutes
  (TTL 5 minutes).
- If the leader dies — including routine gunicorn ``max_requests`` worker
  recycling — the lock expires and another worker's supervisor loop takes
  over within ~6 minutes. No job is permanently orphaned.

Every job is wrapped with a dead-man heartbeat (see ``app/tasks/heartbeat.py``)
surfaced at ``GET /health/jobs``.

A dedicated Arq worker (``arq app.tasks.arq_worker.WorkerSettings``) remains
the preferred path at scale; set ``EMBEDDED_SCHEDULER_ENABLED=false`` when one
is deployed so jobs don't double-fire.
"""

from __future__ import annotations

import asyncio
import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.tasks.heartbeat import SCHEDULER_HEARTBEAT_ID, record_heartbeat, with_heartbeat

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None
_supervisor_task: asyncio.Task | None = None

LEADER_LOCK_KEY = "scheduler:leader"
LEADER_LOCK_TTL = 300  # 5 minutes
LEADER_RETRY_INTERVAL = 60  # non-leaders re-attempt acquisition every minute


def _lock_value() -> str:
    return str(os.getpid())


async def _try_acquire_leader_lock() -> bool:
    """Attempt to claim the scheduler leader lock via Redis SET NX.

    Returns True only when this worker acquired the Redis lock, or when local
    development explicitly uses the single-worker fallback.
    """
    try:
        from app.core.config import settings
        from app.services.cache_service import get_cache_service

        cache = get_cache_service()
        if not (cache.use_redis and cache.redis_client):
            if settings.ENVIRONMENT != "development":
                logger.error(
                    "Scheduler not started: Redis leader lock is unavailable in %s",
                    settings.ENVIRONMENT,
                )
                return False
            logger.warning("Scheduler running without Redis leader lock in development")
            return True

        acquired = await cache.redis_client.set(
            LEADER_LOCK_KEY,
            _lock_value(),
            nx=True,
            ex=LEADER_LOCK_TTL,
        )
        return bool(acquired)
    except Exception as e:
        try:
            from app.core.config import settings

            if settings.ENVIRONMENT == "development":
                logger.warning("Scheduler leader lock check failed in development; running anyway: %s", e)
                return True
        except Exception:
            pass

        logger.error("Scheduler leader lock check failed; scheduler will not start: %s", e)
        return False


async def _renew_leader_lock() -> None:
    """Renew the leader lock TTL and record the scheduler's own heartbeat."""
    try:
        from app.services.cache_service import get_cache_service

        cache = get_cache_service()
        if cache.use_redis and cache.redis_client:
            await cache.redis_client.set(
                LEADER_LOCK_KEY,
                _lock_value(),
                ex=LEADER_LOCK_TTL,
            )
    except Exception:
        pass
    try:
        await record_heartbeat(SCHEDULER_HEARTBEAT_ID)
    except Exception:
        pass


async def _release_leader_lock() -> None:
    """Release the lock on graceful shutdown — but only if we still own it."""
    try:
        from app.services.cache_service import get_cache_service

        cache = get_cache_service()
        if cache.use_redis and cache.redis_client:
            owner = await cache.redis_client.get(LEADER_LOCK_KEY)
            owner_str = owner.decode() if isinstance(owner, bytes) else owner
            if owner_str == _lock_value():
                await cache.redis_client.delete(LEADER_LOCK_KEY)
    except Exception:
        pass


async def _supervisor_loop() -> None:
    """Acquire-or-retry loop. Keeps re-election alive after leader death."""
    global _scheduler
    while True:
        try:
            if _scheduler is None:
                if await _try_acquire_leader_lock():
                    logger.info("Scheduler leader lock acquired (pid=%s)", os.getpid())
                    _start_scheduler()
                    await _renew_leader_lock()
        except Exception as e:
            logger.error("Scheduler supervisor iteration failed: %s", e)
        await asyncio.sleep(LEADER_RETRY_INTERVAL)


async def start_embedded_scheduler() -> None:
    """Start the supervisor loop (call once from app lifespan startup)."""
    global _supervisor_task
    if _supervisor_task is not None and not _supervisor_task.done():
        return
    _supervisor_task = asyncio.create_task(_supervisor_loop(), name="scheduler-supervisor")
    logger.info("Embedded scheduler supervisor started (pid=%s)", os.getpid())


def _start_scheduler() -> None:
    """Create and start the APScheduler instance with all periodic jobs."""
    global _scheduler

    from app.tasks.billing_sweeper import sweep_expired_subscriptions
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
        with_heartbeat("cleanup_sessions", cleanup_expired_sessions),
        CronTrigger(minute=0),
        id="cleanup_sessions",
        replace_existing=True,
    )
    _scheduler.add_job(
        with_heartbeat("cleanup_tokens", cleanup_expired_tokens),
        CronTrigger(minute=5),
        id="cleanup_tokens",
        replace_existing=True,
    )
    _scheduler.add_job(
        with_heartbeat("archive_audit_logs", archive_old_audit_logs),
        CronTrigger(hour=3, minute=0),
        id="archive_audit_logs",
        replace_existing=True,
    )
    _scheduler.add_job(
        with_heartbeat("encrypt_mfa_secrets", encrypt_plaintext_mfa_secrets),
        CronTrigger(hour=4, minute=0),
        id="encrypt_mfa_secrets",
        replace_existing=True,
    )

    # -- Billing safety net --
    # Runs hourly at :15 to catch subscriptions whose trial_end or
    # current_period_end has passed without a webhook transitioning them
    # out of TRIALING/ACTIVE. See Risk #3 in trial-enforcement audit.
    _scheduler.add_job(
        with_heartbeat("sweep_expired_subscriptions", sweep_expired_subscriptions),
        CronTrigger(minute=15),
        id="sweep_expired_subscriptions",
        replace_existing=True,
    )

    # -- Lifecycle email jobs --
    _scheduler.add_job(
        with_heartbeat("email_onboarding_nudge", send_onboarding_nudges),
        CronTrigger(hour=14, minute=0),
        id="email_onboarding_nudge",
        replace_existing=True,
    )
    _scheduler.add_job(
        with_heartbeat("email_reengagement", send_reengagement_emails),
        CronTrigger(hour=15, minute=0),
        id="email_reengagement",
        replace_existing=True,
    )
    _scheduler.add_job(
        with_heartbeat("email_winback", send_winback_emails),
        CronTrigger(hour=15, minute=30),
        id="email_winback",
        replace_existing=True,
    )
    _scheduler.add_job(
        with_heartbeat("email_annual_renewal", send_annual_renewal_reminders),
        CronTrigger(hour=16, minute=0),
        id="email_annual_renewal",
        replace_existing=True,
    )
    _scheduler.add_job(
        with_heartbeat("email_activity_digest", send_activity_digests),
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


async def stop_embedded_scheduler() -> None:
    """Gracefully stop the supervisor, the scheduler, and release the lock."""
    global _scheduler, _supervisor_task

    if _supervisor_task is not None:
        _supervisor_task.cancel()
        try:
            await _supervisor_task
        except (asyncio.CancelledError, Exception):
            pass
        _supervisor_task = None

    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down")
        _scheduler = None
        await _release_leader_lock()
