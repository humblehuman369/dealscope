"""Admin traffic board: PostHog response parsing, cache, and unconfigured state."""

from __future__ import annotations

import pytest
from app.core.config import settings
from app.services import traffic_board as tb

pytestmark = pytest.mark.asyncio


def test_parse_overview_maps_metric_tuples():
    payload = {
        "results": [
            {"key": "visitors", "kind": "unit", "value": 10},
            {"key": "views", "kind": "unit", "value": 31},
            {"key": "sessions", "kind": "unit", "value": 12},
            {"key": "session duration", "kind": "duration_s", "value": 236.5},
            {"key": "bounce rate", "kind": "percentage", "value": 58.3},
        ]
    }
    ov = tb.parse_overview(payload)
    assert ov.visitors == 10
    assert ov.views == 31
    assert ov.sessions == 12
    assert ov.session_duration_s == 236.5
    assert ov.bounce_rate_pct == 58.3


def test_parse_overview_tolerates_missing_and_null():
    ov = tb.parse_overview({"results": [{"key": "visitors", "value": None}]})
    assert ov.visitors is None
    assert ov.sessions is None


def test_parse_trends_uses_custom_name_and_days():
    payload = {
        "results": [
            {
                "label": "signup_completed",
                "count": 2,
                "data": [0, 1, 0, 1],
                "days": ["2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07"],
                "action": {"custom_name": "Signups"},
            }
        ]
    }
    series = tb.parse_trends(payload)
    assert len(series) == 1
    assert series[0].name == "Signups"
    assert series[0].total == 2
    assert series[0].data == [0.0, 1.0, 0.0, 1.0]
    assert series[0].days[-1] == "2026-09-07"


def test_parse_sources_splits_label_and_flags_untagged():
    payload = {
        "results": [
            ["referrer:$direct / (none) / (none)", [18, None], [128, None], 0.8181, ""],
            ["google / gbp / brand", [3, None], [3, None], 0.1363, ""],
            ["referrer:www.google.com / (none) / (none)", [1, None], [25, None], 0.0454, ""],
        ]
    }
    rows = tb.parse_sources(payload)
    assert [r.source for r in rows] == ["Direct", "google", "www.google.com"]
    assert rows[0].tagged is False and rows[0].medium == "" and rows[0].campaign == ""
    assert rows[1].tagged is True and rows[1].medium == "gbp" and rows[1].campaign == "brand"
    assert rows[0].visitors == 18 and rows[0].views == 128
    assert rows[0].share_pct == 81.8
    assert rows[2].tagged is False


def test_query_builders_use_requested_window():
    assert tb.overview_query(7)["dateRange"]["date_from"] == "-7d"
    q = tb.trends_query(28)
    assert q["interval"] == "day"
    assert {s["event"] for s in q["series"]} >= {"$pageview", "signup_completed", "verdict_viewed", "activated"}
    assert tb.sources_query(14)["breakdownBy"] == "InitialUTMSourceMediumCampaign"


async def test_fetch_board_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "POSTHOG_PERSONAL_API_KEY", "")
    monkeypatch.setattr(settings, "POSTHOG_PROJECT_ID", "")
    tb.clear_cache()
    board = await tb.fetch_board(14)
    assert board.configured is False
    assert board.series == [] and board.sources == []
    assert "POSTHOG_PERSONAL_API_KEY" in (board.error or "")


async def test_fetch_board_caches_and_normalises_days(monkeypatch):
    monkeypatch.setattr(settings, "POSTHOG_PERSONAL_API_KEY", "phx_test")
    monkeypatch.setattr(settings, "POSTHOG_PROJECT_ID", "1")
    tb.clear_cache()
    calls: list[dict] = []

    async def fake_run_query(_client, query):
        calls.append(query)
        kind = query["kind"]
        if kind == "WebOverviewQuery":
            return {"results": [{"key": "visitors", "value": 5}]}
        if kind == "TrendsQuery":
            return {"results": [{"label": "$pageview", "count": 5, "data": [5], "days": ["2026-09-07"], "action": {"custom_name": "Visitors"}}]}
        return {"results": [["google / cpc / x", [5, None], [9, None], 1.0, ""]]}

    monkeypatch.setattr(tb, "_run_query", fake_run_query)

    first = await tb.fetch_board(99)  # not an allowed window -> falls back to 14
    assert first.days == 14 and first.cached is False
    assert first.overview.visitors == 5
    assert first.series[0].name == "Visitors"
    assert first.sources[0].campaign == "x"
    assert len(calls) == 3

    second = await tb.fetch_board(14)
    assert second.cached is True
    assert len(calls) == 3  # served from cache

    third = await tb.fetch_board(14, refresh=True)
    assert third.cached is False
    assert len(calls) == 6
