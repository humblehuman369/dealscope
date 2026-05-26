"""
Session service - server-side session lifecycle.

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
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.session import UserSession
from app.repositories.session_repository import session_repo
from app.services.token_service import token_service

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------
SESSION_TOKEN_BYTES = 64  # 64 url-safe bytes → ~86 chars
CLIENT_TYPE_DESKTOP = "desktop"
CLIENT_TYPE_MOBILE = "mobile"
VALID_CLIENT_TYPES = {CLIENT_TYPE_DESKTOP, CLIENT_TYPE_MOBILE}


def _generate_opaque_token() -> str:
    return secrets.token_urlsafe(SESSION_TOKEN_BYTES)


def normalize_client_type(client_type: str | None) -> str:
    if client_type in VALID_CLIENT_TYPES:
        return client_type
    return CLIENT_TYPE_DESKTOP


class SessionService:
    """Manages the lifecycle of server-side user sessions."""

    @staticmethod
    def _persistent_expires_at() -> datetime:
        return datetime.now(UTC) + timedelta(days=settings.SESSION_DEFAULT_DAYS)

    async def create_session(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
        device_name: str | None = None,
        client_type: str | None = None,
        remember_me: bool = False,
    ) -> tuple[UserSession, str]:
        """Create a new session and return (session, jwt).

        The caller is responsible for committing the transaction.
        """
        # Keep API compatibility with older clients that still send remember_me,
        # but all sessions now persist until explicit logout/revocation.
        _ = remember_me
        normalized_client_type = normalize_client_type(client_type)

        session_obj = await session_repo.create(
            db,
            user_id=user_id,
            session_token=_generate_opaque_token(),
            refresh_token=_generate_opaque_token(),
            ip_address=ip_address,
            user_agent=user_agent,
            device_name=device_name,
            client_type=normalized_client_type,
            expires_at=self._persistent_expires_at(),
        )
        await session_repo.revoke_for_user_client_type(
            db,
            user_id,
            normalized_client_type,
            except_session_id=session_obj.id,
        )

        access_jwt = token_service.create_jwt(user_id, session_obj.id)
        return session_obj, access_jwt

    async def refresh_session(
        self,
        db: AsyncSession,
        refresh_token: str,
    ) -> tuple[UserSession, str, str] | None:
        """Validate a refresh token and rotate it (with replay protection).

        Uses SELECT ... FOR UPDATE to ensure only one concurrent refresh
        request can succeed for a given token.  This prevents token replay
        attacks where a stolen refresh token is used multiple times before
        the first rotation is committed.

        Returns ``(session, new_jwt, new_refresh_token)`` or ``None``.
        """
        from sqlalchemy import select
        # Lock the row for the duration of the transaction
        stmt = (
            select(UserSession)
            .where(
                UserSession.refresh_token == refresh_token,
                UserSession.is_revoked.is_(False),
            )
            .with_for_update()
        )
        result = await db.execute(stmt)
        session_obj = result.scalar_one_or_none()

        if session_obj is None:
            return None
        # Rotate the refresh token and extend legacy short-lived sessions.
        new_refresh = _generate_opaque_token()
        new_expires_at = self._persistent_expires_at()
        session_obj.expires_at = new_expires_at
        await session_repo.update_refresh_token(
            db,
            session_obj.id,
            new_refresh,
            expires_at=new_expires_at,
        )

        new_jwt = token_service.create_jwt(session_obj.user_id, session_obj.id)
        return session_obj, new_jwt, new_refresh

    async def validate_session_from_jwt(
        self,
        db: AsyncSession,
        raw_jwt: str,
    ) -> UserSession | None:
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

        # Verify user_id matches
        if str(session_obj.user_id) != payload.get("sub"):
            return None

        # Touch last_active_at and extend legacy short-lived sessions while they remain valid.
        new_expires_at = self._persistent_expires_at()
        session_obj.expires_at = new_expires_at
        await session_repo.touch(db, session_obj.id, expires_at=new_expires_at)
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
        except_session_id: uuid.UUID | None = None,
    ) -> int:
        return await session_repo.revoke_all_for_user(db, user_id, except_session_id=except_session_id)

    async def list_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> list[UserSession]:
        return await session_repo.list_active(db, user_id)

    async def cleanup_expired(self, db: AsyncSession) -> int:
        return await session_repo.delete_expired(db)


# Module-level singleton
session_service = SessionService()
