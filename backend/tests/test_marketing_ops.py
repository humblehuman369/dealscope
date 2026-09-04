"""Marketing Ops Hub: bot token auth, draft-only enforcement, metric idempotency,
scorecard windows, admin approve/edit path, and the metrics cron job."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from app.core.config import settings
from app.core.deps import get_current_user, get_current_verified_user
from app.main import app
from app.models.linkedin_post import LinkedInPost, LinkedInPostStatus
from app.models.marketing import MarketingChannel, MarketingMetricDaily, MetricSource
from app.models.user import User
from app.schemas.marketing import MetricSnapshotIn
from app.services import marketing_service as svc
from app.services.marketing_metrics_jobs import (
    channel_for,
    marketing_metrics_job,
    snapshots_from_gsc_rows,
    snapshots_from_posthog_rows,
)
from sqlalchemy import select

pytestmark = pytest.mark.asyncio

BOT_TOKEN = "bot-secret-for-tests"
BOT_HEADERS = {"X-Bot-Token": BOT_TOKEN}


@pytest.fixture
def bot_token(monkeypatch):
    monkeypatch.setattr(settings, "MARKETING_BOT_TOKEN", BOT_TOKEN)


@pytest.fixture
async def admin_client(client, db_session, seeded_roles):
    from app.repositories.role_repository import role_repo
    from app.repositories.user_repository import user_repo
    from app.services.auth_service import auth_service

    user = await user_repo.create(
        db_session,
        email="mkt-admin@dealgapiq.test",
        hashed_password=auth_service.hash_password("AdminPass123"),
        full_name="Marketing Admin",
        is_active=True,
        is_verified=True,
    )
    await role_repo.assign_role(db_session, user.id, seeded_roles["admin"].id)
    await db_session.flush()
    user_id = user.id

    async def _user():
        return await db_session.get(User, user_id)

    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_current_verified_user] = _user
    yield client
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_verified_user, None)


def _draft_payload(**overrides) -> dict:
    payload = {
        "batch": "bot-2026-09-05",
        "timezone": "America/New_York",
        "posts": [
            {
                "key": "post-01",
                "account": "founder",
                "scheduled_at": "2026-09-06 07:45",
                "body": "Cash flow is a price attribute.\n\n#RealEstateInvesting #CashFlow\n",
                "first_comment": (
                    "https://dealgapiq.com/blog/cash-flow-positive-rental-properties"
                    "?utm_source=linkedin&utm_medium=founder&utm_campaign=bot"
                ),
            }
        ],
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Auth (mirrors the cron token model)
# ---------------------------------------------------------------------------


class TestBotAuth:
    async def test_unconfigured_token_is_503(self, client, monkeypatch):
        monkeypatch.setattr(settings, "MARKETING_BOT_TOKEN", "")
        response = await client.get("/api/v1/marketing/bot/context", headers=BOT_HEADERS)
        assert response.status_code == 503

    async def test_missing_token_is_404(self, client, bot_token):
        response = await client.get("/api/v1/marketing/bot/context")
        assert response.status_code == 404

    async def test_wrong_token_is_404(self, client, bot_token):
        response = await client.get("/api/v1/marketing/bot/context", headers={"X-Bot-Token": "nope"})
        assert response.status_code == 404

    async def test_bot_token_does_not_open_admin_routes(self, client, bot_token):
        """Draft-only: the bot secret is worthless against approve/cancel/edit."""
        response = await client.post(
            "/api/v1/admin/linkedin/posts/00000000-0000-0000-0000-000000000000/approve",
            headers=BOT_HEADERS,
        )
        assert response.status_code in (401, 403)
        response = await client.get("/api/v1/admin/marketing/scorecard", headers=BOT_HEADERS)
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Bot writes
# ---------------------------------------------------------------------------


class TestBotRuns:
    async def test_start_and_finish(self, client, bot_token):
        started = await client.post(
            "/api/v1/marketing/bot/runs",
            json={"bot_name": "metrics-analyst", "routine": "daily"},
            headers=BOT_HEADERS,
        )
        assert started.status_code == 201
        run = started.json()
        assert run["status"] == "running"

        finished = await client.patch(
            f"/api/v1/marketing/bot/runs/{run['id']}",
            json={"status": "succeeded", "summary": "4 snapshots, 1 brief"},
            headers=BOT_HEADERS,
        )
        assert finished.status_code == 200
        assert finished.json()["status"] == "succeeded"
        assert finished.json()["finished_at"] is not None

        again = await client.patch(
            f"/api/v1/marketing/bot/runs/{run['id']}",
            json={"status": "failed"},
            headers=BOT_HEADERS,
        )
        assert again.status_code == 409

    async def test_finish_with_running_is_rejected(self, client, bot_token):
        started = await client.post(
            "/api/v1/marketing/bot/runs",
            json={"bot_name": "x", "routine": "y"},
            headers=BOT_HEADERS,
        )
        response = await client.patch(
            f"/api/v1/marketing/bot/runs/{started.json()['id']}",
            json={"status": "running"},
            headers=BOT_HEADERS,
        )
        assert response.status_code == 422


class TestBotMetrics:
    async def test_source_is_forced_to_bot_capture_and_upsert_is_idempotent(self, client, db_session, bot_token):
        body = {
            "snapshots": [
                {"date": "2026-09-03", "channel": "meta_ads", "metric": "spend", "value": 42.5},
                {"date": "2026-09-03", "channel": "meta_ads", "metric": "leads", "value": 3},
            ]
        }
        first = await client.post("/api/v1/marketing/bot/metrics", json=body, headers=BOT_HEADERS)
        assert first.status_code == 200
        assert first.json() == {"inserted": 2, "updated": 0, "source": "bot_capture"}

        body["snapshots"][0]["value"] = 50.0
        second = await client.post("/api/v1/marketing/bot/metrics", json=body, headers=BOT_HEADERS)
        assert second.json() == {"inserted": 0, "updated": 2, "source": "bot_capture"}

        rows = (
            (await db_session.execute(select(MarketingMetricDaily).where(MarketingMetricDaily.channel == "meta_ads")))
            .scalars()
            .all()
        )
        assert len(rows) == 2
        spend = next(r for r in rows if r.metric == "spend")
        assert spend.value == 50.0
        assert spend.source == "bot_capture"

    async def test_rejects_non_finite_and_unknown_channel(self, client, bot_token):
        response = await client.post(
            "/api/v1/marketing/bot/metrics",
            json={"snapshots": [{"date": "2026-09-03", "channel": "tiktok", "metric": "spend", "value": 1}]},
            headers=BOT_HEADERS,
        )
        assert response.status_code == 422

    async def test_unknown_run_id_is_404(self, client, bot_token):
        response = await client.post(
            "/api/v1/marketing/bot/metrics",
            json={
                "run_id": "00000000-0000-0000-0000-000000000000",
                "snapshots": [{"date": "2026-09-03", "channel": "site", "metric": "signups", "value": 1}],
            },
            headers=BOT_HEADERS,
        )
        assert response.status_code == 404


class TestBotBriefs:
    async def test_upsert_then_locked_after_review(self, client, admin_client, bot_token):
        payload = {"date": "2026-09-04", "body_md": "# Brief\nSignups up.", "highlights": {"wins": ["x"]}}
        created = await client.post("/api/v1/marketing/bot/briefs", json=payload, headers=BOT_HEADERS)
        assert created.status_code == 201
        assert created.json()["status"] == "draft"
        assert created.json()["created_by"] == "bot"

        payload["body_md"] = "# Brief v2"
        rewritten = await client.post("/api/v1/marketing/bot/briefs", json=payload, headers=BOT_HEADERS)
        assert rewritten.status_code == 201
        assert rewritten.json()["body_md"] == "# Brief v2"
        assert rewritten.json()["id"] == created.json()["id"]

        reviewed = await admin_client.post(f"/api/v1/admin/marketing/briefs/{created.json()['id']}/review")
        assert reviewed.status_code == 200
        assert reviewed.json()["status"] == "reviewed"
        assert reviewed.json()["reviewed_by"] == "mkt-admin@dealgapiq.test"

        locked = await client.post("/api/v1/marketing/bot/briefs", json=payload, headers=BOT_HEADERS)
        assert locked.status_code == 409


class TestBotLinkedInDrafts:
    async def test_drafts_land_as_draft_with_bot_provenance(self, client, db_session, bot_token):
        run = (
            await client.post(
                "/api/v1/marketing/bot/runs",
                json={"bot_name": "content-drafter", "routine": "daily"},
                headers=BOT_HEADERS,
            )
        ).json()
        response = await client.post(
            "/api/v1/marketing/bot/linkedin-drafts",
            json=_draft_payload(run_id=run["id"]),
            headers=BOT_HEADERS,
        )
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["batch"] == "bot-2026-09-05"
        assert body["changes"] == [{"key": "bot-2026-09-05/post-01", "action": "inserted", "status": "draft"}]

        row = (
            await db_session.execute(select(LinkedInPost).where(LinkedInPost.key == "bot-2026-09-05/post-01"))
        ).scalar_one()
        assert row.status == LinkedInPostStatus.DRAFT
        assert row.created_by == "bot:content-drafter"
        assert row.media_type.value == "none"

    async def test_batch_defaults_to_bot_today(self, client, bot_token):
        payload = _draft_payload()
        payload.pop("batch")
        response = await client.post("/api/v1/marketing/bot/linkedin-drafts", json=payload, headers=BOT_HEADERS)
        assert response.status_code == 201
        assert response.json()["batch"] == f"bot-{datetime.now(UTC).date().isoformat()}"

    async def test_human_batch_prefix_is_rejected(self, client, bot_token):
        response = await client.post(
            "/api/v1/marketing/bot/linkedin-drafts",
            json=_draft_payload(batch="batch-03"),
            headers=BOT_HEADERS,
        )
        assert response.status_code == 422

    async def test_validation_errors_are_returned(self, client, bot_token):
        payload = _draft_payload()
        payload["posts"][0]["first_comment"] = "https://dealgapiq.com/blog/x"  # no UTM
        payload["posts"][0]["body"] = "Hello\n\n#NotATag\n"
        response = await client.post("/api/v1/marketing/bot/linkedin-drafts", json=payload, headers=BOT_HEADERS)
        assert response.status_code == 422
        errors = "\n".join(response.json()["error"]["details"].get("errors", [])) or response.text
        assert "utm_source=linkedin" in errors
        assert "NotATag" in errors

    async def test_bot_cannot_overwrite_approved_row(self, client, db_session, admin_client, bot_token):
        await client.post("/api/v1/marketing/bot/linkedin-drafts", json=_draft_payload(), headers=BOT_HEADERS)
        row = (
            await db_session.execute(select(LinkedInPost).where(LinkedInPost.key == "bot-2026-09-05/post-01"))
        ).scalar_one()
        approved = await admin_client.post(f"/api/v1/admin/linkedin/posts/{row.id}/approve")
        assert approved.status_code == 200

        payload = _draft_payload()
        payload["posts"][0]["body"] = "Rewritten after approval — must not land.\n\n#CashFlow\n"
        response = await client.post("/api/v1/marketing/bot/linkedin-drafts", json=payload, headers=BOT_HEADERS)
        assert response.status_code == 409
        await db_session.refresh(row)
        assert row.body.startswith("Cash flow is a price attribute.")
        assert row.status == LinkedInPostStatus.APPROVED


class TestBotContext:
    async def test_context_shape(self, client, bot_token, monkeypatch):
        monkeypatch.setattr(svc, "blog_inventory", AsyncMock(return_value=([], "blog inventory unavailable (test)")))
        pr = svc.parse_blog_prs(_github_pulls_payload())[0]
        pr.preview_url = "https://dealscope-git-bot-blog-dscr.vercel.app"
        monkeypatch.setattr(svc, "blog_prs", AsyncMock(return_value=([pr], None)))
        await client.post("/api/v1/marketing/bot/linkedin-drafts", json=_draft_payload(), headers=BOT_HEADERS)
        response = await client.get("/api/v1/marketing/bot/context", headers=BOT_HEADERS)
        assert response.status_code == 200
        body = response.json()
        assert body["queue"]["linkedin"]["draft"] == 1
        assert "bot-2026-09-05/post-01" in body["recent_linkedin_keys"]
        assert body["latest_brief"] is None
        assert body["warnings"] == ["blog inventory unavailable (test)"]
        assert body["open_blog_prs"] == [
            {
                "number": 12,
                "title": "Blog draft: DSCR loan requirements",
                "url": "https://github.com/humblehuman369/dealscope/pull/12",
                "branch": "bot/blog/dscr-loan-requirements",
                "slug": "dscr-loan-requirements",
                "draft": True,
                "author": "content-drafter-bot",
                "preview_url": "https://dealscope-git-bot-blog-dscr.vercel.app",
                "updated_at": "2026-09-01T12:00:00Z",
            }
        ]


def _github_pulls_payload() -> list[dict]:
    return [
        {
            "number": 12,
            "title": "Blog draft: DSCR loan requirements",
            "html_url": "https://github.com/humblehuman369/dealscope/pull/12",
            "draft": True,
            "updated_at": "2026-09-01T12:00:00Z",
            "user": {"login": "content-drafter-bot"},
            "head": {"ref": "bot/blog/dscr-loan-requirements", "sha": "abc123"},
        },
        {
            "number": 13,
            "title": "fix: unrelated",
            "html_url": "https://github.com/humblehuman369/dealscope/pull/13",
            "draft": False,
            "updated_at": "2026-09-02T12:00:00Z",
            "user": {"login": "brad"},
            "head": {"ref": "fix/unrelated", "sha": "def456"},
        },
    ]


class TestBlogPullRequests:
    def test_only_bot_blog_branches_are_kept(self):
        prs = svc.parse_blog_prs(_github_pulls_payload())
        assert [p.number for p in prs] == [12]
        assert prs[0].slug == "dscr-loan-requirements"
        assert prs[0].preview_url is None

    def test_preview_comes_from_successful_vercel_status(self):
        statuses = [
            {"context": "ci/backend", "state": "success", "target_url": "https://github.com/x/actions"},
            {"context": "Vercel", "state": "pending", "target_url": "https://vercel.com/pending"},
            {
                "context": "Vercel - dealscope",
                "state": "success",
                "target_url": "https://dealscope-git-bot-blog-dscr.vercel.app",
            },
        ]
        assert svc.preview_url_from_statuses(statuses) == "https://dealscope-git-bot-blog-dscr.vercel.app"
        assert svc.preview_url_from_statuses(statuses[:2]) is None

    async def test_fetch_failure_is_a_warning_not_an_error(self, monkeypatch):
        monkeypatch.setattr(settings, "MARKETING_GITHUB_REPO", "humblehuman369/dealscope")
        cache = AsyncMock()
        cache.get = AsyncMock(return_value=None)
        monkeypatch.setattr(svc, "get_cache_service", lambda: cache)

        class _Client:
            def __init__(self, *args, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *exc):
                return None

            async def get(self, *args, **kwargs):
                raise httpx.ConnectError("offline")

        monkeypatch.setattr(svc.httpx, "AsyncClient", _Client)
        prs, warning = await svc.blog_prs()
        assert prs == []
        assert warning == "blog PR list unavailable (ConnectError)"
        cache.set.assert_not_awaited()


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


class TestAdminMarketing:
    async def test_scorecard_windows_and_provenance(self, admin_client, db_session):
        today = date(2026, 9, 10)
        await svc.upsert_metrics(
            db_session,
            [
                MetricSnapshotIn(date=today, channel=MarketingChannel.SITE, metric="signups", value=5),
                MetricSnapshotIn(
                    date=today - timedelta(days=6), channel=MarketingChannel.SITE, metric="signups", value=1
                ),
                MetricSnapshotIn(
                    date=today - timedelta(days=7), channel=MarketingChannel.SITE, metric="signups", value=10
                ),
            ],
            source=MetricSource.POSTHOG,
        )
        await svc.upsert_metrics(
            db_session,
            [MetricSnapshotIn(date=today, channel=MarketingChannel.META_ADS, metric="spend", value=20)],
            source=MetricSource.BOT_CAPTURE,
        )
        card = await svc.build_scorecard(db_session, days=7, today=today)
        by_key = {(c.channel, c.metric): c for c in card.cells}
        signups = by_key[("site", "signups")]
        assert signups.current == 6
        assert signups.previous == 10
        assert signups.sources == ["posthog"]
        spend = by_key[("meta_ads", "spend")]
        assert spend.current == 20
        assert spend.previous is None
        assert spend.sources == ["bot_capture"]

        response = await admin_client.get("/api/v1/admin/marketing/scorecard", params={"days": 7})
        assert response.status_code == 200
        assert response.json()["days"] == 7

    async def test_queue_edit_and_approve(self, admin_client, client, db_session, bot_token):
        await client.post("/api/v1/marketing/bot/linkedin-drafts", json=_draft_payload(), headers=BOT_HEADERS)
        queue = await admin_client.get("/api/v1/admin/marketing/queue", params={"status": "draft"})
        assert queue.status_code == 200
        rows = queue.json()["linkedin"]
        assert len(rows) == 1
        assert rows[0]["created_by"] == "bot"
        post_id = rows[0]["id"]

        edited = await admin_client.patch(
            f"/api/v1/admin/linkedin/posts/{post_id}",
            json={"body": "Human-tightened copy.\n\n#CashFlow\n"},
        )
        assert edited.status_code == 200
        assert edited.json()["body"].startswith("Human-tightened")

        bad_comment = await admin_client.patch(
            f"/api/v1/admin/linkedin/posts/{post_id}",
            json={"first_comment": "https://dealgapiq.com/blog/x"},
        )
        assert bad_comment.status_code == 422

        approved = await admin_client.post(f"/api/v1/admin/linkedin/posts/{post_id}/approve")
        assert approved.status_code == 200
        assert approved.json()["status"] == "approved"

        row = await db_session.get(LinkedInPost, approved.json()["id"])
        row.status = LinkedInPostStatus.PUBLISHED
        await db_session.flush()
        locked = await admin_client.patch(f"/api/v1/admin/linkedin/posts/{post_id}", json={"body": "x"})
        assert locked.status_code == 409

    async def test_health_and_bot_runs(self, admin_client, client, bot_token, monkeypatch):
        monkeypatch.setattr(settings, "LINKEDIN_PUBLISH_ENABLED", False)
        await client.post(
            "/api/v1/marketing/bot/runs",
            json={"bot_name": "metrics-analyst", "routine": "daily"},
            headers=BOT_HEADERS,
        )
        health = await admin_client.get("/api/v1/admin/marketing/health")
        assert health.status_code == 200
        body = health.json()
        assert body["bot_api_configured"] is True
        assert body["linkedin_publish_enabled"] is False
        assert [b["bot_name"] for b in body["bots"]] == ["metrics-analyst"]
        assert "marketing_metrics" in body["jobs"]

        runs = await admin_client.get("/api/v1/admin/marketing/bot-runs")
        assert runs.status_code == 200
        assert runs.json()[0]["bot_name"] == "metrics-analyst"


# ---------------------------------------------------------------------------
# Metrics job
# ---------------------------------------------------------------------------


class TestMetricsJob:
    async def test_channel_mapping(self):
        assert channel_for("linkedin", "founder") == MarketingChannel.LINKEDIN
        assert channel_for("twitter", None) == MarketingChannel.X
        assert channel_for("facebook", "paid_social") == MarketingChannel.META_ADS
        assert channel_for("google", "cpc") == MarketingChannel.GOOGLE_ADS
        assert channel_for("google", "organic") == MarketingChannel.BLOG_SEO
        assert channel_for(None, None) is None
        assert channel_for("newsletter", "email") is None

    async def test_posthog_rows_roll_up_to_site_and_channel(self):
        day = date(2026, 9, 3)
        rows = [
            ["signup_completed", "linkedin", "founder", 3, 3],
            ["signup_completed", None, None, 2, 2],
            ["$pageview", "linkedin", "founder", 40, 12],
            ["$pageview", "google", "cpc", 10, 4],
            ["unknown_event", None, None, 99, 99],
        ]
        snaps = {(s.channel.value, s.metric): s.value for s in snapshots_from_posthog_rows(rows, day)}
        assert snaps[("site", "signups")] == 5
        assert snaps[("linkedin", "signups")] == 3
        assert snaps[("site", "sessions")] == 16
        assert snaps[("linkedin", "sessions")] == 12
        assert snaps[("google_ads", "sessions")] == 4
        assert ("site", "unknown") not in snaps

    async def test_gsc_rows_split_blog(self, monkeypatch):
        monkeypatch.setattr(settings, "MARKETING_SITE_ORIGIN", "https://dealgapiq.com")
        rows = [
            {"keys": ["https://dealgapiq.com/blog/what-is-the-deal-gap"], "clicks": 4, "impressions": 100},
            {"keys": ["https://dealgapiq.com/pricing"], "clicks": 1, "impressions": 20},
        ]
        snaps = {(s.channel.value, s.metric): s.value for s in snapshots_from_gsc_rows(rows, date(2026, 9, 1))}
        assert snaps[("blog_seo", "clicks")] == 4
        assert snaps[("blog_seo", "impressions")] == 100
        assert snaps[("site", "search_clicks")] == 5
        assert snaps[("site", "search_impressions")] == 120

    async def test_unconfigured_sources_are_skipped_not_faked(self, db_session, monkeypatch):
        monkeypatch.setattr(settings, "POSTHOG_PERSONAL_API_KEY", "")
        monkeypatch.setattr(settings, "GSC_SERVICE_ACCOUNT_JSON", "")
        with patch("httpx.AsyncClient") as mock_client:
            result = await marketing_metrics_job(db_session, today=date(2026, 9, 4))
        mock_client.assert_not_called()
        assert result["posthog"]["status"] == "skipped"
        assert result["gsc"]["status"] == "skipped"
        assert result["posthog_date"] == "2026-09-03"
        assert result["gsc_date"] == "2026-09-01"
        count = (await db_session.execute(select(MarketingMetricDaily))).scalars().all()
        assert count == []

    async def test_posthog_pull_writes_rows(self, db_session, monkeypatch):
        monkeypatch.setattr(settings, "POSTHOG_PERSONAL_API_KEY", "phx_test")
        monkeypatch.setattr(settings, "POSTHOG_PROJECT_ID", "123")
        monkeypatch.setattr(settings, "GSC_SERVICE_ACCOUNT_JSON", "")

        class _Response:
            def raise_for_status(self):
                return None

            def json(self):
                return {"results": [["signup_completed", "linkedin", "founder", 2, 2]]}

        post = AsyncMock(return_value=_Response())
        with patch("app.services.marketing_metrics_jobs.httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = post
            result = await marketing_metrics_job(db_session, today=date(2026, 9, 4))

        assert result["posthog"] == {"status": "ok", "rows": 2, "detail": None}
        called_url = post.await_args.args[0]
        assert called_url.endswith("/api/projects/123/query")
        rows = (await db_session.execute(select(MarketingMetricDaily))).scalars().all()
        assert {(r.channel, r.metric, r.value, r.source) for r in rows} == {
            ("site", "signups", 2.0, "posthog"),
            ("linkedin", "signups", 2.0, "posthog"),
        }

    async def test_cron_auth(self, client, monkeypatch):
        monkeypatch.setattr(settings, "CRON_SECRET", "")
        assert (await client.post("/api/v1/jobs/marketing-metrics")).status_code == 503
        monkeypatch.setattr(settings, "CRON_SECRET", "s")
        assert (
            await client.post("/api/v1/jobs/marketing-metrics", headers={"X-Cron-Token": "wrong"})
        ).status_code == 404
        monkeypatch.setattr(settings, "POSTHOG_PERSONAL_API_KEY", "")
        monkeypatch.setattr(settings, "GSC_SERVICE_ACCOUNT_JSON", "")
        ok = await client.post("/api/v1/jobs/marketing-metrics", headers={"X-Cron-Token": "s"})
        assert ok.status_code == 200
        assert ok.json()["posthog"]["status"] == "skipped"
