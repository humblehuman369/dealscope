"""Shared-secret auth for the draft-only marketing bot API.

Mirrors the cron-token model in ``app.routers.jobs``: 503 when the secret is
unset (the surface is disabled), 404 on a missing or wrong token so probes
learn nothing. Bots holding this token can read metrics and write drafts,
briefs, and snapshots — approve/cancel/publish stay on admin JWTs.
"""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from app.core.config import settings


def _enforce_bot_token(token: str | None) -> None:
    if not settings.MARKETING_BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Marketing bot API is disabled (MARKETING_BOT_TOKEN not configured)",
        )
    if not token or not secrets.compare_digest(token, settings.MARKETING_BOT_TOKEN):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


async def require_bot_token(
    x_bot_token: str | None = Header(default=None, alias="X-Bot-Token"),
) -> None:
    _enforce_bot_token(x_bot_token)
