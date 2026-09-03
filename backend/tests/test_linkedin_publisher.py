"""LinkedIn batch import, publish job, and cron auth."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from app.core.config import settings
from app.core.deps import get_current_user, get_current_verified_user
from app.main import app
from app.models.linkedin_post import (
    LinkedInAccount,
    LinkedInMediaType,
    LinkedInPost,
    LinkedInPostStatus,
)
from app.models.user import User
from app.services.linkedin_batch import BatchValidationError, import_batch, parse_batch_data
from app.services.linkedin_publish_jobs import linkedin_publish_job
from app.services.linkedin_publisher import LinkedInAPIError, LinkedInRateLimitError
from sqlalchemy import select
from sqlalchemy.orm import undefer

pytestmark = pytest.mark.asyncio

FOUNDER_URN = "urn:li:person:testfounder"
COMPANY_URN = "urn:li:organization:testdgiq"


def _write_asset(root: Path, rel: str, data: bytes = b"png") -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def _valid_batch(tmp_path: Path, *, extra_posts: list[dict] | None = None) -> dict:
    _write_asset(tmp_path, "assets/batch-01/shot.png")
    posts = [
        {
            "key": "post-01",
            "account": "founder",
            "scheduled_at": "2026-09-07 07:45",
            "media_type": "image",
            "media_path": "assets/batch-01/shot.png",
            "media_alt_text": "Monthly cash flow table for the $325K example",
            "first_comment": (
                "https://dealgapiq.com/blog/cash-flow-positive-rental-properties"
                "?utm_source=linkedin&utm_medium=founder"
                "&utm_campaign=blog_distribution&utm_content=cash-flow-positive-rental-properties"
            ),
            "body": "Cash flow is a price attribute.\n\n#RealEstateInvesting #CashFlow\n",
        },
        {
            "key": "post-01-reshare",
            "account": "company",
            "reshare_of_key": "post-01",
            "scheduled_at": "2026-09-07 12:00",
            "media_type": "none",
            "first_comment": (
                "https://dealgapiq.com/blog/cash-flow-positive-rental-properties"
                "?utm_source=linkedin&utm_medium=company_page"
                "&utm_campaign=blog_distribution&utm_content=cash-flow-positive-rental-properties"
            ),
            "body": "The first thing Discovery does with any address is solve for this price.",
        },
    ]
    if extra_posts:
        posts.extend(extra_posts)
    return {"batch": "batch-01", "timezone": "America/New_York", "posts": posts}


async def _import(db, tmp_path: Path, raw: dict):
    parsed = parse_batch_data(raw, source_dir=tmp_path)
    return await import_batch(db, parsed)


async def _row(db, key: str) -> LinkedInPost:
    return (
        await db.execute(
            select(LinkedInPost).options(undefer(LinkedInPost.media_bytes)).where(LinkedInPost.key == key)
        )
    ).scalar_one()


async def _approve(db, key: str, *, when: datetime | None = None) -> LinkedInPost:
    row = await _row(db, key)
    row.status = LinkedInPostStatus.APPROVED
    row.approved_at = datetime.now(UTC)
    row.approved_by = "test@dealgapiq.test"
    if when is not None:
        row.scheduled_at = when
    await db.flush()
    return row


@pytest.fixture
def publish_settings(monkeypatch):
    monkeypatch.setattr(settings, "LINKEDIN_PUBLISH_ENABLED", True)
    monkeypatch.setattr(settings, "LINKEDIN_FOUNDER_ACCESS_TOKEN", "founder-token")
    monkeypatch.setattr(settings, "LINKEDIN_FOUNDER_PERSON_URN", FOUNDER_URN)
    monkeypatch.setattr(settings, "LINKEDIN_COMPANY_ACCESS_TOKEN", "company-token")
    monkeypatch.setattr(settings, "LINKEDIN_COMPANY_ORG_URN", COMPANY_URN)
    monkeypatch.setattr(settings, "LINKEDIN_FOUNDER_REFRESH_TOKEN", "")
    monkeypatch.setattr(settings, "LINKEDIN_COMPANY_REFRESH_TOKEN", "")
    monkeypatch.setattr(settings, "LINKEDIN_TOKEN_EXPIRES_AT_FOUNDER", "")
    monkeypatch.setattr(settings, "LINKEDIN_TOKEN_EXPIRES_AT_COMPANY", "")


@pytest.fixture
def mock_li_client(monkeypatch, publish_settings):
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    client.ensure_fresh_token = AsyncMock()
    client.upload_media = AsyncMock(return_value="urn:li:image:abc")
    client.create_post = AsyncMock(return_value="urn:li:share:1")
    client.create_comment = AsyncMock(return_value="urn:li:comment:1")

    monkeypatch.setattr("app.services.linkedin_publish_jobs.LinkedInClient", lambda: client)
    return client


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------


class TestImportBatch:
    async def test_valid_batch_upserts(self, db_session, tmp_path):
        changes = await _import(db_session, tmp_path, _valid_batch(tmp_path))
        assert {c.action for c in changes} == {"inserted"}
        assert {c.status for c in changes} == {"draft"}
        row = await _row(db_session, "batch-01/post-01")
        assert row.account == LinkedInAccount.FOUNDER
        assert row.media_type == LinkedInMediaType.IMAGE
        assert row.media_bytes == b"png"
        assert row.body.startswith("Cash flow is a price attribute.")
        reshare = await _row(db_session, "batch-01/post-01-reshare")
        assert reshare.reshare_of_key == "batch-01/post-01"

    async def test_missing_asset_lists_every_file(self, tmp_path):
        raw = _valid_batch(tmp_path)
        (tmp_path / "assets/batch-01/shot.png").unlink()
        raw["posts"].append(
            {
                "key": "post-02",
                "account": "founder",
                "scheduled_at": "2026-09-08 08:00",
                "media_type": "document",
                "media_path": "assets/batch-01/missing.pdf",
                "document_title": "Carousel",
                "first_comment": "https://dealgapiq.com/blog/x?utm_source=linkedin&utm_medium=founder&utm_campaign=blog_distribution&utm_content=x",
                "body": "Text\n\n#RealEstateInvesting\n",
            }
        )
        with pytest.raises(BatchValidationError) as exc:
            parse_batch_data(raw, source_dir=tmp_path)
        joined = "\n".join(exc.value.errors)
        assert "shot.png" in joined
        assert "missing.pdf" in joined
        assert "2 missing asset" in joined

    async def test_hashtag_outside_taxonomy_fails(self, tmp_path):
        raw = _valid_batch(tmp_path)
        raw["posts"][0]["body"] = "Hello\n\n#RealEstateInvesting #NotARealTag\n"
        with pytest.raises(BatchValidationError) as exc:
            parse_batch_data(raw, source_dir=tmp_path)
        assert any("NotARealTag" in e for e in exc.value.errors)

    async def test_reimport_does_not_touch_published(self, db_session, tmp_path):
        raw = _valid_batch(tmp_path)
        await _import(db_session, tmp_path, raw)
        row = await _row(db_session, "batch-01/post-01")
        row.status = LinkedInPostStatus.PUBLISHED
        row.linkedin_post_urn = "urn:li:share:already"
        row.body = "ORIGINAL BODY"
        await db_session.flush()

        raw["posts"][0]["body"] = "Rewritten by a human? No — still must not land.\n\n#CashFlow\n"
        changes = await _import(db_session, tmp_path, raw)
        skipped = [c for c in changes if c.key == "batch-01/post-01"]
        assert skipped[0].action == "skipped_published"
        assert (await _row(db_session, "batch-01/post-01")).body == "ORIGINAL BODY"


# ---------------------------------------------------------------------------
# Job
# ---------------------------------------------------------------------------


class TestPublishJob:
    async def test_publishes_due_approved_only(self, db_session, tmp_path, mock_li_client):
        await _import(db_session, tmp_path, _valid_batch(tmp_path))
        past = datetime.now(UTC) - timedelta(minutes=5)
        await _approve(db_session, "batch-01/post-01", when=past)
        # draft reshare stays draft
        result = await linkedin_publish_job(db_session)
        assert result["published"] == ["batch-01/post-01"]
        assert result["dry_run"] is False
        row = await _row(db_session, "batch-01/post-01")
        assert row.status == LinkedInPostStatus.PUBLISHED
        assert row.linkedin_post_urn == "urn:li:share:1"
        assert row.linkedin_comment_urn == "urn:li:comment:1"
        mock_li_client.create_post.assert_awaited_once()
        draft = await _row(db_session, "batch-01/post-01-reshare")
        assert draft.status == LinkedInPostStatus.DRAFT

    async def test_ignores_draft(self, db_session, tmp_path, mock_li_client):
        await _import(db_session, tmp_path, _valid_batch(tmp_path))
        result = await linkedin_publish_job(db_session)
        assert result["published"] == []
        mock_li_client.create_post.assert_not_awaited()

    async def test_respects_scheduled_at(self, db_session, tmp_path, mock_li_client):
        await _import(db_session, tmp_path, _valid_batch(tmp_path))
        future = datetime.now(UTC) + timedelta(days=1)
        await _approve(db_session, "batch-01/post-01", when=future)
        result = await linkedin_publish_job(db_session)
        assert result["published"] == []
        assert (await _row(db_session, "batch-01/post-01")).status == LinkedInPostStatus.APPROVED

    async def test_company_reshare_waits_for_parent_urn(self, db_session, tmp_path, mock_li_client):
        await _import(db_session, tmp_path, _valid_batch(tmp_path))
        past = datetime.now(UTC) - timedelta(minutes=5)
        await _approve(db_session, "batch-01/post-01-reshare", when=past)
        # parent still draft
        result = await linkedin_publish_job(db_session)
        assert result["skipped_waiting_parent"] == ["batch-01/post-01-reshare"]
        assert result["published"] == []
        mock_li_client.create_post.assert_not_awaited()
        assert (await _row(db_session, "batch-01/post-01-reshare")).status == LinkedInPostStatus.APPROVED

    async def test_dry_run_makes_zero_outbound_calls(self, db_session, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "LINKEDIN_PUBLISH_ENABLED", False)
        monkeypatch.setattr(settings, "LINKEDIN_FOUNDER_PERSON_URN", FOUNDER_URN)
        await _import(db_session, tmp_path, _valid_batch(tmp_path))
        await _approve(db_session, "batch-01/post-01", when=datetime.now(UTC) - timedelta(minutes=1))
        with patch("httpx.AsyncClient") as mock_client:
            result = await linkedin_publish_job(db_session)
        assert result["dry_run"] is True
        assert result["published"] == ["batch-01/post-01"]
        mock_client.assert_not_called()
        row = await _row(db_session, "batch-01/post-01")
        assert row.status == LinkedInPostStatus.APPROVED
        assert row.linkedin_post_urn is None

    async def test_publishing_with_urn_is_repaired_without_second_create(
        self, db_session, tmp_path, mock_li_client
    ):
        await _import(db_session, tmp_path, _valid_batch(tmp_path))
        row = await _row(db_session, "batch-01/post-01")
        row.status = LinkedInPostStatus.PUBLISHING
        row.approved_at = datetime.now(UTC)
        row.linkedin_post_urn = "urn:li:share:already-posted"
        row.scheduled_at = datetime.now(UTC) - timedelta(minutes=1)
        await db_session.flush()

        result = await linkedin_publish_job(db_session)
        assert result["published"] == ["batch-01/post-01"]
        mock_li_client.create_post.assert_not_awaited()
        repaired = await _row(db_session, "batch-01/post-01")
        assert repaired.status == LinkedInPostStatus.PUBLISHED
        assert repaired.linkedin_post_urn == "urn:li:share:already-posted"

    async def test_429_stops_run_and_leaves_rows_approved(
        self, db_session, tmp_path, mock_li_client
    ):
        raw = _valid_batch(tmp_path)
        raw["posts"].append(
            {
                "key": "post-02",
                "account": "founder",
                "scheduled_at": "2026-09-08 08:00",
                "media_type": "none",
                "first_comment": "https://dealgapiq.com/blog/x?utm_source=linkedin&utm_medium=founder&utm_campaign=blog_distribution&utm_content=x",
                "body": "Second due post\n\n#RealEstateInvesting\n",
            }
        )
        await _import(db_session, tmp_path, raw)
        past = datetime.now(UTC) - timedelta(minutes=5)
        await _approve(db_session, "batch-01/post-01", when=past)
        await _approve(db_session, "batch-01/post-02", when=past + timedelta(minutes=1))
        mock_li_client.create_post.side_effect = LinkedInRateLimitError("LinkedIn rate-limited this run (HTTP 429)")

        result = await linkedin_publish_job(db_session)
        assert result["published"] == []
        assert (await _row(db_session, "batch-01/post-01")).status == LinkedInPostStatus.APPROVED
        assert (await _row(db_session, "batch-01/post-02")).status == LinkedInPostStatus.APPROVED

    async def test_comment_failure_leaves_post_published(self, db_session, tmp_path, mock_li_client):
        await _import(db_session, tmp_path, _valid_batch(tmp_path))
        await _approve(db_session, "batch-01/post-01", when=datetime.now(UTC) - timedelta(minutes=1))
        mock_li_client.create_comment.side_effect = LinkedInAPIError("create comment failed (500)")

        result = await linkedin_publish_job(db_session)
        assert "batch-01/post-01" in result["published"]
        assert result["failed"][0]["key"] == "batch-01/post-01"
        row = await _row(db_session, "batch-01/post-01")
        assert row.status == LinkedInPostStatus.PUBLISHED
        assert row.linkedin_post_urn == "urn:li:share:1"
        assert row.linkedin_comment_urn is None
        assert row.error and "comment failed" in row.error


# ---------------------------------------------------------------------------
# Cron auth (identical to the other jobs: 503 when unset, 404 when wrong)
# ---------------------------------------------------------------------------


class TestJobAuth:
    async def test_missing_cron_secret_is_503(self, client, monkeypatch):
        monkeypatch.setattr(settings, "CRON_SECRET", "")
        response = await client.post("/api/v1/jobs/linkedin-publish")
        assert response.status_code == 503

    async def test_wrong_token_is_404(self, client, monkeypatch):
        monkeypatch.setattr(settings, "CRON_SECRET", "correct-secret")
        response = await client.post(
            "/api/v1/jobs/linkedin-publish",
            headers={"X-Cron-Token": "wrong"},
        )
        assert response.status_code == 404

    async def test_valid_token_returns_200(self, client, monkeypatch):
        monkeypatch.setattr(settings, "CRON_SECRET", "correct-secret")
        monkeypatch.setattr(settings, "LINKEDIN_PUBLISH_ENABLED", False)
        response = await client.post(
            "/api/v1/jobs/linkedin-publish",
            headers={"X-Cron-Token": "correct-secret"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["dry_run"] is True
        assert body["published"] == []


# ---------------------------------------------------------------------------
# Admin approve / preview
# ---------------------------------------------------------------------------


@pytest.fixture
async def admin_client(client, db_session, seeded_roles):
    from app.repositories.role_repository import role_repo
    from app.repositories.user_repository import user_repo
    from app.services.auth_service import auth_service

    user = await user_repo.create(
        db_session,
        email="li-admin@dealgapiq.test",
        hashed_password=auth_service.hash_password("AdminPass123"),
        full_name="LI Admin",
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


class TestAdminLinkedIn:
    async def test_list_approve_preview(self, admin_client, db_session, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "LINKEDIN_FOUNDER_PERSON_URN", FOUNDER_URN)
        await _import(db_session, tmp_path, _valid_batch(tmp_path))
        listed = await admin_client.get("/api/v1/admin/linkedin/posts", params={"batch": "batch-01"})
        assert listed.status_code == 200
        rows = listed.json()
        assert len(rows) == 2
        post_id = next(r["id"] for r in rows if r["key"] == "batch-01/post-01")

        preview = await admin_client.get(f"/api/v1/admin/linkedin/posts/{post_id}/preview")
        assert preview.status_code == 200
        body = preview.json()["request_body"]
        assert body["commentary"].startswith("Cash flow is a price attribute.")
        assert body["author"] == FOUNDER_URN
        assert body["visibility"] == "PUBLIC"

        approved = await admin_client.post(f"/api/v1/admin/linkedin/posts/{post_id}/approve")
        assert approved.status_code == 200
        assert approved.json()["status"] == "approved"
        assert approved.json()["approved_by"] == "li-admin@dealgapiq.test"

    async def test_cancel(self, admin_client, db_session, tmp_path):
        await _import(db_session, tmp_path, _valid_batch(tmp_path))
        post_id = str((await _row(db_session, "batch-01/post-01")).id)
        cancelled = await admin_client.post(f"/api/v1/admin/linkedin/posts/{post_id}/cancel")
        assert cancelled.status_code == 200
        assert cancelled.json()["status"] == "cancelled"
