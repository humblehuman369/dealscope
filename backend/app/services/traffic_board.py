"""Admin traffic board — live PostHog reads for ``/admin/traffic``.

Three PostHog Query API calls (web overview, daily trend, first-touch UTM
table) shaped into one payload the admin page can render without knowing
PostHog's response formats. Results are cached in-process for a few minutes
so a founder refreshing the page does not burn query quota.

Uses the same credentials as the daily metrics pull (``POSTHOG_PERSONAL_API_KEY``
+ ``POSTHOG_PROJECT_ID``). When they are unset the endpoint returns
``configured=false`` and the page shows how to fix it.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.traffic import (
    TrafficBoard,
    TrafficOverview,
    TrafficSeries,
    TrafficSource,
)

logger = logging.getLogger(__name__)

ALLOWED_DAYS = (7, 14, 28)
CACHE_TTL_SECONDS = 300
PAGEVIEW_EVENT = "$pageview"

# Series shown on the board. Names mirror frontend/src/lib/eventTracking.ts.
TREND_SERIES: tuple[tuple[str, str, str], ...] = (
    # (display name, PostHog event, math)
    ("Visitors", PAGEVIEW_EVENT, "dau"),
    ("Signups", "signup_completed", "total"),
    ("Analyses", "verdict_viewed", "total"),
    ("Activated", "activated", "total"),
    ("Checkouts", "checkout_started", "total"),
    ("Paid", "checkout_completed", "total"),
)


def configured() -> bool:
    return bool(settings.POSTHOG_PERSONAL_API_KEY and settings.POSTHOG_PROJECT_ID)


# ---------------------------------------------------------------------------
# Query builders
# ---------------------------------------------------------------------------


def _date_range(days: int) -> dict[str, str]:
    return {"date_from": f"-{days}d"}


def overview_query(days: int) -> dict[str, Any]:
    # ``properties`` is required on PostHog's WebAnalyticsQueryBase; omitting
    # it is a 400 (``Field required``) on current us.posthog.com schemas.
    return {
        "kind": "WebOverviewQuery",
        "dateRange": _date_range(days),
        "properties": [],
    }


def trends_query(days: int) -> dict[str, Any]:
    return {
        "kind": "TrendsQuery",
        "interval": "day",
        "dateRange": _date_range(days),
        "properties": [],
        "series": [
            {"kind": "EventsNode", "event": event, "math": math, "custom_name": name}
            for name, event, math in TREND_SERIES
        ],
    }


def sources_query(days: int, limit: int = 12) -> dict[str, Any]:
    return {
        "kind": "WebStatsTableQuery",
        "breakdownBy": "InitialUTMSourceMediumCampaign",
        "limit": limit,
        "dateRange": _date_range(days),
        "properties": [],
    }


# ---------------------------------------------------------------------------
# Response parsers (pure; unit-tested)
# ---------------------------------------------------------------------------


def parse_overview(payload: dict[str, Any]) -> TrafficOverview:
    """``WebOverviewQuery`` returns a list of ``{key, value, kind}`` tuples."""
    by_key: dict[str, float | None] = {}
    for row in payload.get("results") or []:
        if isinstance(row, dict) and "key" in row:
            by_key[str(row["key"])] = _num(row.get("value"))
    return TrafficOverview(
        visitors=by_key.get("visitors"),
        views=by_key.get("views"),
        sessions=by_key.get("sessions"),
        session_duration_s=by_key.get("session duration"),
        bounce_rate_pct=by_key.get("bounce rate"),
    )


def parse_trends(payload: dict[str, Any]) -> list[TrafficSeries]:
    """``TrendsQuery`` returns one result per series with ``data`` + ``days``."""
    out: list[TrafficSeries] = []
    for row in payload.get("results") or []:
        if not isinstance(row, dict):
            continue
        action = row.get("action") or {}
        name = action.get("custom_name") or row.get("label") or "series"
        data = [_num(v) or 0.0 for v in (row.get("data") or [])]
        days = [str(d)[:10] for d in (row.get("days") or [])]
        total = _num(row.get("count"))
        out.append(
            TrafficSeries(
                name=str(name),
                days=days,
                data=data,
                total=total if total is not None else float(sum(data)),
            )
        )
    return out


def parse_sources(payload: dict[str, Any]) -> list[TrafficSource]:
    """``WebStatsTableQuery`` rows: ``[label, [visitors, prev], [views, prev], share, ...]``.

    ``label`` is ``"source / medium / campaign"``; untagged traffic arrives as
    ``"referrer:$direct / (none) / (none)"`` or ``"referrer:<host> / ..."``.
    """
    out: list[TrafficSource] = []
    for row in payload.get("results") or []:
        if not isinstance(row, (list, tuple)) or not row:
            continue
        label = str(row[0] or "")
        parts = [p.strip() for p in label.split(" / ")]
        source = parts[0] if parts else label
        medium = parts[1] if len(parts) > 1 else ""
        campaign = parts[2] if len(parts) > 2 else ""
        tagged = True
        if source.startswith("referrer:"):
            tagged = False
            source = source[len("referrer:") :]
            if source == "$direct":
                source = "Direct"
        medium = "" if medium == "(none)" else medium
        campaign = "" if campaign == "(none)" else campaign
        visitors = _first_num(row[1]) if len(row) > 1 else None
        views = _first_num(row[2]) if len(row) > 2 else None
        share = _num(row[3]) if len(row) > 3 else None
        out.append(
            TrafficSource(
                source=source,
                medium=medium,
                campaign=campaign,
                tagged=tagged,
                visitors=visitors,
                views=views,
                share_pct=round(share * 100, 1) if share is not None else None,
            )
        )
    return out


def _num(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _first_num(value: Any) -> float | None:
    if isinstance(value, (list, tuple)):
        return _num(value[0]) if value else None
    return _num(value)


# ---------------------------------------------------------------------------
# Fetch + cache
# ---------------------------------------------------------------------------


@dataclass
class _CacheEntry:
    board: TrafficBoard
    expires_at: float


@dataclass
class _Cache:
    entries: dict[int, _CacheEntry] = field(default_factory=dict)


_cache = _Cache()


def clear_cache() -> None:
    _cache.entries.clear()


def _format_http_error(exc: httpx.HTTPError) -> str:
    msg = f"{type(exc).__name__}: {exc}"
    if isinstance(exc, httpx.HTTPStatusError):
        detail = (exc.response.text or "").strip().replace("\n", " ")[:180]
        if detail:
            msg = f"{msg} — {detail}"
    return msg[:300]


async def _run_query(client: httpx.AsyncClient, query: dict[str, Any]) -> dict[str, Any]:
    url = f"{settings.POSTHOG_API_HOST.rstrip('/')}/api/projects/{settings.POSTHOG_PROJECT_ID}/query"
    kind = str(query.get("kind") or "query")
    response = await client.post(
        url,
        json={"query": query, "name": f"traffic_board_{kind}"},
        headers={"Authorization": f"Bearer {settings.POSTHOG_PERSONAL_API_KEY}"},
    )
    response.raise_for_status()
    data = response.json()
    return data if isinstance(data, dict) else {}


async def fetch_board(days: int, *, refresh: bool = False) -> TrafficBoard:
    """Return the board for ``days`` (7/14/28), served from cache when fresh."""
    if days not in ALLOWED_DAYS:
        days = 14
    now = time.monotonic()
    entry = _cache.entries.get(days)
    if entry and not refresh and entry.expires_at > now:
        return entry.board.model_copy(update={"cached": True})

    if not configured():
        return TrafficBoard(
            days=days,
            configured=False,
            generated_at=datetime.now(UTC),
            overview=TrafficOverview(),
            series=[],
            sources=[],
            error="POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID are not set on the backend.",
        )

    errors: list[str] = []

    async def _one(client: httpx.AsyncClient, query: dict[str, Any]) -> dict[str, Any]:
        try:
            return await _run_query(client, query)
        except httpx.HTTPError as exc:
            logger.warning("traffic board PostHog query failed: %s", exc)
            errors.append(_format_http_error(exc))
            return {}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            overview_raw = await _one(client, overview_query(days))
            trends_raw = await _one(client, trends_query(days))
            sources_raw = await _one(client, sources_query(days))
    except httpx.HTTPError as exc:
        logger.warning("traffic board PostHog query failed: %s", exc)
        if entry:  # stale but better than nothing
            return entry.board.model_copy(update={"cached": True, "error": f"{type(exc).__name__}: refresh failed"})
        return TrafficBoard(
            days=days,
            configured=True,
            generated_at=datetime.now(UTC),
            overview=TrafficOverview(),
            series=[],
            sources=[],
            error=_format_http_error(exc),
        )

    if errors and not overview_raw and not trends_raw and not sources_raw:
        if entry:
            return entry.board.model_copy(update={"cached": True, "error": f"{errors[0]}: refresh failed"})
        return TrafficBoard(
            days=days,
            configured=True,
            generated_at=datetime.now(UTC),
            overview=TrafficOverview(),
            series=[],
            sources=[],
            error=errors[0],
        )

    board = TrafficBoard(
        days=days,
        configured=True,
        generated_at=datetime.now(UTC),
        overview=parse_overview(overview_raw),
        series=parse_trends(trends_raw),
        sources=parse_sources(sources_raw),
        error="; ".join(errors) if errors else None,
    )
    if not errors:
        _cache.entries[days] = _CacheEntry(board=board, expires_at=now + CACHE_TTL_SECONDS)
    return board
