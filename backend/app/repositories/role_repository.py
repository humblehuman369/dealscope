"""
Role repository – database operations for RBAC.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Set

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.role import Role, Permission, RolePermission, UserRole


_PERM_CACHE_PREFIX = "perms"
_PERM_CACHE_TTL = 300  # 5 minutes


class RoleRepository:
    """Encapsulates all RBAC queries.

    ``get_user_permissions`` is hit on every authenticated request that
    checks permissions.  Results are cached for 5 minutes via the
    global CacheService (Redis when available, in-memory otherwise).
    """

    @staticmethod
    def _perm_cache_key(user_id: uuid.UUID) -> str:
        return f"{_PERM_CACHE_PREFIX}:{user_id}"

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------

    async def get_role_by_name(self, db: AsyncSession, name: str) -> Optional[Role]:
        result = await db.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()

    async def get_role_by_id(self, db: AsyncSession, role_id: uuid.UUID) -> Optional[Role]:
        result = await db.execute(select(Role).where(Role.id == role_id))
        return result.scalar_one_or_none()

    async def list_roles(self, db: AsyncSession) -> List[Role]:
        result = await db.execute(select(Role).order_by(Role.name))
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # Permissions
    # ------------------------------------------------------------------

    async def get_permission_by_codename(
        self, db: AsyncSession, codename: str
    ) -> Optional[Permission]:
        result = await db.execute(
            select(Permission).where(Permission.codename == codename)
        )
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------
    # User-Role assignment
    # ------------------------------------------------------------------

    async def _invalidate_perm_cache(self, user_id: uuid.UUID) -> None:
        """Clear the cached permissions for a user after role changes."""
        from app.services.cache_service import get_cache_service
        await get_cache_service().delete(self._perm_cache_key(user_id))

    async def assign_role(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        role_id: uuid.UUID,
        *,
        granted_by: Optional[uuid.UUID] = None,
    ) -> UserRole:
        ur = UserRole(
            user_id=user_id,
            role_id=role_id,
            granted_by=granted_by,
        )
        db.add(ur)
        await db.flush()
        await self._invalidate_perm_cache(user_id)
        return ur

    async def remove_role(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        role_id: uuid.UUID,
    ) -> None:
        await db.execute(
            delete(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.role_id == role_id,
            )
        )
        await self._invalidate_perm_cache(user_id)

    async def get_user_roles(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> List[UserRole]:
        result = await db.execute(
            select(UserRole)
            .where(UserRole.user_id == user_id)
            .options(
                selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        return list(result.scalars().all())

    async def get_user_permissions(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> Set[str]:
        """Return the set of permission codenames for a user.

        Results are cached for 5 minutes.  Cache is invalidated when
        ``assign_role`` or ``remove_role`` is called.
        """
        from app.services.cache_service import get_cache_service

        cache = get_cache_service()
        cache_key = self._perm_cache_key(user_id)
        cached = await cache.get(cache_key)
        if cached is not None:
            return set(cached)

        user_roles = await self.get_user_roles(db, user_id)
        perms: Set[str] = set()
        for ur in user_roles:
            for rp in ur.role.role_permissions:
                perms.add(rp.permission.codename)

        await cache.set(cache_key, sorted(perms), _PERM_CACHE_TTL)
        return perms

    async def user_has_permission(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        codename: str,
    ) -> bool:
        perms = await self.get_user_permissions(db, user_id)
        return codename in perms


# Module-level singleton
role_repo = RoleRepository()
