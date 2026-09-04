"""Validate and upsert X (Twitter) thread drafts.

Same contract as ``linkedin_batch``: copy is never rewritten, validation
rejects the batch, re-import is upsert-by-key and never touches ``published``
rows. X has no media path here; threads are text only.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.x_post import XPost, XPostStatus
from app.services.linkedin_batch import (
    HASHTAG_TAXONOMY,
    BatchValidationError,
    ImportChange,
    hashtags_on_last_line,
)

X_POST_MAX = 280
X_THREAD_MAX = 5
X_HASHTAGS_MAX = 2
# X wraps every URL in t.co and counts it as 23 characters regardless of length.
X_URL_WEIGHT = 23
_URL_RE = re.compile(r"https?://\S+")
_SITE_HOST = "dealgapiq.com"


def weighted_length(text: str) -> int:
    """Character count the way X meters it: each URL counts as 23."""
    urls = _URL_RE.findall(text)
    stripped = _URL_RE.sub("", text)
    return len(stripped) + X_URL_WEIGHT * len(urls)


def has_url(text: str) -> bool:
    return bool(_URL_RE.search(text))


@dataclass
class ParsedXPost:
    key: str
    scheduled_at: datetime
    thread: list[str]


@dataclass
class ParsedXBatch:
    batch: str
    timezone: str
    posts: list[ParsedXPost]


def validate_thread(thread: list[str], *, prefix: str) -> list[str]:
    """Per-thread rules. Returns error strings; empty means valid."""
    errors: list[str] = []
    if not thread:
        return [f"{prefix}: thread must have at least one post"]
    if len(thread) > X_THREAD_MAX:
        errors.append(f"{prefix}: thread has {len(thread)} posts; max is {X_THREAD_MAX}")
    for index, text in enumerate(thread):
        item = f"{prefix}[{index}]"
        if not isinstance(text, str) or not text.strip():
            errors.append(f"{item}: post text is required")
            continue
        length = weighted_length(text)
        if length > X_POST_MAX:
            errors.append(f"{item}: {length} weighted chars; X limit is {X_POST_MAX}")
        tags = hashtags_on_last_line(text)
        if len(tags) > X_HASHTAGS_MAX:
            errors.append(f"{item}: {len(tags)} hashtags on the last line; max is {X_HASHTAGS_MAX}")
        unknown = [t for t in tags if t not in HASHTAG_TAXONOMY]
        if unknown:
            errors.append(f"{item}: hashtag(s) not in blueprint taxonomy: {', '.join(unknown)}")
        for url in _URL_RE.findall(text):
            if _SITE_HOST in url and "utm_source=x" not in url:
                errors.append(f"{item}: {_SITE_HOST} links must include utm_source=x")
    return errors


def parse_x_batch(raw: dict[str, Any]) -> ParsedXBatch:
    errors: list[str] = []
    batch_name = str(raw.get("batch") or "").strip()
    if not batch_name:
        errors.append("batch is required")
    tz_name = str(raw.get("timezone") or "America/New_York")
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        errors.append(f"unknown timezone: {tz_name}")
        tz = ZoneInfo("UTC")

    posts_raw = raw.get("posts")
    if not isinstance(posts_raw, list) or not posts_raw:
        errors.append("posts must be a non-empty list")
        raise BatchValidationError(errors)

    parsed: list[ParsedXPost] = []
    seen: set[str] = set()
    for index, item in enumerate(posts_raw):
        if not isinstance(item, dict):
            errors.append(f"posts[{index}] must be a mapping")
            continue
        short_key = str(item.get("key") or "").strip()
        prefix = short_key or f"posts[{index}]"
        if not short_key:
            errors.append(f"posts[{index}].key is required")
            continue
        if short_key in seen:
            errors.append(f"{prefix}: duplicate key in batch")
        seen.add(short_key)
        full_key = f"{batch_name}/{short_key}" if batch_name else short_key

        scheduled_raw = str(item.get("scheduled_at") or "").strip()
        scheduled_at: datetime | None = None
        if not scheduled_raw:
            errors.append(f"{prefix}: scheduled_at is required")
        else:
            try:
                scheduled_at = datetime.strptime(scheduled_raw, "%Y-%m-%d %H:%M").replace(tzinfo=tz)
            except ValueError:
                errors.append(f"{prefix}: scheduled_at must be 'YYYY-MM-DD HH:MM' in {tz_name}")

        thread_raw = item.get("thread")
        if isinstance(thread_raw, str):
            thread_raw = [thread_raw]
        if not isinstance(thread_raw, list):
            errors.append(f"{prefix}: thread must be a list of post bodies")
            continue
        thread = [str(t) for t in thread_raw]
        errors.extend(validate_thread(thread, prefix=prefix))

        if scheduled_at is None:
            continue
        parsed.append(ParsedXPost(key=full_key, scheduled_at=scheduled_at, thread=thread))

    if errors:
        raise BatchValidationError(errors)
    return ParsedXBatch(batch=batch_name, timezone=tz_name, posts=parsed)


async def import_x_batch(
    db: AsyncSession,
    parsed: ParsedXBatch,
    *,
    created_by: str = "human",
) -> list[ImportChange]:
    changes: list[ImportChange] = []
    existing = (await db.execute(select(XPost).where(XPost.batch == parsed.batch))).scalars().all()
    by_key = {row.key: row for row in existing}

    for item in parsed.posts:
        row = by_key.get(item.key)
        if row is None:
            db.add(
                XPost(
                    batch=parsed.batch,
                    key=item.key,
                    scheduled_at=item.scheduled_at,
                    thread_json=item.thread,
                    status=XPostStatus.DRAFT.value,
                    created_by=created_by,
                )
            )
            changes.append(ImportChange(key=item.key, action="inserted", status="draft"))
            continue
        if row.status == XPostStatus.PUBLISHED:
            changes.append(ImportChange(key=item.key, action="skipped_published", status="published"))
            continue
        before = (row.scheduled_at, list(row.thread_json))
        row.scheduled_at = item.scheduled_at
        row.thread_json = item.thread
        after = (row.scheduled_at, list(row.thread_json))
        changes.append(
            ImportChange(key=item.key, action="unchanged" if before == after else "updated", status=row.status)
        )

    await db.commit()
    return changes
