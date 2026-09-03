"""LinkedIn Posts / Images / Documents / Comments client.

Verified 2026-09-03 against the versioned Marketing APIs (LinkedIn-Version 202608):

- Posts: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-08
- Images: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api?view=li-lms-2026-08
- Documents: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api?view=li-lms-2026-08
- Comments: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/comments-api?view=li-lms-2026-08
- OIDC userinfo: https://api.linkedin.com/v2/userinfo
- Token refresh: https://www.linkedin.com/oauth/v2/accessToken

Nothing here generates or rewrites copy. ``commentary`` is the row body as stored.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import settings
from app.models.linkedin_post import LinkedInAccount, LinkedInMediaType, LinkedInPost

logger = logging.getLogger(__name__)

LINKEDIN_REST = "https://api.linkedin.com/rest"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

TOKEN_WARNING_DAYS = 14
DOCUMENT_READY_ATTEMPTS = 5
DOCUMENT_READY_WAIT_SECONDS = 2

_CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
}


class LinkedInRateLimitError(Exception):
    """HTTP 429. The job must stop and leave remaining rows approved."""


class LinkedInAuthError(Exception):
    """Token missing, expired, or rejected. Message is safe to return to the caller."""


class LinkedInAPIError(Exception):
    """Any other LinkedIn error. Message is safe to return to the caller."""


def rest_headers(access_token: str, *, content_type: str | None = "application/json") -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Linkedin-Version": settings.LINKEDIN_API_VERSION,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def content_type_for_path(path: str | None) -> str:
    if not path:
        return "application/octet-stream"
    lower = path.rsplit(".", 1)
    ext = f".{lower[-1].lower()}" if len(lower) == 2 else ""
    return _CONTENT_TYPES.get(ext, "application/octet-stream")


def author_urn(account: LinkedInAccount) -> str:
    if account == LinkedInAccount.FOUNDER:
        urn = settings.LINKEDIN_FOUNDER_PERSON_URN
        if not urn:
            raise LinkedInAuthError("LINKEDIN_FOUNDER_PERSON_URN is not set")
        return urn
    urn = settings.LINKEDIN_COMPANY_ORG_URN
    if not urn:
        raise LinkedInAuthError("LINKEDIN_COMPANY_ORG_URN is not set")
    return urn


def access_token(account: LinkedInAccount) -> str:
    if account == LinkedInAccount.FOUNDER:
        token = settings.LINKEDIN_FOUNDER_ACCESS_TOKEN
        if not token:
            raise LinkedInAuthError("LINKEDIN_FOUNDER_ACCESS_TOKEN is not set")
        return token
    token = settings.LINKEDIN_COMPANY_ACCESS_TOKEN
    if not token:
        raise LinkedInAuthError("LINKEDIN_COMPANY_ACCESS_TOKEN is not set")
    return token


def refresh_token(account: LinkedInAccount) -> str:
    if account == LinkedInAccount.FOUNDER:
        return settings.LINKEDIN_FOUNDER_REFRESH_TOKEN
    return settings.LINKEDIN_COMPANY_REFRESH_TOKEN


def token_expires_at(account: LinkedInAccount) -> datetime | None:
    raw = (
        settings.LINKEDIN_TOKEN_EXPIRES_AT_FOUNDER
        if account == LinkedInAccount.FOUNDER
        else settings.LINKEDIN_TOKEN_EXPIRES_AT_COMPANY
    )
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed


def company_account_configured() -> bool:
    return bool(settings.LINKEDIN_COMPANY_ACCESS_TOKEN and settings.LINKEDIN_COMPANY_ORG_URN)


def token_warnings(*, now: datetime | None = None) -> list[str]:
    """Warn 14 days before expiry when no refresh token can renew the access token."""
    now = now or datetime.now(UTC)
    warnings: list[str] = []
    for account in (LinkedInAccount.FOUNDER, LinkedInAccount.COMPANY):
        if account == LinkedInAccount.COMPANY and not company_account_configured():
            continue
        expires = token_expires_at(account)
        if expires is None:
            continue
        if refresh_token(account):
            continue
        remaining = expires - now
        if remaining <= timedelta(0):
            warnings.append(
                f"{account.value} access token expired at {expires.isoformat()}. "
                "Re-run backend/scripts/linkedin_oauth.py and update Railway."
            )
        elif remaining <= timedelta(days=TOKEN_WARNING_DAYS):
            warnings.append(
                f"{account.value} access token expires at {expires.isoformat()} "
                f"({remaining.days} days). Re-run linkedin_oauth.py before then."
            )
    return warnings


def raise_if_token_dead(account: LinkedInAccount, *, now: datetime | None = None) -> None:
    now = now or datetime.now(UTC)
    expires = token_expires_at(account)
    if expires is not None and expires <= now and not refresh_token(account):
        raise LinkedInAuthError(
            f"{account.value} access token expired at {expires.isoformat()} "
            "and no refresh token is configured. Re-run linkedin_oauth.py."
        )


def build_post_payload(
    post: LinkedInPost,
    *,
    author: str,
    media_urn: str | None = None,
    parent_urn: str | None = None,
) -> dict[str, Any]:
    """Exact Posts API body. ``commentary`` is the stored body, unmodified."""
    payload: dict[str, Any] = {
        "author": author,
        "commentary": post.body,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    if parent_urn:
        payload["reshareContext"] = {"parent": parent_urn}
    if media_urn:
        media: dict[str, Any] = {"id": media_urn}
        if post.media_type == LinkedInMediaType.DOCUMENT and post.document_title:
            media["title"] = post.document_title
        if post.media_type == LinkedInMediaType.IMAGE and post.media_alt_text:
            media["altText"] = post.media_alt_text
        payload["content"] = {"media": media}
    return payload


class LinkedInClient:
    """Thin httpx wrapper. Construct only when ``LINKEDIN_PUBLISH_ENABLED`` is true."""

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client
        self._owns_client = client is None
        # In-memory refresh for this process only. Never logged.
        self._token_overrides: dict[LinkedInAccount, str] = {}

    async def __aenter__(self) -> LinkedInClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self

    async def __aexit__(self, *exc: object) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("LinkedInClient must be used as an async context manager")
        return self._client

    def token_for(self, account: LinkedInAccount) -> str:
        return self._token_overrides.get(account) or access_token(account)

    async def ensure_fresh_token(self, account: LinkedInAccount) -> None:
        raise_if_token_dead(account)
        expires = token_expires_at(account)
        refresh = refresh_token(account)
        if not refresh:
            return
        if expires is not None and expires > datetime.now(UTC) + timedelta(minutes=5):
            return
        if not settings.LINKEDIN_CLIENT_ID or not settings.LINKEDIN_CLIENT_SECRET:
            raise LinkedInAuthError(
                f"{account.value} access token needs refresh but "
                "LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET are not set."
            )
        response = await self._http().post(
            LINKEDIN_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code != 200:
            raise LinkedInAuthError(
                f"{account.value} token refresh failed ({response.status_code}). "
                "Re-run linkedin_oauth.py and update Railway."
            )
        data = response.json()
        new_token = data.get("access_token")
        if not new_token:
            raise LinkedInAuthError(f"{account.value} token refresh returned no access_token")
        self._token_overrides[account] = new_token
        logger.warning(
            "Refreshed %s LinkedIn access token in-memory. "
            "Re-run linkedin_oauth.py and update Railway before the next process restart.",
            account.value,
        )

    async def _request(
        self,
        method: str,
        url: str,
        *,
        account: LinkedInAccount,
        json: dict[str, Any] | None = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        hdrs = headers or rest_headers(self.token_for(account))
        response = await self._http().request(method, url, json=json, content=content, headers=hdrs)
        if response.status_code == 429:
            raise LinkedInRateLimitError("LinkedIn rate-limited this run (HTTP 429)")
        if response.status_code in {401, 403}:
            raise LinkedInAuthError(
                f"LinkedIn rejected the {account.value} token ({response.status_code}). "
                "Re-run linkedin_oauth.py."
            )
        return response

    def _require_ok(self, response: httpx.Response, action: str) -> None:
        if response.status_code >= 400:
            detail = (response.text or "")[:400]
            raise LinkedInAPIError(f"{action} failed ({response.status_code}): {detail}")

    async def initialize_image_upload(self, account: LinkedInAccount, owner: str) -> tuple[str, str]:
        response = await self._request(
            "POST",
            f"{LINKEDIN_REST}/images?action=initializeUpload",
            account=account,
            json={"initializeUploadRequest": {"owner": owner}},
        )
        self._require_ok(response, "initialize image upload")
        value = response.json().get("value") or {}
        upload_url = value.get("uploadUrl")
        image_urn = value.get("image")
        if not upload_url or not image_urn:
            raise LinkedInAPIError("initialize image upload returned no uploadUrl/image")
        return str(image_urn), str(upload_url)

    async def initialize_document_upload(self, account: LinkedInAccount, owner: str) -> tuple[str, str]:
        response = await self._request(
            "POST",
            f"{LINKEDIN_REST}/documents?action=initializeUpload",
            account=account,
            json={"initializeUploadRequest": {"owner": owner}},
        )
        self._require_ok(response, "initialize document upload")
        value = response.json().get("value") or {}
        upload_url = value.get("uploadUrl")
        document_urn = value.get("document")
        if not upload_url or not document_urn:
            raise LinkedInAPIError("initialize document upload returned no uploadUrl/document")
        return str(document_urn), str(upload_url)

    async def put_bytes(self, upload_url: str, data: bytes, content_type: str) -> None:
        response = await self._http().put(
            upload_url,
            content=data,
            headers={"Content-Type": content_type},
        )
        if response.status_code == 429:
            raise LinkedInRateLimitError("LinkedIn rate-limited this run (HTTP 429)")
        if response.status_code >= 400:
            raise LinkedInAPIError(f"media PUT failed ({response.status_code})")

    async def wait_for_document(self, account: LinkedInAccount, document_urn: str) -> None:
        encoded = quote(document_urn, safe="")
        for _ in range(DOCUMENT_READY_ATTEMPTS):
            response = await self._request(
                "GET",
                f"{LINKEDIN_REST}/documents/{encoded}",
                account=account,
            )
            if response.status_code == 200:
                status = (response.json() or {}).get("status")
                if status in {None, "AVAILABLE"}:
                    return
            await asyncio.sleep(DOCUMENT_READY_WAIT_SECONDS)
        logger.info("Document %s not marked AVAILABLE after wait; posting anyway", document_urn)

    async def upload_media(self, post: LinkedInPost, owner: str) -> str | None:
        if post.media_type == LinkedInMediaType.NONE:
            return None
        if not post.media_bytes:
            raise LinkedInAPIError(f"{post.key} has {post.media_type.value} media but no stored bytes")
        ctype = content_type_for_path(post.media_path)
        if post.media_type == LinkedInMediaType.IMAGE:
            urn, url = await self.initialize_image_upload(post.account, owner)
            await self.put_bytes(url, post.media_bytes, ctype)
            return urn
        urn, url = await self.initialize_document_upload(post.account, owner)
        await self.put_bytes(url, post.media_bytes, ctype)
        await self.wait_for_document(post.account, urn)
        return urn

    async def create_post(self, account: LinkedInAccount, payload: dict[str, Any]) -> str:
        response = await self._request(
            "POST",
            f"{LINKEDIN_REST}/posts",
            account=account,
            json=payload,
        )
        self._require_ok(response, "create post")
        urn = response.headers.get("x-restli-id") or response.headers.get("X-RestLi-Id")
        if not urn:
            raise LinkedInAPIError("create post succeeded but x-restli-id was missing")
        return urn

    async def create_comment(self, account: LinkedInAccount, post_urn: str, text: str) -> str:
        encoded = quote(post_urn, safe="")
        response = await self._request(
            "POST",
            f"{LINKEDIN_REST}/socialActions/{encoded}/comments",
            account=account,
            json={
                "actor": author_urn(account),
                "object": post_urn,
                "message": {"text": text},
            },
        )
        self._require_ok(response, "create comment")
        urn = response.headers.get("x-restli-id") or response.headers.get("X-RestLi-Id")
        if not urn:
            raise LinkedInAPIError("create comment succeeded but x-restli-id was missing")
        return urn
