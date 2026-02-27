"""
User repository - all database operations for User and UserProfile.

Every public method accepts an ``AsyncSession`` so the caller controls
transaction boundaries (typically the service layer wraps the call in
``async with session.begin():``).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User, UserProfile


class UserRepository:
    """Encapsulates all User/UserProfile queries."""

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        load_profile: bool = False,
        load_roles: bool = False,
    ) -> User | None:
        stmt = select(User).where(User.id == user_id)
        if load_profile:
            stmt = stmt.options(selectinload(User.profile))
        if load_roles:
            from app.models.role import Role, RolePermission, UserRole

            stmt = stmt.options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(
        self,
        db: AsyncSession,
        email: str,
        *,
        load_profile: bool = False,
        load_roles: bool = False,
    ) -> User | None:
        stmt = select(User).where(User.email == email)
        if load_profile:
            stmt = stmt.options(selectinload(User.profile))
        if load_roles:
            from app.models.role import Role, RolePermission, UserRole

            stmt = stmt.options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_oauth(
        self,
        db: AsyncSession,
        provider: str,
        oauth_id: str,
        *,
        load_roles: bool = False,
    ) -> User | None:
        """Find user by OAuth provider and provider user id."""
        stmt = select(User).where(
            User.oauth_provider == provider,
            User.oauth_id == oauth_id,
        )
        if load_roles:
            from app.models.role import Role, RolePermission, UserRole

            stmt = stmt.options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create(self, db: AsyncSession, **kwargs) -> User:
        user = User(**kwargs)
        db.add(user)
        await db.flush()
        return user

    async def update(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        **kwargs,
    ) -> None:
        kwargs["updated_at"] = datetime.now(UTC)
        await db.execute(update(User).where(User.id == user_id).values(**kwargs))

    async def update_oauth(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        oauth_provider: str,
        oauth_id: str,
        avatar_url: str | None = None,
    ) -> None:
        """Link OAuth provider to existing user; optionally set avatar_url."""
        values = {
            "oauth_provider": oauth_provider,
            "oauth_id": oauth_id,
            "updated_at": datetime.now(UTC),
        }
        if avatar_url is not None:
            values["avatar_url"] = avatar_url
        await db.execute(update(User).where(User.id == user_id).values(**values))

    async def delete(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        await db.execute(delete(User).where(User.id == user_id))

    # ------------------------------------------------------------------
    # Account lockout helpers
    # ------------------------------------------------------------------

    async def increment_failed_logins(self, db: AsyncSession, user_id: uuid.UUID) -> int:
        """Atomically increment failed_login_attempts and return the new count.

        Uses a single UPDATE … RETURNING to avoid race conditions where
        concurrent requests could both read the same count and write
        the same incremented value, potentially bypassing lockout.
        """

        result = await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                failed_login_attempts=User.failed_login_attempts + 1,
                updated_at=datetime.now(UTC),
            )
            .returning(User.failed_login_attempts)
        )
        row = result.scalar_one_or_none()
        return row if row is not None else 0

    async def reset_failed_logins(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        await self.update(db, user_id, failed_login_attempts=0, locked_until=None)

    async def lock_account(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        until: datetime,
    ) -> None:
        await self.update(db, user_id, locked_until=until)

    # ------------------------------------------------------------------
    # Profile
    # ------------------------------------------------------------------

    async def get_profile(self, db: AsyncSession, user_id: uuid.UUID) -> UserProfile | None:
        result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
        return result.scalar_one_or_none()

    async def create_profile(self, db: AsyncSession, user_id: uuid.UUID, **kwargs) -> UserProfile:
        profile = UserProfile(user_id=user_id, **kwargs)
        db.add(profile)
        await db.flush()
        return profile

    async def update_profile(self, db: AsyncSession, user_id: uuid.UUID, **kwargs) -> None:
        kwargs["updated_at"] = datetime.now(UTC)
        await db.execute(update(UserProfile).where(UserProfile.user_id == user_id).values(**kwargs))

    async def get_or_create_profile(self, db: AsyncSession, user_id: uuid.UUID) -> UserProfile:
        profile = await self.get_profile(db, user_id)
        if profile is None:
            profile = await self.create_profile(db, user_id)
        return profile


# Module-level singleton
user_repo = UserRepository()
