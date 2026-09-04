"""
Make It Work plans — narrative generation and email-first save.

Both endpoints are open to signed-out users (that is the point: the plan is the
free hook), so both are rate-limited per IP with the same Redis counter pattern
as the anonymous analysis quota. ``/claim`` is also limited per email.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status

from app.core.deps import DbSession, OptionalUser
from app.schemas.plans import (
    PlanClaimRequest,
    PlanClaimResponse,
    PlanNarrativeRequest,
    PlanNarrativeResponse,
)
from app.services import plan_claim_service
from app.services.cache_service import get_cache_service
from app.services.plan_narrative_service import generate_narrative

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


@router.post("/claim", response_model=PlanClaimResponse, status_code=status.HTTP_202_ACCEPTED)
async def plan_claim(
    body: PlanClaimRequest,
    request: Request,
    db: DbSession,
    current_user: OptionalUser = None,
) -> PlanClaimResponse:
    """Save the plan for an email address and send a magic link.

    Always 202 with the same body — success, existing account, or internal
    failure look identical to the caller so the endpoint cannot enumerate emails.
    """
    ip = _client_ip(request)
    await _enforce_hourly_limit("claim_ip", ip, CLAIM_PER_IP_PER_HOUR)
    await _enforce_hourly_limit("claim_email", body.email.lower(), CLAIM_PER_EMAIL_PER_HOUR)

    try:
        await plan_claim_service.claim_plan(db, body, ip_address=ip)
    except Exception as exc:
        # Uniform response by design; the failure is still logged for operators.
        await db.rollback()
        logger.exception("Plan claim failed for %s: %s", body.address, exc)

    return PlanClaimResponse()
