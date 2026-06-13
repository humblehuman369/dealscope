"""PostHog analytics client — singleton initialized at app startup."""

import atexit
import logging

try:
    from posthog import Posthog
    _POSTHOG_AVAILABLE = True
except ImportError:
    Posthog = None  # type: ignore[misc,assignment]
    _POSTHOG_AVAILABLE = False

from app.core.config import settings

logger = logging.getLogger(__name__)

posthog_client: "Posthog | None" = None


def init_posthog() -> None:
    """Initialize the PostHog client. Call once from the lifespan startup."""
    global posthog_client
    if not _POSTHOG_AVAILABLE:
        logger.warning("posthog package not installed — analytics disabled")
        return
    if settings.POSTHOG_DISABLED or not settings.POSTHOG_PROJECT_TOKEN:
        logger.info("PostHog disabled or token not set — analytics will not be captured")
        return

    posthog_client = Posthog(
        api_key=settings.POSTHOG_PROJECT_TOKEN,
        host=settings.POSTHOG_HOST,
        enable_exception_autocapture=True,
        debug=settings.DEBUG,
    )
    atexit.register(posthog_client.shutdown)
    logger.info("PostHog initialized (host=%s)", settings.POSTHOG_HOST)


def shutdown_posthog() -> None:
    """Flush and shut down the PostHog client. Call from the lifespan shutdown."""
    if posthog_client is not None:
        posthog_client.shutdown()
        logger.info("PostHog flushed and shut down")
