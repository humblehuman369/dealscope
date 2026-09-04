"""Phase 4 hardening: alert detection + email gating, weekly rollup brief,
brief kinds coexisting per date, and API-over-bot-capture scorecard precedence."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from app.core.config import settings
from app.models.marketing import BotRun, BotRunStatus, BriefKind, MarketingChannel, MetricSource
from app.schemas.marketing import BriefIn, MetricSnapshotIn, ScorecardCell
from app.services import marketing_ops_jobs as jobs
from app.services import marketing_service as svc

pytestmark = pytest.mark.asyncio

NOW = datetime(2026, 9, 7, 12, 0, tzinfo=UTC)  # a Monday


def _run(bot: str, *, started_ago: timedelta, status: BotRunStatus, error: str | None = None) -> BotRun:
    return BotRun(
        id=uuid.uuid4(),
        bot_name=bot,
        routine="daily",
        status=status.value,
        started_at=NOW - started_ago,
        finished_at=None if status == BotRunStatus.RUNNING else NOW - started_ago + timedelta(minutes=5),
        error=error,
    )


@pytest.fixture
def no_blog_prs(monkeypatch):
    monkeypatch.setattr(svc, "blog_prs", AsyncMock(return_value=([], None)))


@pytest.fixture
def quiet_integrations(monkeypatch):
    monkeypatch.setattr(settings, "X_PUBLISH_ENABLED", False)
    monkeypatch.setattr(settings, "LINKEDIN_TOKEN_EXPIRES_AT_FOUNDER", "")
    monkeypatch.setattr(settings, "LINKEDIN_TOKEN_EXPIRES_AT_COMPANY", "")
    monkeypatch.setattr(jobs, "evaluate_job_health", AsyncMock(return_value={"jobs": {}}))


# ---------------------------------------------------------------------------
# Alert detection (pure)
# ---------------------------------------------------------------------------


class TestBotIssues:
    def test_never_checked_in_is_not_an_incident(self):
        assert jobs.bot_issues([], now=NOW) == []

    def test_healthy_recent_run_is_quiet(self):
        runs = [_run("metrics-analyst", started_ago=timedelta(hours=2), status=BotRunStatus.SUCCEEDED)]
        assert jobs.bot_issues(runs, now=NOW) == []

    def test_missed_failed_and_stuck(self):
        runs = [
            _run("metrics-analyst", started_ago=timedelta(hours=30), status=BotRunStatus.SUCCEEDED),
            _run(
                "content-drafter", started_ago=timedelta(hours=1), status=BotRunStatus.FAILED, error="422 twice\nmore"
            ),
            _run("unknown-bot", started_ago=timedelta(days=9), status=BotRunStatus.SUCCEEDED),
        ]
        issues = jobs.bot_issues(runs, now=NOW)
        assert len(issues) == 2
        assert issues[0].startswith("metrics-analyst: no run since")
        assert "30h ago" in issues[0]
        assert issues[1] == "content-drafter: last run failed — 422 twice"

        stuck = [_run("metrics-analyst", started_ago=timedelta(hours=4), status=BotRunStatus.RUNNING)]
        (issue,) = jobs.bot_issues(stuck, now=NOW)
        assert "'running' for 4h" in issue


class TestIntegrationIssues:
    def test_x_enabled_without_keys_and_overdue_cron(self, monkeypatch):
        monkeypatch.setattr(settings, "X_PUBLISH_ENABLED", True)
        monkeypatch.setattr(settings, "X_API_KEY", "")
        monkeypatch.setattr(settings, "LINKEDIN_TOKEN_EXPIRES_AT_FOUNDER", "")
        monkeypatch.setattr(settings, "LINKEDIN_TOKEN_EXPIRES_AT_COMPANY", "")
        health = {
            "marketing_metrics": {"status": "overdue", "last_success": "2026-09-01T06:00:00+00:00"},
            "x_publish": {"status": "ok", "last_error": "old", "last_success": "..."},
            "linkedin_publish": {"status": "pending_first_run", "last_error": None},
            "cleanup_sessions": {"status": "overdue"},  # not a marketing job; ignored
        }
        issues = jobs.integration_issues(health, now=NOW)
        assert issues == [
            "X_PUBLISH_ENABLED is true but X_API_KEY / X_ACCESS_TOKEN are not all set; approved X posts cannot publish.",
            "cron marketing_metrics is overdue (last success 2026-09-01T06:00:00+00:00).",
        ]

    def test_linkedin_token_warning_is_forwarded(self, monkeypatch):
        monkeypatch.setattr(settings, "X_PUBLISH_ENABLED", False)
        monkeypatch.setattr(settings, "LINKEDIN_FOUNDER_REFRESH_TOKEN", "")
        monkeypatch.setattr(settings, "LINKEDIN_TOKEN_EXPIRES_AT_FOUNDER", (NOW + timedelta(days=3)).isoformat())
        monkeypatch.setattr(settings, "LINKEDIN_TOKEN_EXPIRES_AT_COMPANY", "")
        issues = jobs.integration_issues({}, now=NOW)
        assert len(issues) == 1
        assert "founder access token expires" in issues[0]


# ---------------------------------------------------------------------------
# Alerts job (email gating)
# ---------------------------------------------------------------------------


class TestAlertsJob:
    async def test_no_issues_sends_nothing(self, db_session, quiet_integrations, monkeypatch):
        monkeypatch.setattr(settings, "ADMIN_NOTIFICATION_EMAILS", "ops@dealgapiq.com")
        send = AsyncMock(return_value={"success": True, "id": "x"})
        monkeypatch.setattr(jobs.email_service, "send_marketing_alert_email", send)
        result = await jobs.marketing_alerts_job(db_session, now=NOW)
        assert result == {"issues": [], "recipients": 1, "emailed": False}
        send.assert_not_awaited()

    async def test_issues_email_admin_list_once_per_day(self, db_session, quiet_integrations, monkeypatch):
        monkeypatch.setattr(settings, "ADMIN_NOTIFICATION_EMAILS", "ops@dealgapiq.com, brad@dealgapiq.com")
        monkeypatch.setattr(settings, "FRONTEND_URL", "https://dealgapiq.com")
        run = await svc.start_run(db_session, bot_name="metrics-analyst", routine="daily")
        run.started_at = NOW - timedelta(hours=40)
        await db_session.flush()
        send = AsyncMock(return_value={"success": True, "id": "x"})
        monkeypatch.setattr(jobs.email_service, "send_marketing_alert_email", send)

        result = await jobs.marketing_alerts_job(db_session, now=NOW)
        assert result["emailed"] is True
        assert len(result["issues"]) == 1
        send.assert_awaited_once()
        kwargs = send.await_args.kwargs
        assert kwargs["to"] == ["ops@dealgapiq.com", "brad@dealgapiq.com"]
        assert kwargs["dashboard_url"] == "https://dealgapiq.com/admin/marketing"
        assert kwargs["idempotency_key"] == "marketing-alerts-2026-09-07"

    async def test_no_recipients_logs_only(self, db_session, quiet_integrations, monkeypatch):
        monkeypatch.setattr(settings, "ADMIN_NOTIFICATION_EMAILS", "")
        run = await svc.start_run(db_session, bot_name="content-drafter", routine="daily")
        run.started_at = NOW - timedelta(hours=40)
        await db_session.flush()
        send = AsyncMock()
        monkeypatch.setattr(jobs.email_service, "send_marketing_alert_email", send)
        result = await jobs.marketing_alerts_job(db_session, now=NOW)
        assert result["emailed"] is False
        assert "ADMIN_NOTIFICATION_EMAILS is empty" in result["warning"]
        send.assert_not_awaited()


# ---------------------------------------------------------------------------
# Weekly rollup
# ---------------------------------------------------------------------------


async def _seed(db, day: date, channel: MarketingChannel, metric: str, value: float, source: MetricSource):
    await svc.upsert_metrics(
        db,
        [MetricSnapshotIn(date=day, channel=channel, metric=metric, value=value)],
        source=source,
        run_id=None,
    )


class TestWeeklyRollup:
    def test_biggest_moves_ignores_small_bases(self):
        cells = [
            ScorecardCell(
                channel="site", metric="signups", current=30, previous=20, sources=["posthog"], last_captured_at=None
            ),
            ScorecardCell(
                channel="x", metric="clicks", current=9, previous=3, sources=["bot_capture"], last_captured_at=None
            ),
            ScorecardCell(
                channel="meta_ads",
                metric="spend",
                current=40.0,
                previous=100.0,
                sources=["bot_capture"],
                last_captured_at=None,
            ),
            ScorecardCell(
                channel="site",
                metric="sessions",
                current=None,
                previous=100,
                sources=["posthog"],
                last_captured_at=None,
            ),
        ]
        assert jobs.biggest_moves(cells) == [
            "meta_ads spend -60% ($100.00 to $40.00)",
            "site signups +50% (20 to 30)",
        ]

    async def test_writes_weekly_brief_without_touching_daily(self, db_session, no_blog_prs):
        today = NOW.date()
        # Daily brief for the same date already exists (the Analyst ran at 06:30).
        await svc.upsert_brief(db_session, BriefIn(date=today, body_md="daily"), created_by="bot:metrics-analyst")
        for offset, value in ((1, 12), (3, 8), (9, 5), (11, 5)):
            await _seed(
                db_session,
                today - timedelta(days=offset),
                MarketingChannel.SITE,
                "signups",
                value,
                MetricSource.POSTHOG,
            )

        result = await jobs.weekly_rollup_job(db_session, today=today)
        assert result["status"] == "written"

        weekly = await svc.latest_brief(db_session, kind=BriefKind.WEEKLY)
        daily = await svc.latest_brief(db_session)
        assert weekly is not None and daily is not None and weekly.id != daily.id
        assert daily.body_md == "daily"
        assert weekly.created_by == jobs.WEEKLY_ROLLUP_AUTHOR
        assert "| site | signups | 20 | 10 | +100% | posthog |" in weekly.body_md
        assert weekly.highlights["biggest_moves"] == ["site signups +100% (10 to 20)"]
        assert "open_items" not in weekly.highlights

        # Re-running the same Monday overwrites the draft instead of erroring.
        again = await jobs.weekly_rollup_job(db_session, today=today)
        assert again["brief_id"] == result["brief_id"]

    async def test_reviewed_weekly_brief_is_not_overwritten(self, db_session, no_blog_prs):
        today = NOW.date()
        first = await jobs.weekly_rollup_job(db_session, today=today)
        weekly = await svc.latest_brief(db_session, kind=BriefKind.WEEKLY)
        assert weekly is not None
        weekly.status = "reviewed"
        await db_session.flush()
        result = await jobs.weekly_rollup_job(db_session, today=today)
        assert result == {"date": today.isoformat(), "status": "skipped", "reason": "weekly brief already reviewed"}
        assert first["status"] == "written"


# ---------------------------------------------------------------------------
# Scorecard precedence: API rows replace bot_capture for the same cell+day
# ---------------------------------------------------------------------------


class TestScorecardPrecedence:
    async def test_api_row_supersedes_bot_capture_on_overlap_days(self, db_session):
        today = date(2026, 9, 7)
        d1, d2 = today - timedelta(days=1), today - timedelta(days=2)
        await _seed(db_session, d1, MarketingChannel.META_ADS, "spend", 41.0, MetricSource.BOT_CAPTURE)
        await _seed(db_session, d1, MarketingChannel.META_ADS, "spend", 40.2, MetricSource.META_API)
        await _seed(db_session, d2, MarketingChannel.META_ADS, "spend", 39.0, MetricSource.BOT_CAPTURE)

        card = await svc.build_scorecard(db_session, days=7, today=today)
        (cell,) = [c for c in card.cells if c.channel == "meta_ads" and c.metric == "spend"]
        # d1 counts the API value only; d2 still counts the bot value (no API row that day).
        assert cell.current == pytest.approx(40.2 + 39.0)
        assert cell.sources == ["bot_capture", "meta_api"]
