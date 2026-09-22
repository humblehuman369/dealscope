"""A provider 429 is a rate limit, not an outage: it must not open the breaker.

With eight Zillow calls in flight, the first 429 burst used to count three
failures per call, open the shared circuit breaker, and block every Zillow
caller on the server — including Discovery — until the recovery timeout.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.base_client import BaseAPIClient, BaseAPIResponse, CircuitState


class _Client(BaseAPIClient[BaseAPIResponse]):
    def _get_headers(self) -> dict[str, str]:
        return {}

    def _create_response(
        self,
        success: bool,
        data: dict[str, Any] | None,
        error: str | None,
        status_code: int | None,
        raw_response: dict[str, Any] | None = None,
        **kwargs,
    ) -> BaseAPIResponse:
        return BaseAPIResponse(
            success=success, data=data, error=error, status_code=status_code, raw_response=raw_response
        )

    def _get_provider_name(self) -> str:
        return "test"


def _http_client_returning(status_code: int) -> MagicMock:
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.text = ""
    client = MagicMock()
    client.get = AsyncMock(return_value=response)
    ctx = MagicMock()
    ctx.__aenter__ = AsyncMock(return_value=client)
    ctx.__aexit__ = AsyncMock(return_value=False)
    return ctx


@pytest.mark.asyncio
async def test_exhausted_429_retries_do_not_open_the_circuit_breaker() -> None:
    client = _Client(api_key="k", base_url="https://example.test", max_retries=3)
    assert client.circuit_breaker is not None
    client.circuit_breaker.failure_threshold = 1  # one recorded failure would open it

    with (
        patch("httpx.AsyncClient", return_value=_http_client_returning(429)),
        patch("asyncio.sleep", new=AsyncMock()) as sleep,
    ):
        result = await client._make_request("search")

    assert result.success is False
    assert result.status_code == 429
    # Retried with the retry-after wait, then gave up without a fourth attempt.
    assert sleep.await_count == 2
    # The breaker stays closed and the next call is allowed through.
    assert client.circuit_breaker.state == CircuitState.CLOSED
    assert client.circuit_breaker.failures == 0
    assert client.circuit_breaker.can_execute()


@pytest.mark.asyncio
async def test_server_errors_still_count_toward_the_circuit_breaker() -> None:
    """Contrast case: a 500 is an outage signal and must still be recorded."""
    client = _Client(api_key="k", base_url="https://example.test", max_retries=3)
    assert client.circuit_breaker is not None
    client.circuit_breaker.failure_threshold = 1

    with patch("httpx.AsyncClient", return_value=_http_client_returning(500)):
        result = await client._make_request("search")

    assert result.success is False
    assert client.circuit_breaker.state == CircuitState.OPEN
