"""Dead-man heartbeats for scheduled jobs.

Every scheduled job records a heartbeat on success (and the last error on
failure). ``evaluate_job_health()`` compares each job's last success against
its expected cadence so ``GET /health/jobs`` can act as a dead-man switch:
point an uptime monitor at it and silent scheduler death becomes an alert
instead of a months-later discovery.

Storage goes through :class:`CacheService` (Redis in production, in-memory
fallback in development) so the web process can read heartbeats written by
whichever process runs the scheduler.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

from app.services.cache_service import get_cache_service

logger = logging.getLogger(__name__)

HEARTBEAT_KEY_PREFIX = "jobs:heartbeat:"
SCHEDULER_HEARTBEAT_ID = "_scheduler"

# Heartbeats must outlive the longest cadence (weekly digest) by a wide margin.
HEARTBEAT_TTL_SECONDS = 14 * 24 * 3600

_HOUR = 3600
_DAY = 24 * 3600

# job_id -> max seconds since last success before the job counts as overdue.
# Buffers are generous (3h for hourly, 26h for daily, 8d for weekly) to avoid
# flapping on slow runs or worker restarts.
EXPECTED_JOBS: dict[str, int] = {
    "cleanup_sessions": 3 * _HOUR,
    "cleanup_tokens": 3 * _HOUR,
    "archive_audit_logs": 26 * _HOUR,
    "encrypt_mfa_secrets": 26 * _HOUR,
    "sweep_expired_subscriptions": 3 * _HOUR,
    "email_onboarding_nudge": 26 * _HOUR,
    "email_reengagement": 26 * _HOUR,
    "email_winback": 26 * _HOUR,
    "email_annual_renewal": 26 * _HOUR,
    "email_activity_digest": 8 * _DAY,
}


def _key(job_id: str) -> str:
    return f"{HEARTBEAT_KEY_PREFIX}{job_id}"


async def record_heartbeat(job_id: str, *, error: str | None = None) -> None:
    """Record a job run. Success updates ``last_success``; failure records the error."""
    cache = get_cache_service()
    now = datetime.now(UTC).isoformat()
    payload: dict[str, Any] = await cache.get(_key(job_id)) or {}
    if error is None:
        payload["last_success"] = now
    else:
        payload["last_error"] = error[:500]
        payload["last_error_at"] = now
    await cache.set(_key(job_id), payload, ttl_seconds=HEARTBEAT_TTL_SECONDS)


def with_heartbeat(job_id: str, fn: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
    """Wrap a job coroutine so every run records a heartbeat (success or error)."""

    async def _wrapped(*args: Any, **kwargs: Any) -> Any:
        try:
            result = await fn(*args, **kwargs)
        except Exception as exc:
            try:
                await record_heartbeat(job_id, error=f"{type(exc).__name__}: {exc}")
            except Exception:  # heartbeat failure must never mask the job error
                logger.warning("Failed to record error heartbeat for %s", job_id)
            raise
        await record_heartbeat(job_id)
        return result

    # Preserve the original name so APScheduler/Arq job ids stay readable.
    _wrapped.__name__ = getattr(fn, "__name__", job_id)
    return _wrapped


def _parse_ts(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


async def evaluate_job_health(now: datetime | None = None) -> dict[str, Any]:
    """Evaluate every expected job against its cadence.

    Per-job status:
    - ``ok`` — last success within the expected window
    - ``overdue`` — last success (or scheduler start, if the job never ran)
      is older than the expected window
    - ``pending_first_run`` — never ran, but the scheduler started recently
      enough that the first run simply hasn't come around yet
    - ``unknown`` — never ran and no scheduler heartbeat exists

    Overall status is ``ok`` unless any job is overdue (→ ``degraded``).
    """
    cache = get_cache_service()
    now = now or datetime.now(UTC)

    scheduler_hb = await cache.get(_key(SCHEDULER_HEARTBEAT_ID)) or {}
    scheduler_started = _parse_ts(scheduler_hb.get("last_success"))

    jobs: dict[str, Any] = {}
    degraded = False
    for job_id, max_stale in EXPECTED_JOBS.items():
        payload = await cache.get(_key(job_id)) or {}
        last_success = _parse_ts(payload.get("last_success"))

        if last_success is not None:
            age = (now - last_success).total_seconds()
            status = "ok" if age <= max_stale else "overdue"
        elif scheduler_started is not None:
            scheduler_age = (now - scheduler_started).total_seconds()
            status = "overdue" if scheduler_age > max_stale else "pending_first_run"
        else:
            status = "unknown"

        if status == "overdue":
            degraded = True

        jobs[job_id] = {
            "status": status,
            "last_success": payload.get("last_success"),
            "last_error": payload.get("last_error"),
            "last_error_at": payload.get("last_error_at"),
            "max_stale_seconds": max_stale,
        }

    return {
        "status": "degraded" if degraded else "ok",
        "scheduler_last_seen": scheduler_hb.get("last_success"),
        "jobs": jobs,
        "timestamp": now.isoformat(),
    }
