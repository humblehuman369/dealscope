"""
Session service – server-side session lifecycle.

A session represents a single login from a specific device.  It stores
an opaque ``session_token`` (delivered as an httpOnly cookie for web /
SecureStore for mobile) and a ``refresh_token`` used to obtain new
short-lived JWTs.

Session data lives in PostgreSQL, giving us:
 - Instant revocation (delete the row)
 - Device / session listing
 - No Redis dependency for auth
"""

from __future__ import annotations

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.session import UserSession
from app.repositories.session_repository import session_repo
from app.services.token_service import token_service

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------
SESSION_TOKEN_BYTES = 64     # 64 url-safe bytes → ~86 chars
DEFAULT_SESSION_DAYS = 7
REMEMBER_ME_SESSION_DAYS = 30


def _generate_opaque_token() -> str:
    return secrets.token_urlsafe(SESSION_TOKEN_BYTES)


class SessionService:
    """Manages the lifecycle of server-side user sessions."""

    async def create_session(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_name: Optional[str] = None,
        remember_me: bool = False,
    ) -> tuple[UserSession, str]:
        """Create a new session and return (session, jwt).

        The caller is responsible for committing the transaction.
        """
        lifetime = timedelta(
            days=REMEMBER_ME_SESSION_DAYS if remember_me else DEFAULT_SESSION_DAYS
        )

        session_obj = await session_repo.create(
            db,
            user_id=user_id,
            session_token=_generate_opaque_token(),
            refresh_token=_generate_opaque_token(),
            ip_address=ip_address,
            user_agent=user_agent,
            device_name=device_name,
            expires_at=datetime.now(timezone.utc) + lifetime,
        )

        access_jwt = token_service.create_jwt(user_id, session_obj.id)
        return session_obj, access_jwt

    async def refresh_session(
        self,
        db: AsyncSession,
        refresh_token: str,
    ) -> Optional[tuple[UserSession, str, str]]:
        """Validate a refresh token and rotate it.

        Returns ``(session, new_jwt, new_refresh_token)`` or ``None``.
        """
        session_obj = await session_repo.get_by_refresh_token(db, refresh_token)
        if session_obj is None:
            return None
        if session_obj.expires_at < datetime.now(timezone.utc):
            await session_repo.revoke(db, session_obj.id)
            return None

        # Rotate the refresh token (old one is now invalid)
        new_refresh = _generate_opaque_token()
        await session_repo.update_refresh_token(db, session_obj.id, new_refresh)

        new_jwt = token_service.create_jwt(session_obj.user_id, session_obj.id)
        return session_obj, new_jwt, new_refresh

    async def validate_session_from_jwt(
        self,
        db: AsyncSession,
        raw_jwt: str,
    ) -> Optional[UserSession]:
        """Verify a JWT and load the backing session from the DB.

        Returns the session if valid and not revoked, else None.
        """
        payload = token_service.verify_jwt(raw_jwt)
        if payload is None:
            return None

        session_id = payload.get("sid")
        if session_id is None:
            return None

        try:
            sid = uuid.UUID(session_id)
        except ValueError:
            return None

        session_obj = await session_repo.get_by_id(db, sid)
        if session_obj is None or session_obj.is_revoked:
            return None
        if session_obj.expires_at < datetime.now(timezone.utc):
            return None

        # Verify user_id matches
        if str(session_obj.user_id) != payload.get("sub"):
            return None

        # Touch last_active_at
        await session_repo.touch(db, session_obj.id)
        return session_obj

    async def revoke_session(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> None:
        await session_repo.revoke(db, session_id)

    async def revoke_all_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        except_session_id: Optional[uuid.UUID] = None,
    ) -> int:
        return await session_repo.revoke_all_for_user(
            db, user_id, except_session_id=except_session_id
        )

    async def list_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> List[UserSession]:
        return await session_repo.list_active(db, user_id)

    async def cleanup_expired(self, db: AsyncSession) -> int:
        return await session_repo.delete_expired(db)


# Module-level singleton
session_service = SessionService()
