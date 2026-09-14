"""Process-wide Axesso rate limiter.

Discovery (interactive) and map search (bulk) share one Axesso account quota.
This limiter keeps total calls under the plan cap and reserves headroom so a
map fan-out cannot starve an address lookup.
"""

from __future__ import annotations

import asyncio
import time

from app.core.config import settings

INTERACTIVE = "interactive"
BULK = "bulk"


class AxessoRateLimiter:
    """Sliding-window limiter with reserved slots for interactive callers.

    ``max_requests`` is the total budget in ``period_seconds``. Bulk callers
    cannot consume the reserved interactive slots. ``backoff`` pauses every
    waiter — used when Axesso returns 429 / Retry-After.
    """

    def __init__(
        self,
        max_requests: int = 50,
        period_seconds: float = 60.0,
        reserved_interactive: int = 10,
    ) -> None:
        if max_requests < 1:
            raise ValueError("max_requests must be >= 1")
        self.max_requests = max_requests
        self.period_seconds = period_seconds
        self.reserved_interactive = min(max(reserved_interactive, 0), max_requests)
        self._times: list[float] = []
        self._paused_until = 0.0
        self._lock = asyncio.Lock()

    def backoff(self, seconds: float) -> None:
        """Block all subsequent acquires for ``seconds`` (Retry-After)."""
        if seconds <= 0:
            return
        until = time.monotonic() + seconds
        if until > self._paused_until:
            self._paused_until = until

    def _cap_for(self, priority: str) -> int:
        if priority == INTERACTIVE:
            return self.max_requests
        return max(self.max_requests - self.reserved_interactive, 0)

    async def acquire(self, priority: str = BULK) -> None:
        """Wait until this call is inside the window for ``priority``."""
        while True:
            async with self._lock:
                now = time.monotonic()
                if now < self._paused_until:
                    wait = self._paused_until - now
                else:
                    cutoff = now - self.period_seconds
                    self._times = [t for t in self._times if t > cutoff]
                    if len(self._times) < self._cap_for(priority):
                        self._times.append(now)
                        return
                    wait = self.period_seconds - (now - self._times[0]) + 0.01
            await asyncio.sleep(max(wait, 0.01))


_shared: AxessoRateLimiter | None = None


def get_shared_axesso_limiter() -> AxessoRateLimiter:
    """Process-wide limiter shared by every ZillowClient."""
    global _shared
    if _shared is None:
        _shared = AxessoRateLimiter(
            max_requests=settings.AXESSO_MAX_RPM,
            period_seconds=60.0,
            reserved_interactive=settings.AXESSO_RESERVED_INTERACTIVE,
        )
    return _shared


def reset_shared_axesso_limiter() -> None:
    """Drop the singleton. Tests only."""
    global _shared
    _shared = None
