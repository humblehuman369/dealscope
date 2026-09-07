"""Anonymous verdict-email capture."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.deps import DbSession
from app.models.verdict_lead import VerdictLead
from app.schemas.leads import CapiEventRequest, CapiEventResponse, VerdictEmailRequest, VerdictEmailResponse
from app.services.cache_service import get_cache_service
from app.services.email_service import email_service
from app.services.meta_capi import CAPI_EVENTS, fbc_from_fbclid, send_capi_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/leads", tags=["Leads"])

PER_IP_PER_HOUR = 10
PER_EMAIL_PER_HOUR = 3


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _enforce_hourly_limit(kind: str, identifier: str, limit: int) -> None:
    cache = get_cache_service()
    hour = datetime.now(UTC).strftime("%Y%m%d%H")
    key = f"lead_rl:{kind}:{identifier}:{hour}"
    used = await cache.get(key) or 0
    if int(used) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please try again in a little while.",
            },
        )
    await cache.set(key, int(used) + 1, ttl_seconds=3600)


def _upsert_resend_contact(email: str, attribution: dict | None) -> None:
    """Best-effort Resend contact so the post-verdict series can segment."""
    try:
        import resend
    except ImportError:
        return
    if not email_service.is_configured:
        return
    persona = ""
    if attribution:
        path = str(attribution.get("landing_path") or attribution.get("ft_landing_path") or "")
        if "/for/" in path:
            persona = path.rstrip("/").split("/for/")[-1]
    try:
        resend.Contacts.create(
            {
                "email": email,
                "unsubscribed": False,
                "properties": {
                    "source": "verdict_email",
                    "persona": persona,
                },
            }
        )
    except Exception:
        logger.info("resend_contact_skipped email=%s", email)


@router.post("/verdict-email", response_model=VerdictEmailResponse)
async def capture_verdict_email(
    body: VerdictEmailRequest,
    request: Request,
    db: DbSession,
) -> VerdictEmailResponse:
    email = str(body.email).lower().strip()
    address = body.address.strip()
    await _enforce_hourly_limit("ip", _client_ip(request), PER_IP_PER_HOUR)
    await _enforce_hourly_limit("email", email, PER_EMAIL_PER_HOUR)

    existing = (
        await db.execute(
            select(VerdictLead).where(VerdictLead.email == email, VerdictLead.address == address)
        )
    ).scalar_one_or_none()
    if existing:
        return VerdictEmailResponse(ok=True, deduped=True)

    lead = VerdictLead(
        email=email,
        address=address,
        property_id=body.property_id,
        attribution=body.attribution or {},
        consent=body.consent,
    )
    db.add(lead)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return VerdictEmailResponse(ok=True, deduped=True)

    try:
        await email_service.send_verdict_email(
            to=email,
            address=address,
            income_value=body.income_value,
            target_buy=body.target_buy,
            deal_gap=body.deal_gap,
        )
    except Exception:
        logger.exception("verdict_email_send_failed")

    _upsert_resend_contact(email, body.attribution)

    attribution = body.attribution or {}
    fbc = body.fbc or fbc_from_fbclid(attribution.get("fbclid"))
    try:
        await send_capi_event(
            event_name="Lead",
            event_id=body.event_id or f"verdict-email-{lead.id}",
            event_source_url=request.headers.get("Referer"),
            email=email if body.consent else None,
            fbc=fbc,
            fbp=body.fbp,
            client_ip=_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            analytics_consent=body.consent,
        )
    except Exception:
        logger.exception("verdict_email_capi_failed")

    return VerdictEmailResponse(ok=True, deduped=False)


@router.post("/capi", response_model=CapiEventResponse)
async def mirror_capi_event(body: CapiEventRequest, request: Request) -> CapiEventResponse:
    """Browser → CAPI mirror so pixel and server share the same event_id."""
    if body.event_name not in CAPI_EVENTS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown event")
    await _enforce_hourly_limit("capi", _client_ip(request), 60)
    try:
        await send_capi_event(
            event_name=body.event_name,
            event_id=body.event_id,
            event_source_url=body.event_source_url or request.headers.get("Referer"),
            fbc=body.fbc,
            fbp=body.fbp,
            client_ip=_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            analytics_consent=body.analytics_consent,
        )
    except Exception:
        logger.exception("capi_mirror_failed")
    return CapiEventResponse(ok=True)
