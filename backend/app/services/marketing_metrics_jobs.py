"""Daily first-party metric pulls: PostHog funnel by first-touch UTM, GSC search.

Deterministic sources stay on the cron, not on a bot. Each source is skipped
(never faked) when its credentials are absent, and a failure in one source
does not stop the other. Upserts are idempotent so re-runs are safe.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any
from urllib.parse import quote

import httpx
from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.marketing import MarketingChannel, MetricSource
from app.schemas.marketing import MetricSnapshotIn
from app.services.marketing_service import upsert_metrics
from app.tasks.heartbeat import with_heartbeat

logger = logging.getLogger(__name__)

# PostHog events -> metric names. Mirrors frontend/src/lib/eventTracking.ts.
FUNNEL_EVENTS: dict[str, str] = {
    "signup_completed": "signups",
    "verdict_viewed": "verdicts",
    "activated": "activations",
    "checkout_started": "checkouts_started",
    "checkout_completed": "paid_conversions",
}
PAGEVIEW_EVENT = "$pageview"
SESSIONS_METRIC = "sessions"

# Search Console publishes a day roughly three days late.
GSC_LAG_DAYS = 3
GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
GSC_ENDPOINT = "https://searchconsole.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query"

_PAID_MEDIUMS = {"cpc", "ppc", "paid", "paid_social", "paidsocial", "display"}
_META_SOURCES = {"facebook", "instagram", "meta", "fb", "ig"}
_X_SOURCES = {"x", "twitter", "t.co"}


@dataclass
class SourceResult:
    status: str  # ok | skipped | error
    rows: int = 0
    detail: str | None = None


@dataclass
class MetricsRunResult:
    posthog_date: str
    gsc_date: str
    posthog: SourceResult = field(default_factory=lambda: SourceResult("skipped"))
    gsc: SourceResult = field(default_factory=lambda: SourceResult("skipped"))

    def model_dump(self) -> dict[str, Any]:
        return asdict(self)


def channel_for(source: str | None, medium: str | None) -> MarketingChannel | None:
    """Map first-touch UTM source/medium to a dashboard channel. ``None`` = unattributed."""
    src = (source or "").strip().lower()
    med = (medium or "").strip().lower()
    if not src:
        return None
    if src == "linkedin":
        return MarketingChannel.LINKEDIN
    if src in _X_SOURCES:
        return MarketingChannel.X
    if src in _META_SOURCES:
        return MarketingChannel.META_ADS
    if src == "google" and med in _PAID_MEDIUMS:
        return MarketingChannel.GOOGLE_ADS
    if src in {"google", "bing", "duckduckgo", "blog"} or med == "organic":
        return MarketingChannel.BLOG_SEO
    return None


def posthog_configured() -> bool:
    return bool(settings.POSTHOG_PERSONAL_API_KEY and settings.POSTHOG_PROJECT_ID)


def gsc_configured() -> bool:
    return bool(settings.GSC_SERVICE_ACCOUNT_JSON and settings.GSC_SITE_URL)


# ---------------------------------------------------------------------------
# PostHog
# ---------------------------------------------------------------------------


def hogql_funnel_query(day: date) -> str:
    events = ", ".join(f"'{name}'" for name in [*FUNNEL_EVENTS, PAGEVIEW_EVENT])
    return (
        "SELECT event, properties.ft_utm_source AS src, properties.ft_utm_medium AS med, "
        "count() AS n, uniq(properties.$session_id) AS sessions "
        f"FROM events WHERE event IN ({events}) "
        f"AND toDate(timestamp) = toDate('{day.isoformat()}') "
        "GROUP BY event, src, med"
    )


def snapshots_from_posthog_rows(rows: list[list[Any]], day: date) -> list[MetricSnapshotIn]:
    """Aggregate HogQL rows into per-channel and site-wide daily metrics."""
    totals: dict[tuple[MarketingChannel, str], float] = {}

    def add(channel: MarketingChannel, metric: str, value: float) -> None:
        totals[(channel, metric)] = totals.get((channel, metric), 0.0) + value

    for row in rows:
        event, src, med, count, sessions = row[0], row[1], row[2], row[3], row[4]
        channel = channel_for(src, med)
        if event == PAGEVIEW_EVENT:
            metric, value = SESSIONS_METRIC, float(sessions or 0)
        else:
            metric = FUNNEL_EVENTS.get(event)
            if metric is None:
                continue
            value = float(count or 0)
        add(MarketingChannel.SITE, metric, value)
        if channel is not None:
            add(channel, metric, value)

    return [
        MetricSnapshotIn(date=day, channel=channel, metric=metric, value=value)
        for (channel, metric), value in sorted(totals.items())
    ]


async def pull_posthog(db: AsyncSession, day: date) -> SourceResult:
    if not posthog_configured():
        return SourceResult("skipped", detail="POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID unset")
    url = f"{settings.POSTHOG_API_HOST.rstrip('/')}/api/projects/{settings.POSTHOG_PROJECT_ID}/query"
    payload = {"query": {"kind": "HogQLQuery", "query": hogql_funnel_query(day)}}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {settings.POSTHOG_PERSONAL_API_KEY}"},
            )
            response.raise_for_status()
            rows = response.json().get("results") or []
    except httpx.HTTPError as exc:
        logger.warning("posthog metrics pull failed: %s", exc)
        return SourceResult("error", detail=f"{type(exc).__name__}: {exc}"[:500])

    snapshots = snapshots_from_posthog_rows(rows, day)
    result = await upsert_metrics(db, snapshots, source=MetricSource.POSTHOG)
    return SourceResult("ok", rows=result.inserted + result.updated)


# ---------------------------------------------------------------------------
# Google Search Console
# ---------------------------------------------------------------------------


def _gsc_access_token() -> str:
    """Blocking: google-auth refreshes over ``requests``. Run via ``to_thread``."""
    info = json.loads(settings.GSC_SERVICE_ACCOUNT_JSON)
    credentials = Credentials.from_service_account_info(info, scopes=[GSC_SCOPE])
    credentials.refresh(Request())
    return credentials.token


def snapshots_from_gsc_rows(rows: list[dict[str, Any]], day: date) -> list[MetricSnapshotIn]:
    site_clicks = site_impressions = 0.0
    blog_clicks = blog_impressions = 0.0
    blog_prefix = f"{settings.MARKETING_SITE_ORIGIN.rstrip('/')}/blog/"
    for row in rows:
        page = (row.get("keys") or [""])[0]
        clicks = float(row.get("clicks") or 0)
        impressions = float(row.get("impressions") or 0)
        site_clicks += clicks
        site_impressions += impressions
        if page.startswith(blog_prefix):
            blog_clicks += clicks
            blog_impressions += impressions
    return [
        MetricSnapshotIn(date=day, channel=MarketingChannel.SITE, metric="search_clicks", value=site_clicks),
        MetricSnapshotIn(date=day, channel=MarketingChannel.SITE, metric="search_impressions", value=site_impressions),
        MetricSnapshotIn(date=day, channel=MarketingChannel.BLOG_SEO, metric="clicks", value=blog_clicks),
        MetricSnapshotIn(date=day, channel=MarketingChannel.BLOG_SEO, metric="impressions", value=blog_impressions),
    ]


async def pull_gsc(db: AsyncSession, day: date) -> SourceResult:
    if not gsc_configured():
        return SourceResult("skipped", detail="GSC_SERVICE_ACCOUNT_JSON / GSC_SITE_URL unset")
    try:
        token = await asyncio.to_thread(_gsc_access_token)
        url = GSC_ENDPOINT.format(site=quote(settings.GSC_SITE_URL, safe=""))
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                json={
                    "startDate": day.isoformat(),
                    "endDate": day.isoformat(),
                    "dimensions": ["page"],
                    "rowLimit": 5000,
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            rows = response.json().get("rows") or []
    except Exception as exc:  # httpx, JSON, and google-auth's own hierarchy
        logger.warning("gsc metrics pull failed: %s", exc)
        return SourceResult("error", detail=f"{type(exc).__name__}: {exc}"[:500])

    snapshots = snapshots_from_gsc_rows(rows, day)
    result = await upsert_metrics(db, snapshots, source=MetricSource.GSC)
    return SourceResult("ok", rows=result.inserted + result.updated)


# ---------------------------------------------------------------------------
# Job
# ---------------------------------------------------------------------------


async def marketing_metrics_job(db: AsyncSession, *, today: date | None = None) -> dict[str, Any]:
    today = today or datetime.now(UTC).date()
    posthog_day = today - timedelta(days=1)
    gsc_day = today - timedelta(days=GSC_LAG_DAYS)
    result = MetricsRunResult(posthog_date=posthog_day.isoformat(), gsc_date=gsc_day.isoformat())
    result.posthog = await pull_posthog(db, posthog_day)
    result.gsc = await pull_gsc(db, gsc_day)
    return result.model_dump()


run_marketing_metrics = with_heartbeat("marketing_metrics", marketing_metrics_job)
