"""
Make It Work plans — narrative generation and email-first save.

Both endpoints are open to signed-out users (that is the point: the plan is the
free hook), so both are rate-limited per IP with the same Redis counter pattern
as the anonymous analysis quota. ``/claim`` is also limited per email.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.core.deps import DbSession, OptionalUser
from app.routers.auth import (
    _client_type_from_request,
    _ph_identify_and_capture,
    _set_auth_cookies,
)
from app.schemas.plans import (
    BreakevenNarrativeRequest,
    BreakevenNarrativeResponse,
    PlanClaimRequest,
    PlanClaimResponse,
    PlanNarrativeRequest,
    PlanNarrativeResponse,
)
from app.services import plan_claim_service
from app.services.cache_service import get_cache_service
from app.services.plan_narrative_service import generate_breakeven_narrative, generate_narrative

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/plans", tags=["plans"])

# Per-hour caps. Narrative is cheap when cached but each miss is a model call;
# claim sends an email, so it is tighter and also keyed by recipient.
NARRATIVE_PER_IP_PER_HOUR = 40
CLAIM_PER_IP_PER_HOUR = 10
CLAIM_PER_EMAIL_PER_HOUR = 3


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _enforce_hourly_limit(kind: str, identifier: str, limit: int) -> None:
    """Sliding hour bucket — raises 429 when ``limit`` is exceeded."""
    cache = get_cache_service()
    hour = datetime.now(UTC).strftime("%Y%m%d%H")
    key = f"plan_rl:{kind}:{identifier}:{hour}"
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


@router.post("/narrative", response_model=PlanNarrativeResponse)
async def plan_narrative(
    body: PlanNarrativeRequest,
    request: Request,
    current_user: OptionalUser = None,
) -> PlanNarrativeResponse:
    """Two-sentence summary + seller pitch for the chosen plan (AI with template fallback)."""
    await _enforce_hourly_limit("narrative", _client_ip(request), NARRATIVE_PER_IP_PER_HOUR)
    return await generate_narrative(body)


@router.post("/breakeven-narrative", response_model=BreakevenNarrativeResponse)
async def breakeven_narrative(
    body: BreakevenNarrativeRequest,
    request: Request,
    current_user: OptionalUser = None,
) -> BreakevenNarrativeResponse:
    """Overview + per-way recommendation + blend for the Breakeven Analysis section.

    Loaded lazily by the client on the first row expand, so anonymous page views
    never trigger a model call. Shares the narrative IP bucket.
    """
    await _enforce_hourly_limit("narrative", _client_ip(request), NARRATIVE_PER_IP_PER_HOUR)
    return await generate_breakeven_narrative(body)


@router.post(
    "/claim",
    response_model=PlanClaimResponse,
    status_code=status.HTTP_202_ACCEPTED,
    response_model_exclude_none=True,
)
async def plan_claim(
    body: PlanClaimRequest,
    request: Request,
    response: Response,
    db: DbSession,
    current_user: OptionalUser = None,
) -> PlanClaimResponse:
    """Save the plan for an email address and send a magic link.

    Always 202 with the same message — success, existing account, or internal
    failure look identical to the caller so the endpoint cannot enumerate emails.
    When the claim creates (or re-claims) an unverified account, this browser
    is also signed in so the worksheet opens without a second gate.
    """
    ip = _client_ip(request)
    await _enforce_hourly_limit("claim_ip", ip, CLAIM_PER_IP_PER_HOUR)
    await _enforce_hourly_limit("claim_email", body.email.lower(), CLAIM_PER_EMAIL_PER_HOUR)

    try:
        result = await plan_claim_service.claim_plan(
            db,
            body,
            ip_address=ip,
            user_agent=request.headers.get("User-Agent"),
            client_type=_client_type_from_request(request),
        )
    except Exception as exc:
        # Uniform response by design; the failure is still logged for operators.
        await db.rollback()
        logger.exception("Plan claim failed for %s: %s", body.address, exc)
        return PlanClaimResponse()

    if (
        current_user is None
        and result.session is not None
        and result.jwt_token is not None
    ):
        _set_auth_cookies(
            response,
            result.session.session_token,
            result.session.refresh_token,
            result.jwt_token,
            result.session.expires_at,
        )
        if result.created:
            _ph_identify_and_capture(result.user, "user_registered", {"signup_method": "make_it_work_plan"})
        _ph_identify_and_capture(result.user, "user_logged_in", {"login_method": "plan_claim"})
        return PlanClaimResponse(
            access_token=result.jwt_token,
            refresh_token=result.session.refresh_token,
        )

    return PlanClaimResponse()
