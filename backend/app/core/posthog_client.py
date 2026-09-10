"""PostHog analytics client — singleton initialized at app startup.

Callers do ``from app.core.posthog_client import posthog_client`` at import
time, before the lifespan runs ``init_posthog()``. A plain module global would
be bound to ``None`` in every caller forever, so ``posthog_client`` is a stable
proxy object instead. It forwards to the real client once initialized and
silently no-ops before that (or when PostHog is disabled).
"""

import atexit
import logging
from typing import Any

try:
    from posthog import Posthog
    _POSTHOG_AVAILABLE = True
except ImportError:
    Posthog = None  # type: ignore[misc,assignment]
    _POSTHOG_AVAILABLE = False

from app.core.config import settings

logger = logging.getLogger(__name__)


class _PostHogProxy:
    """Stable handle to the PostHog client; safe to import before init."""

    def __init__(self) -> None:
        self._client: "Posthog | None" = None

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def _bind(self, client: "Posthog | None") -> None:
        self._client = client

    def __getattr__(self, name: str) -> Any:
        # Only reached for attributes not defined on the proxy itself.
        client = self.__dict__.get("_client")
        if client is None:
            return _noop
        return getattr(client, name)


def _noop(*_args: Any, **_kwargs: Any) -> None:
    return None


posthog_client = _PostHogProxy()


def init_posthog() -> None:
    """Initialize the PostHog client. Call once from the lifespan startup."""
    if not _POSTHOG_AVAILABLE:
        logger.warning("posthog package not installed — analytics disabled")
        return
    if settings.POSTHOG_DISABLED or not settings.POSTHOG_PROJECT_TOKEN:
        logger.info("PostHog disabled or token not set — analytics will not be captured")
        return
    if posthog_client.enabled:
        return

    # posthog>=6 renamed the key argument (api_key -> project_api_key);
    # passing it positionally works on every version.
    client = Posthog(
        settings.POSTHOG_PROJECT_TOKEN,
        host=settings.POSTHOG_HOST,
        enable_exception_autocapture=True,
        debug=settings.DEBUG,
    )
    posthog_client._bind(client)
    atexit.register(client.shutdown)
    logger.info("PostHog initialized (host=%s)", settings.POSTHOG_HOST)


def shutdown_posthog() -> None:
    """Flush and shut down the PostHog client. Call from the lifespan shutdown."""
    if posthog_client.enabled:
        posthog_client.shutdown()
        logger.info("PostHog flushed and shut down")
