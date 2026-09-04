"""X (Twitter) API v2 client for the publish queue.

Verified 2026-09-04:

- Create post: ``POST https://api.x.com/2/tweets`` with ``{"text": ...}`` and,
  for thread replies, ``{"reply": {"in_reply_to_tweet_id": ...}}``. Returns
  ``201 {"data": {"id": ..., "text": ...}}``.
- Auth: OAuth 1.0a user context (consumer key/secret + access token/secret
  from the Developer Console, app permission Read and Write). These tokens do
  not expire, so unlike LinkedIn there is no refresh path.
- Pricing: pay-per-use credits, $0.015 per post, $0.20 per post containing a
  URL. No subscription tiers remain for new accounts.

Nothing here generates or rewrites copy. ``text`` is the stored body as-is.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import secrets
import time
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

X_TWEETS_URL = "https://api.x.com/2/tweets"


class XRateLimitError(Exception):
    """HTTP 429. The job must stop and leave remaining rows approved."""


class XAuthError(Exception):
    """Credentials missing or rejected. Message is safe to return to the caller."""


class XAPIError(Exception):
    """Any other X error. Message is safe to return to the caller."""


class XTransportError(XAPIError):
    """httpx failed before a response arrived (timeout, reset, DNS)."""


class XUnknownPostState(XAPIError):
    """The create call may have landed but no id came back.

    The job must park the row as ``failed`` instead of retrying: a retry could
    create a second post. A human checks the profile before re-approving.
    """


def x_configured() -> bool:
    return bool(
        settings.X_API_KEY and settings.X_API_SECRET and settings.X_ACCESS_TOKEN and settings.X_ACCESS_TOKEN_SECRET
    )


def require_configured() -> None:
    if not x_configured():
        raise XAuthError("X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET are not all set")


def _pct(value: str) -> str:
    # RFC 3986 unreserved set only, as OAuth 1.0a requires.
    return quote(value, safe="")


def oauth1_header(
    method: str,
    url: str,
    *,
    consumer_key: str,
    consumer_secret: str,
    token: str,
    token_secret: str,
    nonce: str | None = None,
    timestamp: str | None = None,
) -> str:
    """Build the ``Authorization: OAuth ...`` header for a JSON-body request.

    With a JSON body there are no form parameters, so the signature base string
    covers only the oauth_* parameters (RFC 5849 §3.4.1.3.1).
    """
    params = {
        "oauth_consumer_key": consumer_key,
        "oauth_nonce": nonce or secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": timestamp or str(int(time.time())),
        "oauth_token": token,
        "oauth_version": "1.0",
    }
    normalized = "&".join(f"{_pct(k)}={_pct(v)}" for k, v in sorted(params.items()))
    base = "&".join([method.upper(), _pct(url), _pct(normalized)])
    key = f"{_pct(consumer_secret)}&{_pct(token_secret)}".encode()
    # HMAC-SHA1 is what OAuth 1.0a specifies; X accepts nothing else here.
    digest = hmac.new(key, base.encode(), hashlib.sha1).digest()
    params["oauth_signature"] = base64.b64encode(digest).decode()
    return "OAuth " + ", ".join(f'{_pct(k)}="{_pct(v)}"' for k, v in sorted(params.items()))


def build_post_payload(text: str, *, in_reply_to: str | None = None) -> dict[str, Any]:
    """Exact ``POST /2/tweets`` body. ``text`` is the stored body, unmodified."""
    payload: dict[str, Any] = {"text": text}
    if in_reply_to:
        payload["reply"] = {"in_reply_to_tweet_id": in_reply_to}
    return payload


class XClient:
    """Thin httpx wrapper. Construct only when ``X_PUBLISH_ENABLED`` is true."""

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client
        self._owns_client = client is None

    async def __aenter__(self) -> XClient:
        require_configured()
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self

    async def __aexit__(self, *exc: object) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("XClient must be used as an async context manager")
        return self._client

    def _headers(self, method: str, url: str) -> dict[str, str]:
        return {
            "Authorization": oauth1_header(
                method,
                url,
                consumer_key=settings.X_API_KEY,
                consumer_secret=settings.X_API_SECRET,
                token=settings.X_ACCESS_TOKEN,
                token_secret=settings.X_ACCESS_TOKEN_SECRET,
            ),
            "Content-Type": "application/json",
        }

    async def create_post(self, payload: dict[str, Any]) -> str:
        """POST one post. Returns the new post id."""
        try:
            response = await self._http().post(X_TWEETS_URL, json=payload, headers=self._headers("POST", X_TWEETS_URL))
        except httpx.HTTPError as exc:
            # The request may have reached X. Never retry blind.
            raise XUnknownPostState(
                f"create post: no response ({exc.__class__.__name__}). The post may exist on X; "
                "check the profile before re-approving this row."
            ) from exc
        if response.status_code == 429:
            raise XRateLimitError("X rate-limited this run (HTTP 429)")
        if response.status_code in {401, 403}:
            detail = (response.text or "")[:300]
            raise XAuthError(f"X rejected the credentials ({response.status_code}): {detail}")
        if response.status_code >= 400:
            detail = (response.text or "")[:400]
            raise XAPIError(f"create post failed ({response.status_code}): {detail}")
        post_id = ((response.json() or {}).get("data") or {}).get("id")
        if not post_id:
            raise XUnknownPostState(
                f"create post returned {response.status_code} without data.id. "
                "The post probably exists on X; check the profile before re-approving."
            )
        return str(post_id)
