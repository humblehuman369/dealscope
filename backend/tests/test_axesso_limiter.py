"""Axesso shared limiter, Retry-After, and Discovery/map breaker isolation."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from email.utils import format_datetime
from unittest.mock import MagicMock

import pytest
from app.services.axesso_limiter import INTERACTIVE, AxessoRateLimiter
from app.services.base_client import CircuitBreaker, CircuitState, parse_retry_after
from app.services.property_service import PropertyService
from app.services.zillow_client import ZillowClient


class _HTTPResponse:
    def __init__(self, status_code: int, retry_after: str | None = None, payload: dict | None = None):
        self.status_code = status_code
        self.headers = {"Retry-After": retry_after} if retry_after else {}
        self._payload = payload or {}
        self.text = "error"

    def json(self) -> dict:
        return self._payload


class _FakeAsyncClient:
    def __init__(self, response: _HTTPResponse):
        self._response = response

    async def __aenter__(self) -> _FakeAsyncClient:
        return self

    async def __aexit__(self, *args: object) -> bool:
        return False

    async def get(self, *args: object, **kwargs: object) -> _HTTPResponse:
        return self._response

    async def post(self, *args: object, **kwargs: object) -> _HTTPResponse:
        return self._response


def _zillow(*, limiter: AxessoRateLimiter | None = None, priority: str = "bulk") -> ZillowClient:
    return ZillowClient(
        "test-key",
        rate_limiter=limiter,
        default_priority=priority,
    )


# ─── parse_retry_after ───────────────────────────────────────────────────


def test_parse_retry_after_seconds() -> None:
    assert parse_retry_after("7") == 7.0
    assert parse_retry_after(" 2.5 ") == 2.5
    assert parse_retry_after(None) is None
    assert parse_retry_after("") is None
    assert parse_retry_after("nope") is None


def test_parse_retry_after_http_date() -> None:
    when = datetime.now(UTC) + timedelta(seconds=12)
    parsed = parse_retry_after(format_datetime(when, usegmt=True))
    assert parsed is not None
    assert 10 <= parsed <= 13


# ─── limiter ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_limiter_caps_bulk_under_reserved_slots() -> None:
    limiter = AxessoRateLimiter(max_requests=3, period_seconds=1.0, reserved_interactive=1)

    await limiter.acquire("bulk")
    await limiter.acquire("bulk")

    bulk_third = asyncio.create_task(limiter.acquire("bulk"))
    await asyncio.sleep(0.05)
    assert not bulk_third.done()

    await limiter.acquire(INTERACTIVE)
    bulk_third.cancel()
    with pytest.raises(asyncio.CancelledError):
        await bulk_third


@pytest.mark.asyncio
async def test_limiter_interactive_can_use_reserved_slot() -> None:
    limiter = AxessoRateLimiter(max_requests=2, period_seconds=1.0, reserved_interactive=1)
    await limiter.acquire("bulk")
    await limiter.acquire(INTERACTIVE)
    assert len(limiter._times) == 2


@pytest.mark.asyncio
async def test_limiter_backoff_blocks_acquire() -> None:
    limiter = AxessoRateLimiter(max_requests=10, period_seconds=60.0, reserved_interactive=0)
    limiter.backoff(0.15)
    started = asyncio.get_event_loop().time()
    await limiter.acquire(INTERACTIVE)
    elapsed = asyncio.get_event_loop().time() - started
    assert elapsed >= 0.12


# ─── Retry-After on the client ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_429_without_limiter_sleeps_retry_after(monkeypatch: pytest.MonkeyPatch) -> None:
    sleeps: list[float] = []

    async def record_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr("app.services.base_client.asyncio.sleep", record_sleep)
    monkeypatch.setattr(
        "app.services.base_client.httpx.AsyncClient",
        lambda *args, **kwargs: _FakeAsyncClient(_HTTPResponse(429, retry_after="4")),
    )

    client = _zillow(limiter=None)
    result = await client.search_by_address("110 Crosswinds Dr, Greenacres, FL 33413")

    assert result.success is False
    assert result.status_code == 429
    assert sleeps == [4.0, 4.0, 4.0]


@pytest.mark.asyncio
async def test_429_pauses_shared_limiter(monkeypatch: pytest.MonkeyPatch) -> None:
    limiter = AxessoRateLimiter(max_requests=10, period_seconds=60.0, reserved_interactive=0)

    async def no_sleep(_: float) -> None:
        return None

    monkeypatch.setattr("app.services.base_client.asyncio.sleep", no_sleep)
    monkeypatch.setattr(
        "app.services.base_client.httpx.AsyncClient",
        lambda *args, **kwargs: _FakeAsyncClient(_HTTPResponse(429, retry_after="9")),
    )

    client = _zillow(limiter=limiter, priority=INTERACTIVE)
    await client.search_by_address("1 Main St")

    assert limiter._paused_until > 0


# ─── breaker isolation ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_map_breaker_does_not_open_discovery_breaker(monkeypatch: pytest.MonkeyPatch) -> None:
    shared = AxessoRateLimiter(max_requests=100, period_seconds=60.0, reserved_interactive=10)

    async def no_sleep(_: float) -> None:
        return None

    monkeypatch.setattr("app.services.base_client.asyncio.sleep", no_sleep)
    monkeypatch.setattr(
        "app.services.base_client.httpx.AsyncClient",
        lambda *args, **kwargs: _FakeAsyncClient(_HTTPResponse(429, retry_after="1")),
    )

    map_client = _zillow(limiter=shared, priority="bulk")
    discovery_client = _zillow(limiter=shared, priority=INTERACTIVE)
    map_client.circuit_breaker = CircuitBreaker(failure_threshold=1, recovery_timeout=30.0)
    discovery_client.circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=30.0)

    await map_client.search_by_url("https://www.zillow.com/homes/for_sale/")

    assert map_client.circuit_breaker is not None
    assert discovery_client.circuit_breaker is not None
    assert map_client.circuit_breaker.state == CircuitState.OPEN
    assert discovery_client.circuit_breaker.state == CircuitState.CLOSED
    assert discovery_client.circuit_breaker.can_execute() is True
    assert map_client.circuit_breaker.can_execute() is False


@pytest.mark.asyncio
async def test_discovery_still_calls_through_after_map_breaker_opens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    shared = AxessoRateLimiter(max_requests=100, period_seconds=60.0, reserved_interactive=10)
    calls: list[str] = []

    class _SwitchingClient(_FakeAsyncClient):
        def __init__(self) -> None:
            super().__init__(_HTTPResponse(200, payload={"zpid": 1}))

        async def get(self, url: str, *args: object, **kwargs: object) -> _HTTPResponse:
            calls.append(url)
            if "search-by-url" in url:
                return _HTTPResponse(429, retry_after="1")
            return _HTTPResponse(200, payload={"zpid": 42})

    async def no_sleep(_: float) -> None:
        return None

    monkeypatch.setattr("app.services.base_client.asyncio.sleep", no_sleep)
    monkeypatch.setattr(
        "app.services.base_client.httpx.AsyncClient",
        lambda *args, **kwargs: _SwitchingClient(),
    )

    map_client = _zillow(limiter=shared, priority="bulk")
    discovery_client = _zillow(limiter=shared, priority=INTERACTIVE)
    map_client.circuit_breaker = CircuitBreaker(failure_threshold=1, recovery_timeout=30.0)

    await map_client.search_by_url("https://www.zillow.com/homes/for_sale/")
    result = await discovery_client.search_by_address("110 Crosswinds Dr, Greenacres, FL 33413")

    assert map_client.circuit_breaker is not None
    assert map_client.circuit_breaker.state == CircuitState.OPEN
    assert result.success is True
    assert result.data == {"zpid": 42}
    assert any("search-by-address" in url for url in calls)


# ─── dropout event ───────────────────────────────────────────────────────


def test_axesso_dropout_reason_maps_429_and_circuit() -> None:
    resp_429 = MagicMock(status_code=429, error="Max retries exceeded")
    resp_open = MagicMock(status_code=None, error="Circuit breaker is open - service temporarily unavailable")
    assert PropertyService._axesso_dropout_reason(resp_429) == "429"
    assert PropertyService._axesso_dropout_reason(resp_open) == "circuit_open"


def test_provider_dropout_log_is_structured(caplog: pytest.LogCaptureFixture) -> None:
    svc = PropertyService.__new__(PropertyService)
    caplog.set_level(logging.INFO)
    svc._log_provider_dropout("axesso", "429", "110 Crosswinds Dr, Greenacres, FL 33413")
    assert "event=provider_dropout" in caplog.text
    assert "provider=axesso" in caplog.text
    assert "reason=429" in caplog.text
    assert "property_id=" in caplog.text
