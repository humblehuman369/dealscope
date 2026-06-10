"""Tests for scheduled-job heartbeats and the /health/jobs dead-man endpoint."""

from datetime import UTC, datetime, timedelta

import pytest

from app.services.cache_service import get_cache_service
from app.tasks.heartbeat import (
    EXPECTED_JOBS,
    SCHEDULER_HEARTBEAT_ID,
    _key,
    evaluate_job_health,
    record_heartbeat,
    with_heartbeat,
)

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
async def _clean_heartbeats():
    """Remove heartbeat keys before and after each test (cache may be shared Redis)."""
    cache = get_cache_service()

    async def _wipe():
        for job_id in [*EXPECTED_JOBS, SCHEDULER_HEARTBEAT_ID, "test_job"]:
            await cache.delete(_key(job_id))

    await _wipe()
    yield
    await _wipe()


class TestRecordHeartbeat:
    async def test_success_sets_last_success(self):
        await record_heartbeat("test_job")
        payload = await get_cache_service().get(_key("test_job"))
        assert payload["last_success"]
        assert "last_error" not in payload

    async def test_error_preserves_last_success(self):
        await record_heartbeat("test_job")
        await record_heartbeat("test_job", error="boom")
        payload = await get_cache_service().get(_key("test_job"))
        assert payload["last_success"]
        assert payload["last_error"] == "boom"
        assert payload["last_error_at"]


class TestWithHeartbeat:
    async def test_wraps_success(self):
        async def job():
            return 42

        wrapped = with_heartbeat("test_job", job)
        assert await wrapped() == 42
        payload = await get_cache_service().get(_key("test_job"))
        assert payload["last_success"]

    async def test_wraps_failure_and_reraises(self):
        async def job():
            raise RuntimeError("kaput")

        wrapped = with_heartbeat("test_job", job)
        with pytest.raises(RuntimeError, match="kaput"):
            await wrapped()
        payload = await get_cache_service().get(_key("test_job"))
        assert "kaput" in payload["last_error"]
        assert "last_success" not in payload


class TestEvaluateJobHealth:
    async def test_unknown_when_no_heartbeats(self):
        report = await evaluate_job_health()
        assert report["status"] == "ok"  # unknown is not degraded (no scheduler yet)
        assert all(j["status"] == "unknown" for j in report["jobs"].values())

    async def test_pending_first_run_after_scheduler_start(self):
        await record_heartbeat(SCHEDULER_HEARTBEAT_ID)
        report = await evaluate_job_health()
        assert report["status"] == "ok"
        assert all(j["status"] == "pending_first_run" for j in report["jobs"].values())

    async def test_ok_within_window(self):
        for job_id in EXPECTED_JOBS:
            await record_heartbeat(job_id)
        report = await evaluate_job_health()
        assert report["status"] == "ok"
        assert all(j["status"] == "ok" for j in report["jobs"].values())

    async def test_overdue_when_stale(self):
        cache = get_cache_service()
        stale = (datetime.now(UTC) - timedelta(days=30)).isoformat()
        for job_id in EXPECTED_JOBS:
            await cache.set(_key(job_id), {"last_success": stale})
        report = await evaluate_job_health()
        assert report["status"] == "degraded"
        assert all(j["status"] == "overdue" for j in report["jobs"].values())

    async def test_overdue_when_never_ran_but_scheduler_old(self):
        cache = get_cache_service()
        old = (datetime.now(UTC) - timedelta(days=30)).isoformat()
        await cache.set(_key(SCHEDULER_HEARTBEAT_ID), {"last_success": old})
        report = await evaluate_job_health()
        assert report["status"] == "degraded"
        assert all(j["status"] == "overdue" for j in report["jobs"].values())


class TestJobHealthEndpoint:
    async def test_returns_200_when_healthy(self, client):
        for job_id in EXPECTED_JOBS:
            await record_heartbeat(job_id)
        resp = await client.get("/health/jobs")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    async def test_returns_503_when_degraded(self, client):
        cache = get_cache_service()
        stale = (datetime.now(UTC) - timedelta(days=30)).isoformat()
        await cache.set(_key("sweep_expired_subscriptions"), {"last_success": stale})
        resp = await client.get("/health/jobs")
        assert resp.status_code == 503
        body = resp.json()
        assert body["status"] == "degraded"
        assert body["jobs"]["sweep_expired_subscriptions"]["status"] == "overdue"
