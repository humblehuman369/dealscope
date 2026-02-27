"""
Verification-token repository - CRUD for one-time-use tokens.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verification_token import VerificationToken


class TokenRepository:
    """Encapsulates all VerificationToken queries."""

    async def create(self, db: AsyncSession, **kwargs) -> VerificationToken:
        token = VerificationToken(**kwargs)
        db.add(token)
        await db.flush()
        return token

    async def get_by_hash(
        self,
        db: AsyncSession,
        token_hash: str,
        token_type: str,
    ) -> VerificationToken | None:
        result = await db.execute(
            select(VerificationToken).where(
                VerificationToken.token_hash == token_hash,
                VerificationToken.token_type == token_type,
                VerificationToken.used_at.is_(None),
                VerificationToken.expires_at > datetime.now(UTC),
            )
        )
        return result.scalar_one_or_none()

    async def mark_used(self, db: AsyncSession, token_id: uuid.UUID) -> None:
        await db.execute(
            update(VerificationToken).where(VerificationToken.id == token_id).values(used_at=datetime.now(UTC))
        )

    async def invalidate_for_user(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        token_type: str,
    ) -> None:
        """Mark all unused tokens of a given type for a user as used."""
        await db.execute(
            update(VerificationToken)
            .where(
                VerificationToken.user_id == user_id,
                VerificationToken.token_type == token_type,
                VerificationToken.used_at.is_(None),
            )
            .values(used_at=datetime.now(UTC))
        )

    async def delete_expired(self, db: AsyncSession) -> int:
        cutoff = datetime.now(UTC)
        result = await db.execute(delete(VerificationToken).where(VerificationToken.expires_at < cutoff))
        return result.rowcount  # type: ignore[return-value]


# Module-level singleton
token_repo = TokenRepository()
