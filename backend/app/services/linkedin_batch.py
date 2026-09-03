"""Parse, validate, and upsert a LinkedIn batch YAML.

Copy is never rewritten. Validation rejects the file; it does not fix it.
Media bytes are stored on the row at import because Railway does not ship
``docs/``. Re-import is upsert-by-key and never touches ``published`` rows.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.models.linkedin_post import (
    LinkedInAccount,
    LinkedInMediaType,
    LinkedInPost,
    LinkedInPostStatus,
)

logger = logging.getLogger(__name__)

LINKEDIN_BODY_MAX = 3000
HASHTAG_RE = re.compile(r"#([A-Za-z0-9_]+)")

# Blueprint §6. Unknown tags fail import rather than being stripped.
HASHTAG_TAXONOMY = frozenset(
    {
        "RealEstateInvesting",
        "PropTech",
        "InvestmentProperty",
        "BRRRR",
        "FixAndFlip",
        "CreativeFinance",
        "RentalProperty",
        "HouseHacking",
        "WholesalingRealEstate",
        "CashFlow",
        "DSCR",
        "HardMoneyLending",
        "PrivateLending",
        "RealEstateData",
        "DealGap",
        "DealGapIQ",
    }
)


class BatchValidationError(ValueError):
    """One or more validation failures. ``errors`` is the full list."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("\n".join(errors))


@dataclass
class ParsedPost:
    key: str
    account: LinkedInAccount
    scheduled_at: datetime
    body: str
    media_type: LinkedInMediaType
    media_path: str | None
    media_alt_text: str | None
    document_title: str | None
    media_bytes: bytes | None
    first_comment: str | None
    reshare_of_key: str | None


@dataclass
class ParsedBatch:
    batch: str
    timezone: str
    posts: list[ParsedPost]
    source_dir: Path


@dataclass
class ImportChange:
    key: str
    action: str  # inserted | updated | unchanged | skipped_published
    status: str


def hashtags_on_last_line(body: str) -> list[str]:
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    if not lines:
        return []
    return HASHTAG_RE.findall(lines[-1])


def resolve_media_path(source_dir: Path, media_path: str) -> Path:
    """``media_path`` is relative to ``docs/marketing/linkedin/`` (parent of batches/)."""
    return (source_dir / media_path).resolve()


def parse_batch_file(path: Path) -> ParsedBatch:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise BatchValidationError(["batch file must be a mapping"])
    return parse_batch_data(raw, source_dir=path.parent.parent)


def parse_batch_data(raw: dict[str, Any], *, source_dir: Path) -> ParsedBatch:
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

    short_keys = [str(p.get("key") or "") for p in posts_raw if isinstance(p, dict)]
    parsed: list[ParsedPost] = []
    missing_assets: list[str] = []

    for index, item in enumerate(posts_raw):
        if not isinstance(item, dict):
            errors.append(f"posts[{index}] must be a mapping")
            continue
        prefix = str(item.get("key") or f"posts[{index}]")
        short_key = str(item.get("key") or "").strip()
        if not short_key:
            errors.append(f"posts[{index}].key is required")
            continue
        full_key = f"{batch_name}/{short_key}" if batch_name else short_key

        try:
            account = LinkedInAccount(str(item.get("account") or ""))
        except ValueError:
            errors.append(f"{prefix}: account must be founder or company")
            account = LinkedInAccount.FOUNDER

        try:
            media_type = LinkedInMediaType(str(item.get("media_type") or "none"))
        except ValueError:
            errors.append(f"{prefix}: media_type must be none, image, or document")
            media_type = LinkedInMediaType.NONE

        scheduled_raw = str(item.get("scheduled_at") or "").strip()
        scheduled_at: datetime | None = None
        if not scheduled_raw:
            errors.append(f"{prefix}: scheduled_at is required")
        else:
            try:
                naive = datetime.strptime(scheduled_raw, "%Y-%m-%d %H:%M")
                scheduled_at = naive.replace(tzinfo=tz)
            except ValueError:
                errors.append(f"{prefix}: scheduled_at must be 'YYYY-MM-DD HH:MM' in {tz_name}")

        body = item.get("body")
        if body is None:
            errors.append(f"{prefix}: body is required")
            body = ""
        else:
            body = str(body)
        if len(body) > LINKEDIN_BODY_MAX:
            errors.append(f"{prefix}: body is {len(body)} chars; LinkedIn limit is {LINKEDIN_BODY_MAX}")

        tags = hashtags_on_last_line(body)
        if len(tags) > 3:
            errors.append(f"{prefix}: {len(tags)} hashtags on the last line; max is 3")
        unknown = [t for t in tags if t not in HASHTAG_TAXONOMY]
        if unknown:
            errors.append(f"{prefix}: hashtag(s) not in blueprint taxonomy: {', '.join(unknown)}")

        media_path = str(item["media_path"]).strip() if item.get("media_path") else None
        media_alt_text = str(item["media_alt_text"]).strip() if item.get("media_alt_text") else None
        document_title = str(item["document_title"]).strip() if item.get("document_title") else None
        first_comment = str(item["first_comment"]).strip() if item.get("first_comment") else None
        reshare_short = str(item["reshare_of_key"]).strip() if item.get("reshare_of_key") else None
        reshare_of_key = f"{batch_name}/{reshare_short}" if reshare_short and batch_name else reshare_short

        if media_type == LinkedInMediaType.IMAGE:
            if not media_path:
                errors.append(f"{prefix}: media_path is required when media_type=image")
            if not media_alt_text:
                errors.append(f"{prefix}: media_alt_text is required when media_type=image")
        if media_type == LinkedInMediaType.DOCUMENT:
            if not media_path:
                errors.append(f"{prefix}: media_path is required when media_type=document")
            if not document_title:
                errors.append(f"{prefix}: document_title is required when media_type=document")

        if not reshare_of_key and not first_comment:
            errors.append(f"{prefix}: first_comment is required (article link with UTM)")
        if first_comment and "utm_source=linkedin" not in first_comment:
            errors.append(f"{prefix}: first_comment must include utm_source=linkedin")

        if reshare_short and reshare_short not in short_keys:
            errors.append(f"{prefix}: reshare_of_key={reshare_short} does not resolve in this batch")

        media_bytes: bytes | None = None
        if media_path:
            resolved = resolve_media_path(source_dir, media_path)
            if not resolved.is_file():
                missing_assets.append(f"{prefix}: missing asset {resolved}")
            else:
                media_bytes = resolved.read_bytes()

        if scheduled_at is None:
            continue
        parsed.append(
            ParsedPost(
                key=full_key,
                account=account,
                scheduled_at=scheduled_at,
                body=body,
                media_type=media_type,
                media_path=media_path,
                media_alt_text=media_alt_text,
                document_title=document_title,
                media_bytes=media_bytes,
                first_comment=first_comment,
                reshare_of_key=reshare_of_key,
            )
        )

    if missing_assets:
        errors.extend(missing_assets)
        errors.append(f"{len(missing_assets)} missing asset(s). Produce them before import.")
    if errors:
        raise BatchValidationError(errors)
    return ParsedBatch(batch=batch_name, timezone=tz_name, posts=parsed, source_dir=source_dir)


async def import_batch(db: AsyncSession, parsed: ParsedBatch) -> list[ImportChange]:
    changes: list[ImportChange] = []
    existing_rows = (
        await db.execute(
            select(LinkedInPost)
            .options(undefer(LinkedInPost.media_bytes))
            .where(LinkedInPost.batch == parsed.batch)
        )
    ).scalars().all()
    by_key = {row.key: row for row in existing_rows}

    for item in parsed.posts:
        row = by_key.get(item.key)
        if row is None:
            row = LinkedInPost(
                batch=parsed.batch,
                key=item.key,
                account=item.account,
                scheduled_at=item.scheduled_at,
                body=item.body,
                media_type=item.media_type,
                media_path=item.media_path,
                media_alt_text=item.media_alt_text,
                document_title=item.document_title,
                media_bytes=item.media_bytes,
                first_comment=item.first_comment,
                reshare_of_key=item.reshare_of_key,
                status=LinkedInPostStatus.DRAFT,
            )
            db.add(row)
            changes.append(ImportChange(key=item.key, action="inserted", status="draft"))
            continue
        if row.status == LinkedInPostStatus.PUBLISHED:
            changes.append(ImportChange(key=item.key, action="skipped_published", status="published"))
            continue
        before = (
            row.account,
            row.scheduled_at,
            row.body,
            row.media_type,
            row.media_path,
            row.media_alt_text,
            row.document_title,
            row.first_comment,
            row.reshare_of_key,
            row.media_bytes,
        )
        row.account = item.account
        row.scheduled_at = item.scheduled_at
        row.body = item.body
        row.media_type = item.media_type
        row.media_path = item.media_path
        row.media_alt_text = item.media_alt_text
        row.document_title = item.document_title
        row.media_bytes = item.media_bytes
        row.first_comment = item.first_comment
        row.reshare_of_key = item.reshare_of_key
        after = (
            row.account,
            row.scheduled_at,
            row.body,
            row.media_type,
            row.media_path,
            row.media_alt_text,
            row.document_title,
            row.first_comment,
            row.reshare_of_key,
            row.media_bytes,
        )
        action = "unchanged" if before == after else "updated"
        changes.append(ImportChange(key=item.key, action=action, status=row.status.value))

    await db.commit()
    return changes
