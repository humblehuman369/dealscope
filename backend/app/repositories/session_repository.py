"""
Session repository - database operations for UserSession.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import UserSession


class SessionRepository:
    """Encapsulates all UserSession queries."""

    async def create(self, db: AsyncSession, **kwargs) -> UserSession:
        session_obj = UserSession(**kwargs)
        db.add(session_obj)
        await db.flush()
        return session_obj

    async def get_by_id(self, db: AsyncSession, session_id: uuid.UUID) -> UserSession | None:
        result = await db.execute(select(UserSession).where(UserSession.id == session_id))
        return result.scalar_one_or_none()

    async def get_by_session_token(self, db: AsyncSession, session_token: str) -> UserSession | None:
        result = await db.execute(
            select(UserSession).where(
                UserSession.session_token == session_token,
                UserSession.is_revoked.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_refresh_token(self, db: AsyncSession, refresh_token: str) -> UserSession | None:
        result = await db.execute(
            select(UserSession).where(
                UserSession.refresh_token == refresh_token,
                UserSession.is_revoked.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def revoke(self, db: AsyncSession, session_id: uuid.UUID) -> None:
        await db.execute(update(UserSession).where(UserSession.id == session_id).values(is_revoked=True))

    async def revoke_all_for_user(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        except_session_id: uuid.UUID | None = None,
    ) -> int:
        """Revoke all active sessions for a user.  Optionally keep one."""
        stmt = (
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.is_revoked.is_(False),
            )
            .values(is_revoked=True)
        )
        if except_session_id:
            stmt = stmt.where(UserSession.id != except_session_id)
        result = await db.execute(stmt)
        return result.rowcount  # type: ignore[return-value]

    async def list_active(self, db: AsyncSession, user_id: uuid.UUID) -> list[UserSession]:
        result = await db.execute(
            select(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.is_revoked.is_(False),
            )
            .order_by(UserSession.last_active_at.desc())
        )
        return list(result.scalars().all())

    async def touch(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        *,
        expires_at: datetime | None = None,
    ) -> None:
        """Update last_active_at to now."""
        values: dict[str, datetime] = {"last_active_at": datetime.now(UTC)}
        if expires_at is not None:
            values["expires_at"] = expires_at
        await db.execute(update(UserSession).where(UserSession.id == session_id).values(**values))

    async def update_refresh_token(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        new_refresh_token: str,
        *,
        expires_at: datetime | None = None,
    ) -> None:
        values: dict[str, datetime | str] = {
            "refresh_token": new_refresh_token,
            "last_active_at": datetime.now(UTC),
        }
        if expires_at is not None:
            values["expires_at"] = expires_at
        await db.execute(
            update(UserSession)
            .where(UserSession.id == session_id)
            .values(**values)
        )

    async def has_matching_session(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> bool:
        """Return True if the user has a prior session with the same user-agent OR IP."""
        if not user_agent and not ip_address:
            return True

        conditions = [
            UserSession.user_id == user_id,
            UserSession.is_revoked.is_(False),
        ]

        ua_match = UserSession.user_agent == user_agent if user_agent else None
        ip_match = UserSession.ip_address == ip_address if ip_address else None

        or_clauses = [c for c in (ua_match, ip_match) if c is not None]
        if not or_clauses:
            return True

        from sqlalchemy import or_

        conditions.append(or_(*or_clauses))

        result = await db.execute(select(UserSession.id).where(*conditions).limit(1))
        return result.scalar_one_or_none() is not None

    async def delete_expired(self, db: AsyncSession) -> int:
        """Remove revoked sessions. Active sessions persist until explicit logout/revocation."""
        result = await db.execute(delete(UserSession).where(UserSession.is_revoked.is_(True)))
        return result.rowcount  # type: ignore[return-value]


# Module-level singleton
session_repo = SessionRepository()
