"""
Bulk analyze router — rank selected map pins by Deal Gap.

Authenticated but not plan-gated: the monthly analysis quota *is* the gate.
A free user can bulk-analyze up to their remaining allowance and is told
plainly when it runs out, which is a far better upgrade prompt than a locked
button, because by then they have seen the ranked list working.
"""

import logging

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.schemas.bulk_analyze import BulkAnalyzeRequest, BulkAnalyzeResponse
from app.services.bulk_analyze_service import analyze_queue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/map", tags=["Bulk Analyze"])


@router.post(
    "/bulk-analyze",
    response_model=BulkAnalyzeResponse,
    summary="Analyze a queue of addresses and rank them by Deal Gap",
)
async def bulk_analyze(
    request: BulkAnalyzeRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """Drain as much of the queue as fits the run's time budget.

    Resubmit ``remaining`` to continue. Properties analyzed in the last 30
    days are re-ranked without consuming quota.
    """
    results, remaining, charged, quota_exhausted, notice = await analyze_queue(
        db, current_user, request.addresses
    )

    logger.info(
        "Bulk analyze for user %s: %d queued, %d ranked, %d charged, %d remaining",
        current_user.id,
        len(request.addresses),
        len(results),
        charged,
        len(remaining),
    )

    return BulkAnalyzeResponse(
        results=results,
        remaining=remaining,
        analyses_charged=charged,
        quota_exhausted=quota_exhausted,
        notice=notice,
    )
