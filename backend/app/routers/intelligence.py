"""Public Investor Intelligence endpoints (newsletter capture)."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.deps import DbSession
from app.models.intelligence_subscriber import IntelligenceSubscriber
from app.schemas.intelligence import IntelligenceSubscribeRequest, IntelligenceSubscribeResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Investor Intelligence"])

ALLOWED_INVESTOR_TYPES = {
    "SFR",
    "Flipper",
    "Multifamily",
    "Broker / Agent",
    "Lender",
    "Other",
}


@router.post(
    "/api/v1/intelligence/subscribe",
    response_model=IntelligenceSubscribeResponse,
    summary="Subscribe to DealGapIQ Investor Intelligence",
)
async def subscribe_intelligence(
    payload: IntelligenceSubscribeRequest,
    db: DbSession,
):
    """Capture an Investor Intelligence newsletter signup.

    Repeat submissions for the same email succeed and refresh optional fields.
    """
    email = str(payload.email).strip().lower()
    investor_type = payload.investor_type if payload.investor_type in ALLOWED_INVESTOR_TYPES else None
    now = datetime.now(UTC)
    source = (payload.source or "investor-intelligence")[:100]
    placement = (payload.placement[:120] if payload.placement else None)

    stmt = (
        pg_insert(IntelligenceSubscriber)
        .values(
            id=uuid.uuid4(),
            email=email,
            investor_type=investor_type,
            source=source,
            placement=placement,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_update(
            constraint="uq_intelligence_subscribers_email",
            set_={
                "investor_type": investor_type,
                "source": source,
                "placement": placement,
                "updated_at": now,
            },
        )
    )
    await db.execute(stmt)
    await db.commit()
    logger.info("Investor Intelligence signup email=%s placement=%s", email, payload.placement)
    return IntelligenceSubscribeResponse(ok=True)
