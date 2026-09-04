"""Admin API for the X publish queue. Consumed by /admin/marketing."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.core.deps import DbSession, require_permission
from app.models.user import User
from app.models.x_post import XPost, XPostStatus
from app.schemas.x import XPostEdit, XPostOut, XPostPreview
from app.services.x_batch import validate_thread
from app.services.x_publish_jobs import preview_post

router = APIRouter(prefix="/x", tags=["Admin"])

ADMIN = Depends(require_permission("admin:system"))


def _actor(user: User) -> str:
    return user.email or user.full_name or str(user.id)


async def _row_or_404(db, post_id: UUID) -> XPost:
    row = await db.get(XPost, post_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return row


@router.get("/posts", response_model=list[XPostOut])
async def list_x_posts(
    db: DbSession,
    _admin: User = ADMIN,
    batch: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
):
    stmt = select(XPost).order_by(XPost.scheduled_at)
    if batch:
        stmt = stmt.where(XPost.batch == batch)
    if status_filter:
        try:
            stmt = stmt.where(XPost.status == XPostStatus(status_filter).value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown status: {status_filter}"
            ) from exc
    return list((await db.execute(stmt)).scalars().all())


@router.get("/posts/{post_id}/preview", response_model=XPostPreview)
async def preview_x_post(post_id: UUID, db: DbSession, _admin: User = ADMIN):
    return preview_post(await _row_or_404(db, post_id))


@router.post("/posts/{post_id}/approve", response_model=XPostOut)
async def approve_x_post(post_id: UUID, db: DbSession, admin_user: User = ADMIN):
    row = await _row_or_404(db, post_id)
    if row.status == XPostStatus.PUBLISHED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Published rows cannot be re-approved")
    if row.status == XPostStatus.CANCELLED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cancelled rows cannot be approved")
    row.status = XPostStatus.APPROVED.value
    row.approved_by = _actor(admin_user)
    row.approved_at = datetime.now(UTC)
    row.error = None
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/posts/{post_id}", response_model=XPostOut)
async def edit_x_post(post_id: UUID, payload: XPostEdit, db: DbSession, _admin: User = ADMIN):
    """Replace the thread or reschedule. Only draft/approved rows are editable."""
    row = await _row_or_404(db, post_id)
    if row.status not in (XPostStatus.DRAFT.value, XPostStatus.APPROVED.value):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{row.status} rows cannot be edited")
    if payload.thread is not None:
        errors = validate_thread(payload.thread, prefix=row.key)
        if errors:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"errors": errors})
        row.thread_json = list(payload.thread)
    if payload.scheduled_at is not None:
        row.scheduled_at = payload.scheduled_at
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/posts/{post_id}/cancel", response_model=XPostOut)
async def cancel_x_post(post_id: UUID, db: DbSession, admin_user: User = ADMIN):
    row = await _row_or_404(db, post_id)
    if row.status == XPostStatus.PUBLISHED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Published rows cannot be cancelled")
    if row.x_post_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Head post is already live on X; finish or delete it there, do not cancel here",
        )
    row.status = XPostStatus.CANCELLED.value
    row.approved_by = row.approved_by or _actor(admin_user)
    await db.commit()
    await db.refresh(row)
    return row
