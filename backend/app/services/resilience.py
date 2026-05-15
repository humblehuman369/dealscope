"""
Resilience utilities for external API calls.

Lightweight circuit-breaker + retry implementation (stdlib only).
When the project adds `tenacity`, this module can delegate to it.
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from collections import defaultdict
from functools import wraps
from typing import Any, Callable, TypeVar

from app.core.exceptions import ExternalAPIError

logger = logging.getLogger(__name__)

T = TypeVar("T")

_circuit_state: dict[str, dict[str, Any]] = defaultdict(
    lambda: {"failures": 0, "last_failure": 0.0, "state": "CLOSED"}
)


class CircuitOpenError(ExternalAPIError):
    """Raised when the circuit breaker is open for a provider."""

    def __init__(
        self,
        message: str = "Data providers are temporarily unavailable. Please try again in a few minutes.",
    ):
        super().__init__(message=message, code="PROVIDER_CIRCUIT_OPEN")


def _is_circuit_open(name: str, threshold: int, timeout: float) -> bool:
    state = _circuit_state[name]
    if state["state"] == "OPEN":
        if time.time() - state["last_failure"] > timeout:
            state["state"] = "HALF_OPEN"
            logger.info("Circuit breaker %s moved to HALF_OPEN", name)
            return False
        return True
    return False


def _record_success(name: str) -> None:
    state = _circuit_state[name]
    state["failures"] = 0
    state["state"] = "CLOSED"


def _record_failure(name: str, threshold: int) -> None:
    state = _circuit_state[name]
    state["failures"] += 1
    state["last_failure"] = time.time()
    if state["failures"] >= threshold:
        state["state"] = "OPEN"
        logger.warning("Circuit breaker OPEN for provider: %s", name)


def resilient(
    *,
    name: str,
    max_attempts: int = 3,
    circuit_breaker_threshold: int = 5,
    circuit_breaker_timeout: float = 30.0,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator adding retry + circuit breaker to async functions.

    Retries with jittered exponential backoff. Opens circuit after N failures.
    """

    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        @wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            if _is_circuit_open(name, circuit_breaker_threshold, circuit_breaker_timeout):
                raise CircuitOpenError(f"Circuit open for provider '{name}'")

            last_exc: Exception | None = None
            for attempt in range(1, max_attempts + 1):
                try:
                    result = await fn(*args, **kwargs)
                    _record_success(name)
                    return result
                except CircuitOpenError:
                    # Do not retry when the circuit is already open
                    raise
                except Exception as exc:
                    last_exc = exc
                    _record_failure(name, circuit_breaker_threshold)
                    if attempt < max_attempts:
                        delay = min(4.0, 0.5 * (2 ** (attempt - 1))) * (0.5 + random.random())
                        logger.warning(
                            "Provider %s failed (attempt %d/%d) — retrying in %.1fs: %s",
                            name,
                            attempt,
                            max_attempts,
                            delay,
                            exc,
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error("Provider %s exhausted retries: %s", name, exc)

            assert last_exc is not None
            raise last_exc

        return wrapper

    return decorator
