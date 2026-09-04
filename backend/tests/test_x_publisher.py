"""X publish queue: thread validation, bot drafts, admin approve/edit path,
publish job (dry run, thread order, crash resume, 429, unknown state), cron auth,
and the OAuth 1.0a signature."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from app.core.config import settings
from app.core.deps import get_current_user, get_current_verified_user
from app.main import app
from app.models.user import User
from app.models.x_post import XPost, XPostStatus
from app.services.x_batch import (
    BatchValidationError,
    import_x_batch,
    parse_x_batch,
    weighted_length,
)
from app.services.x_publish_jobs import x_publish_job
from app.services.x_publisher import (
    XRateLimitError,
    XUnknownPostState,
    oauth1_header,
)
from sqlalchemy import select

pytestmark = pytest.mark.asyncio

BOT_TOKEN = "bot-secret-for-tests"
BOT_HEADERS = {"X-Bot-Token": BOT_TOKEN}
LINK = "https://dealgapiq.com/blog/dscr-loan-requirements?utm_source=x&utm_medium=social&utm_campaign=bot"


@pytest.fixture
def bot_token(monkeypatch):
    monkeypatch.setattr(settings, "MARKETING_BOT_TOKEN", BOT_TOKEN)


@pytest.fixture
def publish_settings(monkeypatch):
    monkeypatch.setattr(settings, "X_PUBLISH_ENABLED", True)
    monkeypatch.setattr(settings, "X_API_KEY", "ck")
    monkeypatch.setattr(settings, "X_API_SECRET", "cs")
    monkeypatch.setattr(settings, "X_ACCESS_TOKEN", "at")
    monkeypatch.setattr(settings, "X_ACCESS_TOKEN_SECRET", "as")


@pytest.fixture
def mock_x_client(monkeypatch, publish_settings):
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    counter = iter(range(1, 100))
    client.create_post = AsyncMock(side_effect=lambda payload: f"id-{next(counter)}")
    monkeypatch.setattr("app.services.x_publish_jobs.XClient", lambda: client)
    return client


@pytest.fixture
async def admin_client(client, db_session, seeded_roles):
    from app.repositories.role_repository import role_repo
    from app.repositories.user_repository import user_repo
    from app.services.auth_service import auth_service

    user = await user_repo.create(
        db_session,
        email="x-admin@dealgapiq.test",
        hashed_password=auth_service.hash_password("AdminPass123"),
        full_name="X Admin",
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


def _batch(**overrides) -> dict:
    raw = {
        "batch": "bot-2026-09-08",
        "timezone": "America/New_York",
        "posts": [
            {
                "key": "dscr-check",
                "scheduled_at": "2026-09-08 09:00",
                "thread": [
                    "Most DSCR denials are not about the borrower.\n\n#DSCR",
                    f"The 60-second check we run first: {LINK}",
                ],
            }
        ],
    }
    raw.update(overrides)
    return raw


async def _row(db, key: str) -> XPost:
    return (await db.execute(select(XPost).where(XPost.key == key))).scalar_one()


async def _approve(db, key: str, *, when: datetime) -> XPost:
    row = await _row(db, key)
    row.status = XPostStatus.APPROVED.value
    row.approved_by = "test"
    row.approved_at = when
    row.scheduled_at = when
    await db.flush()
    return row


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


class TestValidation:
    def test_weighted_length_counts_urls_as_23(self):
        assert weighted_length("abc") == 3
        assert weighted_length(f"see {LINK}") == 4 + 23

    def test_valid_batch_parses(self):
        parsed = parse_x_batch(_batch())
        assert parsed.posts[0].key == "bot-2026-09-08/dscr-check"
        assert parsed.posts[0].scheduled_at.tzinfo is not None
        assert len(parsed.posts[0].thread) == 2

    def test_over_280_weighted_fails(self):
        raw = _batch()
        raw["posts"][0]["thread"] = ["x" * 281]
        with pytest.raises(BatchValidationError) as exc:
            parse_x_batch(raw)
        assert "X limit is 280" in "\n".join(exc.value.errors)

    def test_url_at_end_does_not_count_full_length(self):
        raw = _batch()
        raw["posts"][0]["thread"] = ["y" * 250 + " " + LINK]  # 251 + 23 = 274, under the cap
        parse_x_batch(raw)

    def test_site_link_without_utm_source_x_fails(self):
        raw = _batch()
        raw["posts"][0]["thread"] = ["https://dealgapiq.com/blog/x?utm_source=linkedin"]
        with pytest.raises(BatchValidationError) as exc:
            parse_x_batch(raw)
        assert "utm_source=x" in "\n".join(exc.value.errors)

    def test_hashtag_rules(self):
        raw = _batch()
        raw["posts"][0]["thread"] = ["one\n#DSCR #CashFlow #BRRRR"]
        with pytest.raises(BatchValidationError) as exc:
            parse_x_batch(raw)
        assert "max is 2" in "\n".join(exc.value.errors)
        raw["posts"][0]["thread"] = ["one\n#Crypto"]
        with pytest.raises(BatchValidationError) as exc:
            parse_x_batch(raw)
        assert "taxonomy" in "\n".join(exc.value.errors)

    def test_thread_too_long_and_duplicate_keys(self):
        raw = _batch()
        raw["posts"][0]["thread"] = ["a", "b", "c", "d", "e", "f"]
        raw["posts"].append(dict(raw["posts"][0]))
        with pytest.raises(BatchValidationError) as exc:
            parse_x_batch(raw)
        joined = "\n".join(exc.value.errors)
        assert "max is 5" in joined
        assert "duplicate key" in joined

    async def test_reimport_updates_draft_but_not_published(self, db_session):
        await import_x_batch(db_session, parse_x_batch(_batch()))
        raw = _batch()
        raw["posts"][0]["thread"] = ["edited"]
        changes = await import_x_batch(db_session, parse_x_batch(raw))
        assert changes[0].action == "updated"
        row = await _row(db_session, "bot-2026-09-08/dscr-check")
        assert row.thread_json == ["edited"]
        row.status = XPostStatus.PUBLISHED.value
        await db_session.flush()
        raw["posts"][0]["thread"] = ["edited again"]
        changes = await import_x_batch(db_session, parse_x_batch(raw))
        assert changes[0].action == "skipped_published"
        assert (await _row(db_session, "bot-2026-09-08/dscr-check")).thread_json == ["edited"]


# ---------------------------------------------------------------------------
# Bot API
# ---------------------------------------------------------------------------


class TestBotXDrafts:
    async def test_bot_queues_drafts_with_provenance(self, client, db_session, bot_token):
        run = await client.post(
            "/api/v1/marketing/bot/runs",
            json={"bot_name": "content-drafter", "routine": "daily"},
            headers=BOT_HEADERS,
        )
        payload = _batch()
        payload["run_id"] = run.json()["id"]
        res = await client.post("/api/v1/marketing/bot/x-drafts", json=payload, headers=BOT_HEADERS)
        assert res.status_code == 201, res.text
        assert res.json()["changes"][0] == {"key": "bot-2026-09-08/dscr-check", "action": "inserted", "status": "draft"}
        row = await _row(db_session, "bot-2026-09-08/dscr-check")
        assert row.created_by == "bot:content-drafter"
        assert row.status == XPostStatus.DRAFT.value

    async def test_bot_validation_errors_are_422(self, client, bot_token):
        payload = _batch()
        payload["posts"][0]["thread"] = ["z" * 300]
        res = await client.post("/api/v1/marketing/bot/x-drafts", json=payload, headers=BOT_HEADERS)
        assert res.status_code == 422
        # HTTPException bodies are normalised into the canonical error envelope.
        assert "X limit is 280" in res.json()["error"]["message"]

    async def test_bot_cannot_overwrite_approved(self, client, db_session, bot_token):
        await client.post("/api/v1/marketing/bot/x-drafts", json=_batch(), headers=BOT_HEADERS)
        await _approve(db_session, "bot-2026-09-08/dscr-check", when=datetime.now(UTC))
        res = await client.post("/api/v1/marketing/bot/x-drafts", json=_batch(), headers=BOT_HEADERS)
        assert res.status_code == 409
        assert "bot-2026-09-08/dscr-check" in res.json()["error"]["message"]
        row = await _row(db_session, "bot-2026-09-08/dscr-check")
        assert row.status == XPostStatus.APPROVED.value

    async def test_context_reports_x_queue(self, client, bot_token):
        await client.post("/api/v1/marketing/bot/x-drafts", json=_batch(), headers=BOT_HEADERS)
        ctx = await client.get("/api/v1/marketing/bot/context", headers=BOT_HEADERS)
        assert ctx.status_code == 200
        body = ctx.json()
        assert body["queue"]["x"]["draft"] == 1
        assert body["recent_x_keys"] == ["bot-2026-09-08/dscr-check"]


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


class TestAdminX:
    async def test_queue_lists_x_and_approve_edit_cancel(self, admin_client, client, db_session, bot_token):
        await client.post("/api/v1/marketing/bot/x-drafts", json=_batch(), headers=BOT_HEADERS)
        queue = await admin_client.get("/api/v1/admin/marketing/queue?status=draft")
        assert queue.status_code == 200
        rows = queue.json()["x"]
        assert len(rows) == 1
        post_id = rows[0]["id"]

        preview = await admin_client.get(f"/api/v1/admin/x/posts/{post_id}/preview")
        assert preview.status_code == 200
        bodies = preview.json()["request_bodies"]
        assert bodies[0] == {"text": "Most DSCR denials are not about the borrower.\n\n#DSCR"}
        assert bodies[1]["reply"] == {"in_reply_to_tweet_id": "<id of post 1>"}

        bad = await admin_client.patch(f"/api/v1/admin/x/posts/{post_id}", json={"thread": ["q" * 281]})
        assert bad.status_code == 422
        ok = await admin_client.patch(f"/api/v1/admin/x/posts/{post_id}", json={"thread": ["Shorter head."]})
        assert ok.status_code == 200
        assert ok.json()["thread_json"] == ["Shorter head."]

        approved = await admin_client.post(f"/api/v1/admin/x/posts/{post_id}/approve")
        assert approved.status_code == 200
        assert approved.json()["status"] == "approved"
        assert approved.json()["approved_by"] == "x-admin@dealgapiq.test"

        cancelled = await admin_client.post(f"/api/v1/admin/x/posts/{post_id}/cancel")
        assert cancelled.status_code == 200
        assert cancelled.json()["status"] == "cancelled"
        again = await admin_client.post(f"/api/v1/admin/x/posts/{post_id}/approve")
        assert again.status_code == 409

    async def test_bot_token_cannot_reach_admin_x(self, client, bot_token):
        res = await client.get("/api/v1/admin/x/posts", headers=BOT_HEADERS)
        assert res.status_code in (401, 403)

    async def test_health_reports_x(self, admin_client, monkeypatch):
        monkeypatch.setattr(settings, "X_PUBLISH_ENABLED", False)
        monkeypatch.setattr(settings, "X_API_KEY", "")
        health = await admin_client.get("/api/v1/admin/marketing/health")
        body = health.json()
        assert body["x_publish_enabled"] is False
        assert body["x_api_configured"] is False
        assert "x_publish" in body["jobs"]


# ---------------------------------------------------------------------------
# Publish job
# ---------------------------------------------------------------------------


class TestPublishJob:
    async def test_dry_run_makes_zero_outbound_calls(self, db_session, monkeypatch):
        monkeypatch.setattr(settings, "X_PUBLISH_ENABLED", False)
        await import_x_batch(db_session, parse_x_batch(_batch()))
        await _approve(db_session, "bot-2026-09-08/dscr-check", when=datetime.now(UTC) - timedelta(minutes=1))
        with patch("httpx.AsyncClient") as mock_client:
            result = await x_publish_job(db_session)
        mock_client.assert_not_called()
        assert result["dry_run"] is True
        assert result["published"] == ["bot-2026-09-08/dscr-check"]
        row = await _row(db_session, "bot-2026-09-08/dscr-check")
        assert row.status == XPostStatus.APPROVED.value
        assert row.x_post_id is None

    async def test_thread_posts_in_order_and_persists_ids(self, db_session, mock_x_client):
        await import_x_batch(db_session, parse_x_batch(_batch()))
        await _approve(db_session, "bot-2026-09-08/dscr-check", when=datetime.now(UTC) - timedelta(minutes=1))
        result = await x_publish_job(db_session)
        assert result["published"] == ["bot-2026-09-08/dscr-check"]
        calls = [c.args[0] for c in mock_x_client.create_post.await_args_list]
        assert "reply" not in calls[0]
        assert calls[1]["reply"] == {"in_reply_to_tweet_id": "id-1"}
        row = await _row(db_session, "bot-2026-09-08/dscr-check")
        assert row.status == XPostStatus.PUBLISHED.value
        assert row.x_post_id == "id-1"
        assert row.published_ids == ["id-2"]
        assert row.published_at is not None

    async def test_ignores_draft_and_future(self, db_session, mock_x_client):
        await import_x_batch(db_session, parse_x_batch(_batch()))
        await x_publish_job(db_session)
        mock_x_client.create_post.assert_not_awaited()
        await _approve(db_session, "bot-2026-09-08/dscr-check", when=datetime.now(UTC) + timedelta(hours=2))
        await x_publish_job(db_session)
        mock_x_client.create_post.assert_not_awaited()

    async def test_publishing_with_head_resumes_replies_without_second_head(self, db_session, mock_x_client):
        raw = _batch()
        raw["posts"][0]["thread"] = ["head", "reply one", "reply two"]
        await import_x_batch(db_session, parse_x_batch(raw))
        row = await _row(db_session, "bot-2026-09-08/dscr-check")
        row.status = XPostStatus.PUBLISHING.value
        row.approved_at = datetime.now(UTC)
        row.x_post_id = "head-live"
        row.published_ids = ["reply-1-live"]
        row.scheduled_at = datetime.now(UTC) - timedelta(minutes=1)
        await db_session.flush()

        result = await x_publish_job(db_session)
        assert result["published"] == ["bot-2026-09-08/dscr-check"]
        calls = [c.args[0] for c in mock_x_client.create_post.await_args_list]
        assert calls == [{"text": "reply two", "reply": {"in_reply_to_tweet_id": "reply-1-live"}}]
        repaired = await _row(db_session, "bot-2026-09-08/dscr-check")
        assert repaired.status == XPostStatus.PUBLISHED.value
        assert repaired.x_post_id == "head-live"
        assert repaired.published_ids == ["reply-1-live", "id-1"]

    async def test_429_stops_run_and_leaves_rows_approved(self, db_session, mock_x_client):
        raw = _batch()
        raw["posts"].append({"key": "second", "scheduled_at": "2026-09-08 10:00", "thread": ["second post"]})
        await import_x_batch(db_session, parse_x_batch(raw))
        past = datetime.now(UTC) - timedelta(minutes=5)
        await _approve(db_session, "bot-2026-09-08/dscr-check", when=past)
        await _approve(db_session, "bot-2026-09-08/second", when=past + timedelta(minutes=1))
        mock_x_client.create_post.side_effect = XRateLimitError("X rate-limited this run (HTTP 429)")

        result = await x_publish_job(db_session)
        assert result["published"] == []
        assert result["warnings"] == ["X rate-limited this run (HTTP 429)"]
        assert (await _row(db_session, "bot-2026-09-08/dscr-check")).status == XPostStatus.APPROVED.value
        assert (await _row(db_session, "bot-2026-09-08/second")).status == XPostStatus.APPROVED.value

    async def test_unknown_post_state_parks_row_and_never_retries(self, db_session, mock_x_client):
        await import_x_batch(db_session, parse_x_batch(_batch()))
        await _approve(db_session, "bot-2026-09-08/dscr-check", when=datetime.now(UTC) - timedelta(minutes=1))
        mock_x_client.create_post.side_effect = XUnknownPostState("create post returned 201 without data.id")

        result = await x_publish_job(db_session)
        assert result["failed"][0]["key"] == "bot-2026-09-08/dscr-check"
        row = await _row(db_session, "bot-2026-09-08/dscr-check")
        assert row.status == XPostStatus.FAILED.value
        assert row.x_post_id is None

        mock_x_client.create_post.reset_mock()
        mock_x_client.create_post.side_effect = None
        await x_publish_job(db_session)
        mock_x_client.create_post.assert_not_awaited()

    async def test_enabled_without_credentials_leaves_rows_approved(self, db_session, monkeypatch):
        monkeypatch.setattr(settings, "X_PUBLISH_ENABLED", True)
        monkeypatch.setattr(settings, "X_API_KEY", "")
        await import_x_batch(db_session, parse_x_batch(_batch()))
        await _approve(db_session, "bot-2026-09-08/dscr-check", when=datetime.now(UTC) - timedelta(minutes=1))
        with patch("httpx.AsyncClient") as mock_client:
            result = await x_publish_job(db_session)
        mock_client.assert_not_called()
        assert result["published"] == []
        assert "credentials are not set" in result["warnings"][0]
        assert (await _row(db_session, "bot-2026-09-08/dscr-check")).status == XPostStatus.APPROVED.value


# ---------------------------------------------------------------------------
# Cron auth + OAuth signature
# ---------------------------------------------------------------------------


class TestJobAuth:
    async def test_wrong_token_is_404(self, client, monkeypatch):
        monkeypatch.setattr(settings, "CRON_SECRET", "right")
        res = await client.post("/api/v1/jobs/x-publish", headers={"X-Cron-Token": "wrong"})
        assert res.status_code == 404

    async def test_valid_token_returns_200(self, client, monkeypatch):
        monkeypatch.setattr(settings, "CRON_SECRET", "right")
        monkeypatch.setattr(settings, "X_PUBLISH_ENABLED", False)
        res = await client.post("/api/v1/jobs/x-publish", headers={"X-Cron-Token": "right"})
        assert res.status_code == 200
        assert res.json()["dry_run"] is True


class TestOAuth1:
    def test_signature_matches_rfc5849_worked_example(self):
        # RFC 5849 §1.2 example values, adapted to a body-less POST.
        header = oauth1_header(
            "POST",
            "https://api.x.com/2/tweets",
            consumer_key="dpf43f3p2l4k3l03",
            consumer_secret="kd94hf93k423kf44",
            token="nnch734d00sl2jdk",
            token_secret="pfkkdhi9sl3r4s00",
            nonce="kllo9940pd9333jh",
            timestamp="1191242096",
        )
        assert header.startswith("OAuth ")
        parts = dict(p.split("=", 1) for p in header[len("OAuth ") :].split(", "))
        assert parts["oauth_consumer_key"] == '"dpf43f3p2l4k3l03"'
        assert parts["oauth_signature_method"] == '"HMAC-SHA1"'
        assert parts["oauth_version"] == '"1.0"'
        # Deterministic given fixed nonce/timestamp; value cross-checked against an
        # independent RFC 5849 implementation so a refactor cannot drift silently.
        assert parts["oauth_signature"] == '"HEboxz1rsalk%2BVnWJ%2FEDNeaeGhE%3D"'
