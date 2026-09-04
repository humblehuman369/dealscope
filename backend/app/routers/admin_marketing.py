"""Admin API for the Marketing Ops Hub (``/api/v1/admin/marketing``).

Read side for the dashboard plus the human-only actions: approve, cancel and
edit queued posts, mark briefs reviewed. Requires ``admin:system``.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import DbSession, require_permission
from app.models.linkedin_post import LinkedInPost, LinkedInPostStatus
from app.models.marketing import BotRun, BriefStatus, MarketingBrief
from app.models.user import User
from app.models.x_post import XPost, XPostStatus
from app.schemas.marketing import (
    BlogPullRequest,
    BotHealth,
    BotRunOut,
    BriefOut,
    MarketingHealth,
    MarketingQueue,
    Scorecard,
    SourceHealth,
)
from app.services import marketing_service as svc
from app.services.linkedin_publisher import token_warnings
from app.services.x_publisher import x_configured
from app.tasks.heartbeat import evaluate_job_health

router = APIRouter(prefix="/marketing", tags=["Admin"])

ADMIN = Depends(require_permission("admin:system"))


def _actor(user: User) -> str:
    return user.email or user.full_name or str(user.id)


@router.get("/scorecard", response_model=Scorecard)
async def scorecard(
    db: DbSession,
    _admin: User = ADMIN,
    days: int = Query(7, ge=1, le=90),
):
    return await svc.build_scorecard(db, days=days)


@router.get("/queue", response_model=MarketingQueue)
async def queue(
    db: DbSession,
    _admin: User = ADMIN,
    status_filter: str | None = Query(None, alias="status"),
):
    li_stmt = select(LinkedInPost).order_by(LinkedInPost.scheduled_at)
    x_stmt = select(XPost).order_by(XPost.scheduled_at)
    if status_filter:
        try:
            li_stmt = li_stmt.where(LinkedInPost.status == LinkedInPostStatus(status_filter))
            x_stmt = x_stmt.where(XPost.status == XPostStatus(status_filter).value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown status: {status_filter}"
            ) from exc
    li_rows = (await db.execute(li_stmt)).scalars().all()
    x_rows = (await db.execute(x_stmt)).scalars().all()
    return MarketingQueue(linkedin=list(li_rows), x=list(x_rows))


@router.get("/briefs", response_model=list[BriefOut])
async def briefs(
    db: DbSession,
    _admin: User = ADMIN,
    limit: int = Query(14, ge=1, le=90),
):
    return await svc.list_briefs(db, limit=limit)


@router.post("/briefs/{brief_id}/review", response_model=BriefOut)
async def review_brief(brief_id: UUID, db: DbSession, admin_user: User = ADMIN):
    row = await db.get(MarketingBrief, brief_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    row.status = BriefStatus.REVIEWED.value
    row.reviewed_by = _actor(admin_user)
    row.reviewed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(row)
    return row


@router.get("/bot-runs", response_model=list[BotRunOut])
async def bot_runs(
    db: DbSession,
    _admin: User = ADMIN,
    limit: int = Query(30, ge=1, le=200),
):
    stmt = select(BotRun).order_by(BotRun.started_at.desc()).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


@router.get("/blog-prs", response_model=list[BlogPullRequest])
async def blog_prs(_admin: User = ADMIN):
    """Open ``bot/blog/*`` pull requests; merging one is the blog approval step."""
    prs, _warning = await svc.blog_prs()
    return prs


@router.get("/health", response_model=MarketingHealth)
async def health(db: DbSession, _admin: User = ADMIN):
    latest_runs = await svc.latest_run_per_bot(db)
    jobs = await evaluate_job_health()
    return MarketingHealth(
        linkedin_publish_enabled=settings.LINKEDIN_PUBLISH_ENABLED,
        linkedin_token_warnings=token_warnings(),
        x_publish_enabled=settings.X_PUBLISH_ENABLED,
        x_api_configured=x_configured(),
        bot_api_configured=bool(settings.MARKETING_BOT_TOKEN),
        posthog_pull_configured=bool(settings.POSTHOG_PERSONAL_API_KEY and settings.POSTHOG_PROJECT_ID),
        gsc_pull_configured=bool(settings.GSC_SERVICE_ACCOUNT_JSON and settings.GSC_SITE_URL),
        sources=[SourceHealth(**row) for row in await svc.source_health(db)],
        bots=[BotHealth(bot_name=run.bot_name, last_run=BotRunOut.model_validate(run)) for run in latest_runs],
        jobs={
            name: jobs["jobs"][name]
            for name in (
                "linkedin_publish",
                "x_publish",
                "marketing_metrics",
                "marketing_alerts",
                "marketing_weekly_rollup",
            )
            if name in jobs["jobs"]
        },
    )
