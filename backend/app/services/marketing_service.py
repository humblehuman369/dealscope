"""Shared queries for the Marketing Ops Hub. Used by the bot and admin routers."""

from __future__ import annotations

import logging
import re
import uuid
from datetime import UTC, date, datetime, timedelta
from xml.etree import ElementTree

import httpx
from sqlalchemy import func, select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.linkedin_post import LinkedInPost, LinkedInPostStatus
from app.models.marketing import (
    BotRun,
    BotRunStatus,
    BriefKind,
    BriefStatus,
    MarketingBrief,
    MarketingMetricDaily,
    MetricSource,
)
from app.models.x_post import XPost, XPostStatus
from app.schemas.marketing import (
    BlogInventoryItem,
    BlogPullRequest,
    BriefIn,
    MetricSnapshotIn,
    MetricUpsertResult,
    Scorecard,
    ScorecardCell,
)
from app.services.cache_service import get_cache_service

logger = logging.getLogger(__name__)

BLOG_INVENTORY_CACHE_KEY = "marketing:blog_inventory"
BLOG_INVENTORY_TTL_SECONDS = 3600
BLOG_PRS_CACHE_KEY = "marketing:blog_prs"
BLOG_PRS_TTL_SECONDS = 600
BLOG_PR_BRANCH_PREFIX = "bot/blog/"
GITHUB_API = "https://api.github.com"


def _now() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Runs
# ---------------------------------------------------------------------------


async def start_run(db: AsyncSession, *, bot_name: str, routine: str) -> BotRun:
    run = BotRun(bot_name=bot_name, routine=routine, status=BotRunStatus.RUNNING.value)
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


async def finish_run(
    db: AsyncSession,
    run: BotRun,
    *,
    status: BotRunStatus,
    summary: str | None,
    error: str | None,
) -> BotRun:
    run.status = status.value
    run.finished_at = _now()
    run.summary = summary
    run.error = error
    await db.commit()
    await db.refresh(run)
    return run


async def latest_run_per_bot(db: AsyncSession) -> list[BotRun]:
    latest = (
        select(BotRun.bot_name, func.max(BotRun.started_at).label("started_at")).group_by(BotRun.bot_name).subquery()
    )
    stmt = (
        select(BotRun)
        .join(latest, (BotRun.bot_name == latest.c.bot_name) & (BotRun.started_at == latest.c.started_at))
        .order_by(BotRun.bot_name)
    )
    return list((await db.execute(stmt)).scalars().all())


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------


async def upsert_metrics(
    db: AsyncSession,
    snapshots: list[MetricSnapshotIn],
    *,
    source: MetricSource,
    run_id: uuid.UUID | None = None,
) -> MetricUpsertResult:
    """Insert or overwrite (date, channel, metric, source). Idempotent."""
    if not snapshots:
        return MetricUpsertResult(inserted=0, updated=0, source=source)

    captured_at = _now()
    # Deduplicate within the payload so ON CONFLICT never sees the same key twice.
    by_key: dict[tuple[date, str, str], MetricSnapshotIn] = {}
    for snap in snapshots:
        by_key[(snap.date, snap.channel.value, snap.metric)] = snap

    rows = [
        {
            "id": uuid.uuid4(),
            "date": snap.date,
            "channel": snap.channel.value,
            "metric": snap.metric,
            "value": snap.value,
            "source": source.value,
            "captured_at": captured_at,
            "run_id": run_id,
        }
        for snap in by_key.values()
    ]
    existing = (
        await db.execute(
            select(func.count())
            .select_from(MarketingMetricDaily)
            .where(
                MarketingMetricDaily.source == source.value,
                tuple_(
                    MarketingMetricDaily.date,
                    MarketingMetricDaily.channel,
                    MarketingMetricDaily.metric,
                ).in_(list(by_key)),
            )
        )
    ).scalar_one()

    stmt = pg_insert(MarketingMetricDaily).values(rows)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_marketing_metrics_daily_key",
        set_={
            "value": stmt.excluded.value,
            "captured_at": stmt.excluded.captured_at,
            "run_id": stmt.excluded.run_id,
        },
    )
    await db.execute(stmt)
    await db.commit()
    return MetricUpsertResult(inserted=len(rows) - existing, updated=existing, source=source)


async def metrics_since(db: AsyncSession, start: date) -> list[MarketingMetricDaily]:
    stmt = (
        select(MarketingMetricDaily)
        .where(MarketingMetricDaily.date >= start)
        .order_by(MarketingMetricDaily.date, MarketingMetricDaily.channel, MarketingMetricDaily.metric)
    )
    return list((await db.execute(stmt)).scalars().all())


async def build_scorecard(db: AsyncSession, *, days: int, today: date | None = None) -> Scorecard:
    """Sum each (channel, metric) over the trailing window and the one before it.

    Where several sources report the same cell, all are summed, except that a
    ``bot_capture`` row is dropped for any day an API source also reported
    the same (channel, metric). That is what lets Phase 4 swap dashboard
    capture for official APIs without double counting during the overlap.
    The UI shows provenance so a bot-captured figure is never mistaken for
    an API one.
    """
    today = today or _now().date()
    window_end = today
    window_start = today - timedelta(days=days - 1)
    prior_start = window_start - timedelta(days=days)

    rows = await metrics_since(db, prior_start)
    api_days = {(row.date, row.channel, row.metric) for row in rows if row.source != MetricSource.BOT_CAPTURE.value}
    cells: dict[tuple[str, str], dict] = {}
    for row in rows:
        if row.source == MetricSource.BOT_CAPTURE.value and (row.date, row.channel, row.metric) in api_days:
            continue
        cell = cells.setdefault(
            (row.channel, row.metric),
            {"current": None, "previous": None, "sources": set(), "last": None},
        )
        cell["sources"].add(row.source)
        if cell["last"] is None or row.captured_at > cell["last"]:
            cell["last"] = row.captured_at
        if row.date >= window_start:
            cell["current"] = (cell["current"] or 0.0) + row.value
        else:
            cell["previous"] = (cell["previous"] or 0.0) + row.value

    return Scorecard(
        days=days,
        window_start=window_start,
        window_end=window_end,
        cells=[
            ScorecardCell(
                channel=channel,
                metric=metric,
                current=cell["current"],
                previous=cell["previous"],
                sources=sorted(cell["sources"]),
                last_captured_at=cell["last"],
            )
            for (channel, metric), cell in sorted(cells.items())
        ],
    )


async def source_health(db: AsyncSession) -> list[dict]:
    week_ago = _now().date() - timedelta(days=7)
    stmt = (
        select(
            MarketingMetricDaily.source,
            func.max(MarketingMetricDaily.captured_at),
            func.count().filter(MarketingMetricDaily.date >= week_ago),
        )
        .group_by(MarketingMetricDaily.source)
        .order_by(MarketingMetricDaily.source)
    )
    return [
        {"source": source, "last_captured_at": last, "rows_7d": rows}
        for source, last, rows in (await db.execute(stmt)).all()
    ]


# ---------------------------------------------------------------------------
# Briefs
# ---------------------------------------------------------------------------


class BriefLocked(ValueError):
    """The brief for that date was already reviewed and cannot be rewritten."""


async def upsert_brief(
    db: AsyncSession,
    payload: BriefIn,
    *,
    created_by: str,
    kind: BriefKind = BriefKind.DAILY,
) -> MarketingBrief:
    existing = (
        await db.execute(
            select(MarketingBrief).where(MarketingBrief.date == payload.date, MarketingBrief.kind == kind.value)
        )
    ).scalar_one_or_none()
    if existing is None:
        row = MarketingBrief(
            date=payload.date,
            kind=kind.value,
            body_md=payload.body_md,
            highlights=payload.highlights,
            status=BriefStatus.DRAFT.value,
            created_by=created_by,
            run_id=payload.run_id,
        )
        db.add(row)
    else:
        if existing.status == BriefStatus.REVIEWED.value:
            raise BriefLocked(f"brief for {payload.date} is already reviewed")
        existing.body_md = payload.body_md
        existing.highlights = payload.highlights
        existing.created_by = created_by
        existing.run_id = payload.run_id
        row = existing
    await db.commit()
    await db.refresh(row)
    return row


async def latest_brief(db: AsyncSession, *, kind: BriefKind = BriefKind.DAILY) -> MarketingBrief | None:
    stmt = select(MarketingBrief).where(MarketingBrief.kind == kind.value).order_by(MarketingBrief.date.desc()).limit(1)
    return (await db.execute(stmt)).scalar_one_or_none()


async def list_briefs(db: AsyncSession, *, limit: int) -> list[MarketingBrief]:
    # Same-date tie: daily before weekly, so Monday's default view is the Analyst's brief.
    stmt = select(MarketingBrief).order_by(MarketingBrief.date.desc(), MarketingBrief.kind.asc()).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


# ---------------------------------------------------------------------------
# Queue
# ---------------------------------------------------------------------------


async def linkedin_queue_counts(db: AsyncSession) -> dict[str, int]:
    stmt = select(LinkedInPost.status, func.count()).group_by(LinkedInPost.status)
    counts = {status.value: 0 for status in LinkedInPostStatus}
    for status, count in (await db.execute(stmt)).all():
        counts[status.value] = count
    return counts


async def recent_linkedin_keys(db: AsyncSession, *, days: int = 28) -> list[str]:
    since = _now() - timedelta(days=days)
    stmt = select(LinkedInPost.key).where(LinkedInPost.scheduled_at >= since).order_by(LinkedInPost.scheduled_at.desc())
    return list((await db.execute(stmt)).scalars().all())


async def x_queue_counts(db: AsyncSession) -> dict[str, int]:
    stmt = select(XPost.status, func.count()).group_by(XPost.status)
    counts = {status.value: 0 for status in XPostStatus}
    for status, count in (await db.execute(stmt)).all():
        counts[status] = count
    return counts


async def recent_x_keys(db: AsyncSession, *, days: int = 28) -> list[str]:
    since = _now() - timedelta(days=days)
    stmt = select(XPost.key).where(XPost.scheduled_at >= since).order_by(XPost.scheduled_at.desc())
    return list((await db.execute(stmt)).scalars().all())


# ---------------------------------------------------------------------------
# Blog inventory (public RSS; the backend has no copy of frontend/content)
# ---------------------------------------------------------------------------


_SLUG_RE = re.compile(r"/blog/([^/?#]+)")


def parse_blog_feed(xml_text: str) -> list[BlogInventoryItem]:
    # First-party feed from MARKETING_SITE_ORIGIN (our own Next.js route), not
    # untrusted input; stdlib parser is acceptable here.
    root = ElementTree.fromstring(xml_text)  # noqa: S314
    items: list[BlogInventoryItem] = []
    for item in root.iter("item"):
        link = (item.findtext("link") or "").strip()
        match = _SLUG_RE.search(link)
        if not match:
            continue
        items.append(
            BlogInventoryItem(
                title=(item.findtext("title") or "").strip(),
                url=link,
                slug=match.group(1),
                category=(item.findtext("category") or "").strip() or None,
                published=(item.findtext("{http://www.w3.org/2005/Atom}updated") or "").strip() or None,
            )
        )
    return items


async def blog_inventory() -> tuple[list[BlogInventoryItem], str | None]:
    """Fetch the public RSS feed, cached for an hour. Never raises."""
    cache = get_cache_service()
    cached = await cache.get(BLOG_INVENTORY_CACHE_KEY)
    if cached:
        return [BlogInventoryItem(**row) for row in cached], None

    url = f"{settings.MARKETING_SITE_ORIGIN.rstrip('/')}/blog/feed.xml"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
        items = parse_blog_feed(response.text)
    except (httpx.HTTPError, ElementTree.ParseError) as exc:
        logger.warning("blog inventory fetch failed: %s", exc)
        return [], f"blog inventory unavailable ({type(exc).__name__})"

    await cache.set(
        BLOG_INVENTORY_CACHE_KEY,
        [item.model_dump() for item in items],
        ttl_seconds=BLOG_INVENTORY_TTL_SECONDS,
    )
    return items, None


# ---------------------------------------------------------------------------
# Open blog-draft PRs (GitHub; merge is the approval step for blog posts)
# ---------------------------------------------------------------------------


def parse_blog_prs(payload: list[dict]) -> list[BlogPullRequest]:
    """Keep only PRs whose head branch is ``bot/blog/<slug>``."""
    prs: list[BlogPullRequest] = []
    for pr in payload:
        branch = (pr.get("head") or {}).get("ref") or ""
        if not branch.startswith(BLOG_PR_BRANCH_PREFIX):
            continue
        updated = pr.get("updated_at")
        prs.append(
            BlogPullRequest(
                number=int(pr["number"]),
                title=str(pr.get("title") or ""),
                url=str(pr.get("html_url") or ""),
                branch=branch,
                slug=branch[len(BLOG_PR_BRANCH_PREFIX) :],
                draft=bool(pr.get("draft", False)),
                author=(pr.get("user") or {}).get("login"),
                preview_url=None,
                updated_at=datetime.fromisoformat(updated.replace("Z", "+00:00")) if updated else None,
            )
        )
    return prs


def preview_url_from_statuses(payload: list[dict]) -> str | None:
    """Vercel reports the preview as a commit status whose target_url is the deployment."""
    for status in payload:
        context = str(status.get("context") or "").lower()
        if "vercel" in context and status.get("state") == "success" and status.get("target_url"):
            return str(status["target_url"])
    return None


async def blog_prs() -> tuple[list[BlogPullRequest], str | None]:
    """Open ``bot/blog/*`` PRs with their Vercel preview, cached 10 min. Never raises."""
    if not settings.MARKETING_GITHUB_REPO:
        return [], None
    cache = get_cache_service()
    cached = await cache.get(BLOG_PRS_CACHE_KEY)
    if cached is not None:
        return [BlogPullRequest(**row) for row in cached], None

    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if settings.MARKETING_GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.MARKETING_GITHUB_TOKEN}"
    base = f"{GITHUB_API}/repos/{settings.MARKETING_GITHUB_REPO}"
    try:
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            response = await client.get(f"{base}/pulls", params={"state": "open", "per_page": 50})
            response.raise_for_status()
            raw = response.json()
            prs = parse_blog_prs(raw)
            by_number = {int(pr["number"]): (pr.get("head") or {}).get("sha") for pr in raw}
            for pr in prs:
                sha = by_number.get(pr.number)
                if not sha:
                    continue
                statuses = await client.get(f"{base}/commits/{sha}/statuses")
                if statuses.status_code == 200:
                    pr.preview_url = preview_url_from_statuses(statuses.json())
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        logger.warning("blog PR list fetch failed: %s", exc)
        return [], f"blog PR list unavailable ({type(exc).__name__})"

    await cache.set(
        BLOG_PRS_CACHE_KEY,
        [pr.model_dump(mode="json") for pr in prs],
        ttl_seconds=BLOG_PRS_TTL_SECONDS,
    )
    return prs, None
