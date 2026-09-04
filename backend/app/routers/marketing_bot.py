"""Draft-only API for Grok Bots (``X-Bot-Token``).

Bots can read context, record runs, write metric snapshots and briefs, and
queue text-only LinkedIn and X drafts. There is deliberately no approve, cancel,
edit, or publish here — those live on admin JWTs in ``admin_marketing.py``.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.core.bot_auth import require_bot_token
from app.core.deps import DbSession
from app.models.linkedin_post import LinkedInPost, LinkedInPostStatus
from app.models.marketing import BotRun, BotRunStatus, MetricSource
from app.models.x_post import XPost, XPostStatus
from app.schemas.marketing import (
    BotContext,
    BotRunCreate,
    BotRunFinish,
    BotRunOut,
    BriefIn,
    BriefOut,
    DraftChange,
    DraftImportResult,
    LinkedInDraftBatch,
    MetricPoint,
    MetricSnapshotBatch,
    MetricUpsertResult,
    QueueCounts,
    XDraftBatch,
)
from app.services import marketing_service as svc
from app.services.linkedin_batch import BatchValidationError, import_batch, parse_batch_data
from app.services.x_batch import import_x_batch, parse_x_batch

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/marketing/bot",
    tags=["Marketing Bot"],
    dependencies=[Depends(require_bot_token)],
)

BOT_DRAFT_CREATOR = "bot"
# Media is disallowed on bot drafts, so the parser never resolves a path here.
NO_MEDIA_DIR = Path("/nonexistent-bot-media")


def _bot_identity(run: BotRun | None) -> str:
    return f"bot:{run.bot_name}" if run is not None else BOT_DRAFT_CREATOR


async def _run_or_404(db, run_id: UUID | None) -> BotRun | None:
    if run_id is None:
        return None
    run = await db.get(BotRun, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown run_id")
    return run


@router.get("/context", response_model=BotContext)
async def bot_context(db: DbSession):
    """Everything a bot needs to plan a day without repo or DB access."""
    since = (datetime.now(UTC) - timedelta(days=28)).date()
    metrics = await svc.metrics_since(db, since)
    brief = await svc.latest_brief(db)
    inventory, inventory_warning = await svc.blog_inventory()
    prs, prs_warning = await svc.blog_prs()
    warnings = [w for w in (inventory_warning, prs_warning) if w]
    return BotContext(
        generated_at=datetime.now(UTC),
        metrics_28d=[MetricPoint.model_validate(row) for row in metrics],
        queue=QueueCounts(linkedin=await svc.linkedin_queue_counts(db), x=await svc.x_queue_counts(db)),
        recent_linkedin_keys=await svc.recent_linkedin_keys(db),
        recent_x_keys=await svc.recent_x_keys(db),
        latest_brief=BriefOut.model_validate(brief) if brief else None,
        blog_inventory=inventory,
        open_blog_prs=prs,
        warnings=warnings,
    )


@router.post("/runs", response_model=BotRunOut, status_code=status.HTTP_201_CREATED)
async def start_run(payload: BotRunCreate, db: DbSession):
    return await svc.start_run(db, bot_name=payload.bot_name, routine=payload.routine)


@router.patch("/runs/{run_id}", response_model=BotRunOut)
async def finish_run(run_id: UUID, payload: BotRunFinish, db: DbSession):
    run = await _run_or_404(db, run_id)
    assert run is not None
    if run.status != BotRunStatus.RUNNING.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Run already finished")
    return await svc.finish_run(db, run, status=payload.status, summary=payload.summary, error=payload.error)


@router.post("/metrics", response_model=MetricUpsertResult)
async def write_metrics(payload: MetricSnapshotBatch, db: DbSession):
    """Bulk upsert. Source is always ``bot_capture`` regardless of what the bot claims."""
    run = await _run_or_404(db, payload.run_id)
    return await svc.upsert_metrics(
        db,
        payload.snapshots,
        source=MetricSource.BOT_CAPTURE,
        run_id=run.id if run else None,
    )


@router.post("/briefs", response_model=BriefOut, status_code=status.HTTP_201_CREATED)
async def write_brief(payload: BriefIn, db: DbSession):
    run = await _run_or_404(db, payload.run_id)
    try:
        return await svc.upsert_brief(db, payload, created_by=_bot_identity(run))
    except svc.BriefLocked as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/linkedin-drafts", response_model=DraftImportResult, status_code=status.HTTP_201_CREATED)
async def write_linkedin_drafts(payload: LinkedInDraftBatch, db: DbSession):
    """Queue text-only LinkedIn drafts. Same validation as a YAML import.

    Existing rows that are no longer ``draft`` are never overwritten: a human
    may have approved or edited them.
    """
    run = await _run_or_404(db, payload.run_id)
    batch_name = payload.batch or f"bot-{datetime.now(UTC).date().isoformat()}"

    raw = {
        "batch": batch_name,
        "timezone": payload.timezone,
        "posts": [
            {
                "key": post.key,
                "account": post.account,
                "scheduled_at": post.scheduled_at,
                "media_type": "none",
                "body": post.body,
                "first_comment": post.first_comment,
                "reshare_of_key": post.reshare_of_key,
            }
            for post in payload.posts
        ],
    }
    try:
        # source_dir is irrelevant for text-only posts; media is forced off above.
        parsed = parse_batch_data(raw, source_dir=NO_MEDIA_DIR)
    except BatchValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": exc.errors},
        ) from exc

    keys = [post.key for post in parsed.posts]
    locked = (
        (
            await db.execute(
                select(LinkedInPost.key).where(
                    LinkedInPost.key.in_(keys),
                    LinkedInPost.status != LinkedInPostStatus.DRAFT,
                )
            )
        )
        .scalars()
        .all()
    )
    if locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"locked_keys": sorted(locked), "message": "rows are no longer draft; pick new keys"},
        )

    changes = await import_batch(db, parsed, created_by=_bot_identity(run))
    return DraftImportResult(
        batch=batch_name,
        changes=[DraftChange(key=c.key, action=c.action, status=c.status) for c in changes],
    )


@router.post("/x-drafts", response_model=DraftImportResult, status_code=status.HTTP_201_CREATED)
async def write_x_drafts(payload: XDraftBatch, db: DbSession):
    """Queue text-only X posts/threads. Rows land as ``draft``; non-draft rows are never overwritten."""
    run = await _run_or_404(db, payload.run_id)
    batch_name = payload.batch or f"bot-{datetime.now(UTC).date().isoformat()}"

    raw = {
        "batch": batch_name,
        "timezone": payload.timezone,
        "posts": [
            {"key": post.key, "scheduled_at": post.scheduled_at, "thread": post.thread} for post in payload.posts
        ],
    }
    try:
        parsed = parse_x_batch(raw)
    except BatchValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": exc.errors},
        ) from exc

    keys = [post.key for post in parsed.posts]
    locked = (
        (await db.execute(select(XPost.key).where(XPost.key.in_(keys), XPost.status != XPostStatus.DRAFT.value)))
        .scalars()
        .all()
    )
    if locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"locked_keys": sorted(locked), "message": "rows are no longer draft; pick new keys"},
        )

    changes = await import_x_batch(db, parsed, created_by=_bot_identity(run))
    return DraftImportResult(
        batch=batch_name,
        changes=[DraftChange(key=c.key, action=c.action, status=c.status) for c in changes],
    )
