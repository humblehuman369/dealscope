"""Admin API for the LinkedIn publish queue. Consumed by /admin/marketing."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import undefer

from app.core.deps import DbSession, require_permission
from app.models.linkedin_post import LinkedInPost, LinkedInPostStatus
from app.models.user import User
from app.schemas.linkedin import LinkedInPostOut, LinkedInPostPreview
from app.schemas.marketing import LinkedInPostEdit
from app.services.linkedin_batch import LINKEDIN_BODY_MAX
from app.services.linkedin_publish_jobs import preview_post

router = APIRouter(prefix="/linkedin", tags=["Admin"])


def _approved_by(user: User) -> str:
    return user.email or user.full_name or str(user.id)


@router.get("/posts", response_model=list[LinkedInPostOut])
async def list_linkedin_posts(
    db: DbSession,
    _admin: User = Depends(require_permission("admin:system")),
    batch: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
):
    stmt = select(LinkedInPost).order_by(LinkedInPost.scheduled_at)
    if batch:
        stmt = stmt.where(LinkedInPost.batch == batch)
    if status_filter:
        try:
            stmt = stmt.where(LinkedInPost.status == LinkedInPostStatus(status_filter))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown status: {status_filter}",
            ) from exc
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.get("/posts/{post_id}/preview", response_model=LinkedInPostPreview)
async def preview_linkedin_post(
    post_id: UUID,
    db: DbSession,
    _admin: User = Depends(require_permission("admin:system")),
):
    row = (
        await db.execute(
            select(LinkedInPost)
            .options(undefer(LinkedInPost.media_bytes))
            .where(LinkedInPost.id == post_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return await preview_post(db, row)


@router.post("/posts/{post_id}/approve", response_model=LinkedInPostOut)
async def approve_linkedin_post(
    post_id: UUID,
    db: DbSession,
    admin_user: User = Depends(require_permission("admin:system")),
):
    row = await db.get(LinkedInPost, post_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if row.status == LinkedInPostStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Published rows cannot be re-approved",
        )
    if row.status == LinkedInPostStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cancelled rows cannot be approved",
        )
    row.status = LinkedInPostStatus.APPROVED
    row.approved_by = _approved_by(admin_user)
    row.approved_at = datetime.now(UTC)
    row.error = None
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/posts/{post_id}", response_model=LinkedInPostOut)
async def edit_linkedin_post(
    post_id: UUID,
    payload: LinkedInPostEdit,
    db: DbSession,
    _admin: User = Depends(require_permission("admin:system")),
):
    """Edit body, first comment, or schedule. Only draft/approved rows are editable."""
    row = await db.get(LinkedInPost, post_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if row.status not in (LinkedInPostStatus.DRAFT, LinkedInPostStatus.APPROVED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{row.status.value} rows cannot be edited",
        )
    if payload.body is not None:
        if len(payload.body) > LINKEDIN_BODY_MAX:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"body is {len(payload.body)} chars; LinkedIn limit is {LINKEDIN_BODY_MAX}",
            )
        row.body = payload.body
    if payload.first_comment is not None:
        if "utm_source=linkedin" not in payload.first_comment:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="first_comment must include utm_source=linkedin",
            )
        row.first_comment = payload.first_comment
    if payload.scheduled_at is not None:
        row.scheduled_at = payload.scheduled_at
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/posts/{post_id}/cancel", response_model=LinkedInPostOut)
async def cancel_linkedin_post(
    post_id: UUID,
    db: DbSession,
    admin_user: User = Depends(require_permission("admin:system")),
):
    row = await db.get(LinkedInPost, post_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if row.status == LinkedInPostStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Published rows cannot be cancelled",
        )
    row.status = LinkedInPostStatus.CANCELLED
    row.approved_by = row.approved_by or _approved_by(admin_user)
    await db.commit()
    await db.refresh(row)
    return row
