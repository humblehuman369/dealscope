"""
Arq worker configuration for DealGapIQ background jobs.

This replaces the APScheduler-based scheduler with a proper Redis-backed
async task queue. Benefits:
- Built-in retry, dead-letter queue, and observability
- Horizontal scaling of workers independent of web workers
- Job results and failure tracking

Run the worker with::

    arq app.tasks.arq_worker.WorkerSettings

Or via the project script::

    python -m arq app.tasks.arq_worker.WorkerSettings

If the ``arq`` package is not installed, importing this module will raise
an informative error only when the worker is actually started.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from app.core.config import settings
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

logger = logging.getLogger(__name__)


async def startup(ctx: dict) -> None:
    """Worker startup hook."""
    logger.info("Arq worker starting up...")
    ctx["started_at"] = datetime.now(UTC)


async def shutdown(ctx: dict) -> None:
    """Worker shutdown hook."""
    logger.info("Arq worker shutting down...")


# ------------------------------------------------------------------
# Cron job definitions (run on the Arq worker, not the web process)
# ------------------------------------------------------------------

try:
    from arq import cron
    from arq.connections import RedisSettings

    CRON_JOBS = [
        # Cleanup jobs
        cron(
            cleanup_expired_sessions,
            minute=0,
            unique=True,
            timeout=300,
            keep_result=0,
        ),
        cron(
            cleanup_expired_tokens,
            minute=5,
            unique=True,
            timeout=300,
            keep_result=0,
        ),
        cron(
            archive_old_audit_logs,
            hour=3,
            minute=0,
            unique=True,
            timeout=600,
            keep_result=0,
        ),
        cron(
            encrypt_plaintext_mfa_secrets,
            hour=4,
            minute=0,
            unique=True,
            timeout=600,
            keep_result=0,
        ),
        # Billing safety net
        cron(
            sweep_expired_subscriptions,
            minute=15,
            unique=True,
            timeout=300,
            keep_result=0,
        ),
        # Email lifecycle jobs
        cron(
            send_activity_digests,
            hour=9,
            minute=0,
            unique=True,
            timeout=600,
            keep_result=0,
        ),
        cron(
            send_onboarding_nudges,
            hour=10,
            minute=0,
            unique=True,
            timeout=600,
            keep_result=0,
        ),
        cron(
            send_reengagement_emails,
            hour=11,
            minute=0,
            unique=True,
            timeout=600,
            keep_result=0,
        ),
        cron(
            send_winback_emails,
            hour=12,
            minute=0,
            unique=True,
            timeout=600,
            keep_result=0,
        ),
        cron(
            send_annual_renewal_reminders,
            hour=8,
            minute=30,
            unique=True,
            timeout=600,
            keep_result=0,
        ),
    ]

    class WorkerSettings:
        """Arq worker settings.

        This class is discovered by the `arq` CLI when starting workers.
        """

        functions: list = []
        cron_jobs = CRON_JOBS
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        on_startup = startup
        on_shutdown = shutdown
        max_jobs = 10
        job_timeout = 300
        max_tries = 3

except ImportError as _e:  # pragma: no cover
    logger.warning("arq package not installed — worker configuration unavailable")
    CRON_JOBS = []
    WorkerSettings = None  # type: ignore[misc,assignment]
