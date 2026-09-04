"""Cron-gated LinkedIn publish run.

Selects due approved rows with FOR UPDATE SKIP LOCKED, transitions
approved → publishing before any LinkedIn write, persists the post URN the
moment the API returns it, then publishing → published | failed.

A row that already has ``linkedin_post_urn`` is never created again.
"""

from __future__ import annotations

import enum
import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.core.config import settings
from app.models.linkedin_post import (
    LinkedInAccount,
    LinkedInPost,
    LinkedInPostStatus,
)
from app.schemas.linkedin import LinkedInFailedRow, LinkedInPublishResult
from app.services.linkedin_publisher import (
    LinkedInAPIError,
    LinkedInAuthError,
    LinkedInClient,
    LinkedInRateLimitError,
    LinkedInUnknownPostState,
    author_urn,
    build_post_payload,
    company_account_configured,
    token_warnings,
)
from app.tasks.heartbeat import with_heartbeat

logger = logging.getLogger(__name__)

MAX_POSTS_PER_RUN = 5
MAX_ATTEMPTS = 3
ERROR_MAX = 2000


class _PublishOneStatus(enum.StrEnum):
    PUBLISHED = "published"
    SKIPPED_WAITING_PARENT = "skipped_waiting_parent"


@dataclass(frozen=True)
class _PublishOneResult:
    status: _PublishOneStatus
    comment_error: str | None = None


def _clip_error(message: str) -> str:
    return message[:ERROR_MAX]


def _now() -> datetime:
    return datetime.now(UTC)


async def _due_rows(db: AsyncSession, now: datetime) -> list[LinkedInPost]:
    stmt = (
        select(LinkedInPost)
        .options(undefer(LinkedInPost.media_bytes))
        .where(
            or_(
                # Crash repair: URN already minted, never create a second post.
                (LinkedInPost.status == LinkedInPostStatus.PUBLISHING)
                & LinkedInPost.linkedin_post_urn.is_not(None),
                # Crash before the API call, or a normal due row.
                (
                    LinkedInPost.status.in_(
                        [LinkedInPostStatus.APPROVED, LinkedInPostStatus.PUBLISHING]
                    )
                )
                & LinkedInPost.linkedin_post_urn.is_(None)
                & (LinkedInPost.attempts < MAX_ATTEMPTS)
                & (
                    (LinkedInPost.status == LinkedInPostStatus.PUBLISHING)
                    | (
                        (LinkedInPost.status == LinkedInPostStatus.APPROVED)
                        & LinkedInPost.approved_at.is_not(None)
                        & (LinkedInPost.scheduled_at <= now)
                    )
                ),
            )
        )
        .order_by(LinkedInPost.scheduled_at)
        .limit(MAX_POSTS_PER_RUN)
        .with_for_update(skip_locked=True)
    )
    return list((await db.execute(stmt)).scalars().all())


async def _parent_urn(db: AsyncSession, reshare_of_key: str) -> str | None:
    parent = (
        await db.execute(select(LinkedInPost).where(LinkedInPost.key == reshare_of_key))
    ).scalar_one_or_none()
    if parent is None or parent.status != LinkedInPostStatus.PUBLISHED:
        return None
    return parent.linkedin_post_urn


def _preview_payload(post: LinkedInPost, parent_urn: str | None) -> dict:
    try:
        author = author_urn(post.account)
    except LinkedInAuthError:
        author = f"<{post.account.value} urn unset>"
    media_placeholder = None
    if post.media_type.value != "none":
        media_placeholder = f"<upload {post.media_type.value} {post.media_path or ''}>"
    return build_post_payload(
        post,
        author=author,
        media_urn=media_placeholder,
        parent_urn=parent_urn,
    )


async def preview_post(db: AsyncSession, post: LinkedInPost) -> dict:
    parent_urn = None
    if post.reshare_of_key:
        parent_urn = await _parent_urn(db, post.reshare_of_key)
        if parent_urn is None:
            parent_urn = f"<pending parent {post.reshare_of_key}>"
    try:
        author = author_urn(post.account)
    except LinkedInAuthError:
        author = f"<{post.account.value} urn unset>"
    media = None
    if post.media_type.value != "none":
        media = {
            "media_type": post.media_type.value,
            "media_path": post.media_path,
            "media_alt_text": post.media_alt_text,
            "document_title": post.document_title,
            "has_bytes": post.media_bytes is not None,
        }
    return {
        "key": post.key,
        "account": post.account.value,
        "author": author,
        "dry_run": not settings.LINKEDIN_PUBLISH_ENABLED,
        "request_body": _preview_payload(post, parent_urn),
        "first_comment": post.first_comment,
        "media": media,
    }


async def _repair_published(db: AsyncSession, post: LinkedInPost, client: LinkedInClient | None) -> str | None:
    """Mark a URN-bearing publishing row published. Optionally retry the comment."""
    post.status = LinkedInPostStatus.PUBLISHED
    post.published_at = post.published_at or _now()
    comment_error = None
    if post.first_comment and not post.linkedin_comment_urn and client is not None:
        try:
            post.linkedin_comment_urn = await client.create_comment(
                post.account, post.linkedin_post_urn or "", post.first_comment
            )
        except (LinkedInAPIError, LinkedInAuthError) as exc:
            comment_error = _clip_error(f"comment failed: {exc}")
            post.error = comment_error
        except LinkedInRateLimitError:
            await db.commit()
            raise
    await db.commit()
    return comment_error


async def _publish_one(
    db: AsyncSession,
    post: LinkedInPost,
    *,
    client: LinkedInClient | None,
    dry_run: bool,
) -> _PublishOneResult:
    """Publish one row. Never returns PUBLISHED unless the post actually went out
    (or would have, in dry run) — a missing parent is SKIPPED_WAITING_PARENT."""
    if post.linkedin_post_urn:
        comment_error = await _repair_published(db, post, None if dry_run else client)
        return _PublishOneResult(_PublishOneStatus.PUBLISHED, comment_error)

    if post.reshare_of_key:
        parent_urn = await _parent_urn(db, post.reshare_of_key)
        if not parent_urn:
            return _PublishOneResult(_PublishOneStatus.SKIPPED_WAITING_PARENT)

    if post.account == LinkedInAccount.COMPANY and not company_account_configured():
        raise LinkedInAuthError("company account is not configured")

    if dry_run:
        parent_urn = await _parent_urn(db, post.reshare_of_key) if post.reshare_of_key else None
        payload = _preview_payload(post, parent_urn)
        logger.info("linkedin dry-run would POST /rest/posts key=%s payload=%s", post.key, payload)
        if post.first_comment:
            logger.info("linkedin dry-run would comment on %s: %s", post.key, post.first_comment)
        return _PublishOneResult(_PublishOneStatus.PUBLISHED)

    assert client is not None
    await client.ensure_fresh_token(post.account)
    author = author_urn(post.account)

    if post.status != LinkedInPostStatus.PUBLISHING:
        post.status = LinkedInPostStatus.PUBLISHING
    post.attempts = (post.attempts or 0) + 1
    post.error = None
    await db.commit()

    parent_urn = await _parent_urn(db, post.reshare_of_key) if post.reshare_of_key else None
    if post.reshare_of_key and not parent_urn:
        post.status = LinkedInPostStatus.APPROVED
        post.attempts = max(0, (post.attempts or 1) - 1)
        await db.commit()
        return _PublishOneResult(_PublishOneStatus.SKIPPED_WAITING_PARENT)

    media_urn = await client.upload_media(post, author)
    payload = build_post_payload(post, author=author, media_urn=media_urn, parent_urn=parent_urn)
    urn = await client.create_post(post.account, payload)
    # Persist the URN before any other write so a crash cannot double-post.
    post.linkedin_post_urn = urn
    await db.commit()

    post.status = LinkedInPostStatus.PUBLISHED
    post.published_at = _now()
    comment_error = None
    if post.first_comment:
        try:
            post.linkedin_comment_urn = await client.create_comment(
                post.account, urn, post.first_comment
            )
        except LinkedInRateLimitError:
            await db.commit()
            raise
        except (LinkedInAPIError, LinkedInAuthError) as exc:
            comment_error = _clip_error(f"comment failed: {exc}")
            post.error = comment_error
    await db.commit()
    return _PublishOneResult(_PublishOneStatus.PUBLISHED, comment_error)


async def _revert_to_approved_or_failed(db: AsyncSession, post: LinkedInPost, error: str) -> None:
    post.error = _clip_error(error)
    if post.linkedin_post_urn:
        post.status = LinkedInPostStatus.PUBLISHED
        post.published_at = post.published_at or _now()
    elif (post.attempts or 0) >= MAX_ATTEMPTS:
        post.status = LinkedInPostStatus.FAILED
    else:
        post.status = LinkedInPostStatus.APPROVED
    await db.commit()


async def _park_unknown_state(db: AsyncSession, post: LinkedInPost, error: str) -> None:
    """The create call may have landed. Park the row; a retry could double-post."""
    post.error = _clip_error(error)
    post.status = LinkedInPostStatus.FAILED
    post.attempts = MAX_ATTEMPTS
    await db.commit()


async def linkedin_publish_job(db: AsyncSession) -> dict:
    now = _now()
    dry_run = not settings.LINKEDIN_PUBLISH_ENABLED
    warnings = token_warnings(now=now)
    published: list[str] = []
    skipped_waiting_parent: list[str] = []
    failed: list[LinkedInFailedRow] = []

    rows = await _due_rows(db, now)
    if not rows:
        result = LinkedInPublishResult(
            published=[],
            skipped_waiting_parent=[],
            failed=[],
            dry_run=dry_run,
            token_warnings=warnings,
        )
        return result.model_dump()

    client: LinkedInClient | None = None
    try:
        if not dry_run:
            client = LinkedInClient()
            await client.__aenter__()

        for post in rows:
            if post.account == LinkedInAccount.COMPANY and not company_account_configured():
                logger.info("skipping %s: company account not configured", post.key)
                warnings.append(f"{post.key}: company account not configured; left approved")
                continue
            try:
                one = await _publish_one(db, post, client=client, dry_run=dry_run)
            except LinkedInRateLimitError as exc:
                if not dry_run and not post.linkedin_post_urn:
                    post.status = LinkedInPostStatus.APPROVED
                    if post.attempts:
                        post.attempts = max(0, post.attempts - 1)
                    post.error = _clip_error(str(exc))
                    await db.commit()
                warnings.append(str(exc))
                logger.warning("linkedin publish stopped on 429 after %s", published)
                break
            except LinkedInAuthError as exc:
                await _revert_to_approved_or_failed(db, post, str(exc))
                failed.append(LinkedInFailedRow(key=post.key, error=str(exc)))
            except LinkedInUnknownPostState as exc:
                await _park_unknown_state(db, post, str(exc))
                failed.append(LinkedInFailedRow(key=post.key, error=str(exc)))
            except LinkedInAPIError as exc:
                await _revert_to_approved_or_failed(db, post, str(exc))
                failed.append(LinkedInFailedRow(key=post.key, error=str(exc)))
            else:
                match one.status:
                    case _PublishOneStatus.SKIPPED_WAITING_PARENT:
                        skipped_waiting_parent.append(post.key)
                    case _PublishOneStatus.PUBLISHED:
                        published.append(post.key)
                        if one.comment_error:
                            failed.append(
                                LinkedInFailedRow(key=post.key, error=one.comment_error)
                            )
    finally:
        if client is not None:
            await client.__aexit__(None, None, None)

    result = LinkedInPublishResult(
        published=published,
        skipped_waiting_parent=skipped_waiting_parent,
        failed=failed,
        dry_run=dry_run,
        token_warnings=warnings,
    )
    return result.model_dump()


run_linkedin_publish = with_heartbeat("linkedin_publish", linkedin_publish_job)
