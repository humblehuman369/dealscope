"""Meta Conversions API client.

Posts Lead / CompleteRegistration / StartTrial / Subscribe so Meta sees
conversions when the browser pixel is blocked. Failures are logged and
never raised into the request path.
"""

from __future__ import annotations

import hashlib
import logging
import time
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.facebook.com/v21.0/{pixel_id}/events"

# Our funnel name → Meta standard event.
CAPI_EVENTS: dict[str, str] = {
    "verdict_viewed": "Lead",
    "signup_completed": "CompleteRegistration",
    "checkout_started": "StartTrial",
    "checkout_completed": "Subscribe",
    "Lead": "Lead",
    "CompleteRegistration": "CompleteRegistration",
    "StartTrial": "StartTrial",
    "Subscribe": "Subscribe",
}


def _sha256(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def _consent_allows_pii(analytics_consent: bool | None) -> bool:
    mode = (settings.META_CAPI_CONSENT_MODE or "strict").strip().lower()
    if mode == "minimal":
        return False
    return bool(analytics_consent)


def build_payload(
    *,
    event_name: str,
    event_id: str,
    event_source_url: str | None,
    email: str | None = None,
    fbc: str | None = None,
    fbp: str | None = None,
    client_ip: str | None = None,
    user_agent: str | None = None,
    analytics_consent: bool | None = None,
    event_time: int | None = None,
) -> dict[str, Any] | None:
    """Build a Graph API body, or None when this event must be dropped."""
    standard = CAPI_EVENTS.get(event_name)
    if not standard:
        return None

    mode = (settings.META_CAPI_CONSENT_MODE or "strict").strip().lower()
    if mode == "strict" and analytics_consent is False:
        return None

    user_data: dict[str, Any] = {}
    if _consent_allows_pii(analytics_consent) and email:
        user_data["em"] = [_sha256(email)]
    if fbc:
        user_data["fbc"] = fbc
    if fbp:
        user_data["fbp"] = fbp
    if client_ip:
        user_data["client_ip_address"] = client_ip
    if user_agent:
        user_data["client_user_agent"] = user_agent

    event: dict[str, Any] = {
        "event_name": standard,
        "event_time": event_time or int(time.time()),
        "event_id": event_id,
        "action_source": "website",
        "user_data": user_data,
    }
    if event_source_url:
        event["event_source_url"] = event_source_url

    return {
        "data": [event],
        "access_token": settings.META_CAPI_ACCESS_TOKEN,
    }


async def send_capi_event(
    *,
    event_name: str,
    event_id: str,
    event_source_url: str | None = None,
    email: str | None = None,
    fbc: str | None = None,
    fbp: str | None = None,
    client_ip: str | None = None,
    user_agent: str | None = None,
    analytics_consent: bool | None = None,
) -> bool:
    """POST one event. Returns True on HTTP 2xx. Never raises."""
    pixel_id = settings.META_PIXEL_ID
    token = settings.META_CAPI_ACCESS_TOKEN
    if not pixel_id or not token:
        return False

    body = build_payload(
        event_name=event_name,
        event_id=event_id,
        event_source_url=event_source_url,
        email=email,
        fbc=fbc,
        fbp=fbp,
        client_ip=client_ip,
        user_agent=user_agent,
        analytics_consent=analytics_consent,
    )
    if body is None:
        return False

    url = GRAPH_URL.format(pixel_id=quote(pixel_id, safe=""))
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(url, json=body)
        if response.status_code >= 400:
            logger.warning(
                "meta_capi_failed status=%s event=%s body=%s",
                response.status_code,
                event_name,
                response.text[:300],
            )
            return False
        return True
    except Exception:
        logger.exception("meta_capi_error event=%s", event_name)
        return False


def fbc_from_fbclid(fbclid: str | None) -> str | None:
    """Build Meta's fbc cookie value from a stored fbclid."""
    if not fbclid:
        return None
    return f"fb.1.{int(time.time())}.{fbclid}"
