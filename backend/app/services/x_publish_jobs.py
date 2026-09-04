"""Cron-gated X publish run.

Selects due approved rows with FOR UPDATE SKIP LOCKED, transitions
approved -> publishing before any X write, persists each post id the moment
the API returns it, then publishing -> published | failed.

A row with ``x_post_id`` never has its head created again. A thread that
crashed mid-way resumes from ``len(published_ids) + 1``.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.x_post import XPost, XPostStatus
from app.schemas.x import XFailedRow, XPostPreview, XPublishResult
from app.services.x_batch import weighted_length
from app.services.x_publisher import (
    XAPIError,
    XAuthError,
    XClient,
    XRateLimitError,
    XUnknownPostState,
    build_post_payload,
    x_configured,
)
from app.tasks.heartbeat import with_heartbeat

logger = logging.getLogger(__name__)

MAX_POSTS_PER_RUN = 5
MAX_ATTEMPTS = 3
ERROR_MAX = 2000


def _clip_error(message: str) -> str:
    return message[:ERROR_MAX]


def _now() -> datetime:
    return datetime.now(UTC)


async def _due_rows(db: AsyncSession, now: datetime) -> list[XPost]:
    stmt = (
        select(XPost)
        .where(
            or_(
                # Crash repair: head already minted, finish the thread / mark published.
                (XPost.status == XPostStatus.PUBLISHING.value) & XPost.x_post_id.is_not(None),
                # Crash before the API call, or a normal due row.
                XPost.status.in_([XPostStatus.APPROVED.value, XPostStatus.PUBLISHING.value])
                & XPost.x_post_id.is_(None)
                & (XPost.attempts < MAX_ATTEMPTS)
                & (
                    (XPost.status == XPostStatus.PUBLISHING.value)
                    | (
                        (XPost.status == XPostStatus.APPROVED.value)
                        & XPost.approved_at.is_not(None)
                        & (XPost.scheduled_at <= now)
                    )
                ),
            )
        )
        .order_by(XPost.scheduled_at)
        .limit(MAX_POSTS_PER_RUN)
        .with_for_update(skip_locked=True)
    )
    return list((await db.execute(stmt)).scalars().all())


def preview_payloads(post: XPost) -> list[dict]:
    bodies: list[dict] = []
    parent: str | None = None
    for index, text in enumerate(post.thread_json, start=1):
        bodies.append(build_post_payload(text, in_reply_to=parent))
        parent = post.x_post_id if index == 1 and post.x_post_id else f"<id of post {index}>"
    return bodies


def preview_post(post: XPost) -> XPostPreview:
    return XPostPreview(
        key=post.key,
        dry_run=not settings.X_PUBLISH_ENABLED,
        request_bodies=preview_payloads(post),
        weighted_lengths=[weighted_length(t) for t in post.thread_json],
    )


async def _publish_thread(db: AsyncSession, post: XPost, client: XClient) -> None:
    """Post head then replies, persisting every id before moving on."""
    thread = list(post.thread_json)
    if not post.x_post_id:
        post.x_post_id = await client.create_post(build_post_payload(thread[0]))
        await db.commit()
    parent = post.published_ids[-1] if post.published_ids else post.x_post_id
    for text in thread[1 + len(post.published_ids) :]:
        reply_id = await client.create_post(build_post_payload(text, in_reply_to=parent))
        # New list so SQLAlchemy sees the JSONB change.
        post.published_ids = [*post.published_ids, reply_id]
        await db.commit()
        parent = reply_id


async def _publish_one(db: AsyncSession, post: XPost, *, client: XClient | None, dry_run: bool) -> None:
    if dry_run and not post.x_post_id:
        for payload in preview_payloads(post):
            logger.info("x dry-run would POST /2/tweets key=%s payload=%s", post.key, payload)
        return

    assert client is not None
    if post.status != XPostStatus.PUBLISHING.value:
        post.status = XPostStatus.PUBLISHING.value
    if not post.x_post_id:
        post.attempts = (post.attempts or 0) + 1
    post.error = None
    await db.commit()

    await _publish_thread(db, post, client)
    post.status = XPostStatus.PUBLISHED.value
    post.published_at = post.published_at or _now()
    await db.commit()


async def _revert_to_approved_or_failed(db: AsyncSession, post: XPost, error: str) -> None:
    post.error = _clip_error(error)
    if post.x_post_id:
        # Head is live; a partial thread stays ``publishing`` so the next tick resumes it,
        # unless we are out of attempts, in which case a human finishes it by hand.
        post.status = XPostStatus.FAILED.value if (post.attempts or 0) >= MAX_ATTEMPTS else XPostStatus.PUBLISHING.value
        post.attempts = (post.attempts or 0) + 1
    elif (post.attempts or 0) >= MAX_ATTEMPTS:
        post.status = XPostStatus.FAILED.value
    else:
        post.status = XPostStatus.APPROVED.value
    await db.commit()


async def _park_unknown_state(db: AsyncSession, post: XPost, error: str) -> None:
    """The create call may have landed. Park the row; a retry could double-post."""
    post.error = _clip_error(error)
    post.status = XPostStatus.FAILED.value
    post.attempts = MAX_ATTEMPTS
    await db.commit()


async def x_publish_job(db: AsyncSession) -> dict:
    now = _now()
    dry_run = not settings.X_PUBLISH_ENABLED
    warnings: list[str] = []
    published: list[str] = []
    failed: list[XFailedRow] = []

    rows = await _due_rows(db, now)
    if not rows:
        return XPublishResult(published=[], failed=[], dry_run=dry_run, warnings=warnings).model_dump()

    if not dry_run and not x_configured():
        warnings.append("X_PUBLISH_ENABLED is true but X credentials are not set; rows left approved")
        return XPublishResult(published=[], failed=[], dry_run=dry_run, warnings=warnings).model_dump()

    client: XClient | None = None
    try:
        if not dry_run:
            client = XClient()
            await client.__aenter__()

        for post in rows:
            if dry_run and post.x_post_id:
                # Flag flipped off mid-thread. Leave it for a live run; do not fake completion.
                warnings.append(f"{post.key}: partially published thread left as-is in dry run")
                continue
            try:
                await _publish_one(db, post, client=client, dry_run=dry_run)
            except XRateLimitError as exc:
                if not dry_run and not post.x_post_id:
                    post.status = XPostStatus.APPROVED.value
                    post.attempts = max(0, (post.attempts or 1) - 1)
                post.error = _clip_error(str(exc))
                await db.commit()
                warnings.append(str(exc))
                logger.warning("x publish stopped on 429 after %s", published)
                break
            except XUnknownPostState as exc:
                await _park_unknown_state(db, post, str(exc))
                failed.append(XFailedRow(key=post.key, error=str(exc)))
            except (XAuthError, XAPIError) as exc:
                await _revert_to_approved_or_failed(db, post, str(exc))
                failed.append(XFailedRow(key=post.key, error=str(exc)))
            else:
                published.append(post.key)
    finally:
        if client is not None:
            await client.__aexit__(None, None, None)

    return XPublishResult(published=published, failed=failed, dry_run=dry_run, warnings=warnings).model_dump()


run_x_publish = with_heartbeat("x_publish", x_publish_job)
