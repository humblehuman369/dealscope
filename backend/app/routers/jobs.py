"""
Cron-callable job endpoints.

Security model:
- Every request must present a valid ``X-Cron-Token`` header matching
  ``settings.CRON_SECRET``.
- If ``CRON_ALLOWED_IPS`` is configured, the client IP must also match one of
  the listed addresses or CIDR blocks (checked via ``X-Forwarded-For`` then
  ``request.client.host``).
- If ``CRON_SECRET`` is empty, all requests are rejected with 503.

This combination prevents accidental exposure even if the secret leaks.
"""

import logging

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.config import settings
from app.core.deps import DbSession
from app.schemas.saved_map_search import SavedSearchAlertRunResult
from app.services.gap_alert_jobs import send_gap_alerts
from app.services.linkedin_publish_jobs import run_linkedin_publish
from app.services.notification_jobs import send_overdue_task_digests
from app.services.saved_search_alert_jobs import send_saved_search_alerts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


def _get_client_ip(request: "Request") -> str:
    """Best-effort client IP extraction behind proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return ""


def _ip_matches_allowed(ip: str, allowed: list[str]) -> bool:
    """Check if ip is in the allowed list (supports exact match or CIDR)."""
    if not allowed:
        return True  # no restriction configured
    import ipaddress

    try:
        ip_obj = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for entry in allowed:
        try:
            if "/" in entry:
                net = ipaddress.ip_network(entry, strict=False)
                if ip_obj in net:
                    return True
            elif ip_obj == ipaddress.ip_address(entry):
                return True
        except ValueError:
            continue
    return False


def _enforce_cron_token(token: str | None, client_ip: str = "") -> None:
    """Reject the call when the secret isn't configured, token is wrong, or IP not allowed."""
    if not settings.CRON_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cron jobs are disabled (CRON_SECRET not configured)",
        )
    if not token or token != settings.CRON_SECRET:
        # 404 rather than 401 to avoid telegraphing the existence of cron
        # endpoints to unauthenticated probes.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    allowed = settings.cron_allowed_ips_list
    if allowed and not _ip_matches_allowed(client_ip, allowed):
        logger.warning("Cron request from disallowed IP: %s", client_ip)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.post(
    "/overdue-task-notifications",
    summary="Send a digest push to every user with at least one overdue open task",
)
async def overdue_task_notifications(
    request: Request,
    db: DbSession,
    x_cron_token: str | None = Header(default=None, alias="X-Cron-Token"),
):
    client_ip = _get_client_ip(request)
    _enforce_cron_token(x_cron_token, client_ip=client_ip)
    result = await send_overdue_task_digests(db)
    logger.info("overdue-task digest run: %s", result)
    return result


@router.post(
    "/gap-alerts",
    summary="Re-check list prices on pipeline properties and push price-drop alerts",
)
async def gap_alerts(
    request: Request,
    db: DbSession,
    x_cron_token: str | None = Header(default=None, alias="X-Cron-Token"),
    max_checks: int = 25,
):
    client_ip = _get_client_ip(request)
    _enforce_cron_token(x_cron_token, client_ip=client_ip)
    # Clamp so a bad cron config can't burn the provider quota in one run.
    result = await send_gap_alerts(db, max_checks=max(1, min(max_checks, 200)))
    logger.info("gap-alert run: %s", result)
    return result


@router.post(
    "/saved-search-alerts",
    response_model=SavedSearchAlertRunResult,
    summary="Email new inventory for saved map searches that are due",
)
async def saved_search_alerts(
    request: Request,
    db: DbSession,
    x_cron_token: str | None = Header(default=None, alias="X-Cron-Token"),
    max_provider_searches: int = 40,
):
    client_ip = _get_client_ip(request)
    _enforce_cron_token(x_cron_token, client_ip=client_ip)
    # Clamp so a bad cron config can't burn the provider quota in one run. The
    # per-search frequency cap already limits repeat sends; this limits the
    # dispatch fan-out of a single run.
    result = await send_saved_search_alerts(
        db, max_provider_searches=max(1, min(max_provider_searches, 200))
    )
    logger.info("saved-search alert run: %s", result.model_dump())
    return result


@router.post(
    "/linkedin-publish",
    summary="Publish due approved LinkedIn posts (max 5 per run)",
)
async def linkedin_publish(
    request: Request,
    db: DbSession,
    x_cron_token: str | None = Header(default=None, alias="X-Cron-Token"),
):
    client_ip = _get_client_ip(request)
    _enforce_cron_token(x_cron_token, client_ip=client_ip)
    result = await run_linkedin_publish(db)
    logger.info("linkedin-publish run: %s", result)
    return result
