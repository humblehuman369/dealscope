"""
Cron-callable job endpoints.

Each route is gated by an ``X-Cron-Token`` header that must match
``settings.CRON_SECRET``. If ``CRON_SECRET`` is empty, every request is
rejected with 503 — the operator hasn't opted in to cron jobs yet.

External scheduler example (Vercel cron):
    {
      "crons": [
        {"path": "/api/v1/jobs/overdue-task-notifications", "schedule": "0 13 * * *"}
      ]
    }
The cron header is supplied by the platform; for Vercel, that's automatic.
"""

import logging

from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.core.deps import DbSession
from app.services.notification_jobs import send_overdue_task_digests

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


def _enforce_cron_token(token: str | None) -> None:
    """Reject the call when the secret isn't configured or the token is wrong."""
    if not settings.CRON_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cron jobs are disabled (CRON_SECRET not configured)",
        )
    if not token or token != settings.CRON_SECRET:
        # 404 rather than 401 to avoid telegraphing the existence of cron
        # endpoints to unauthenticated probes.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.post(
    "/overdue-task-notifications",
    summary="Send a digest push to every user with at least one overdue open task",
)
async def overdue_task_notifications(
    db: DbSession,
    x_cron_token: str | None = Header(default=None, alias="X-Cron-Token"),
):
    _enforce_cron_token(x_cron_token)
    result = await send_overdue_task_digests(db)
    logger.info("overdue-task digest run: %s", result)
    return result
