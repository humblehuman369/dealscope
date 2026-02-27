"""
Admin Service - Business logic for platform administration.

This service handles:
- Platform statistics
- User management (listing, filtering, counts)
- Administrative operations

Extracted from the admin router to maintain separation of concerns.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_property import SavedProperty
from app.models.user import User

logger = logging.getLogger(__name__)


class AdminService:
    """Service for admin operations."""

    async def get_platform_stats(self, db: AsyncSession) -> dict[str, int]:
        """
        Get overall platform statistics.

        Returns:
            Dictionary with platform statistics
        """
        now = datetime.now(UTC)
        thirty_days_ago = now - timedelta(days=30)

        # Total users
        total_users_result = await db.execute(select(func.count(User.id)))
        total_users = total_users_result.scalar() or 0

        # Active users (logged in within 30 days)
        active_users_result = await db.execute(
            select(func.count(User.id)).where(User.last_login >= thirty_days_ago, User.is_active)
        )
        active_users = active_users_result.scalar() or 0

        # Total saved properties
        total_properties_result = await db.execute(select(func.count(SavedProperty.id)))
        total_properties = total_properties_result.scalar() or 0

        # New users in last 30 days
        new_users_result = await db.execute(select(func.count(User.id)).where(User.created_at >= thirty_days_ago))
        new_users_30d = new_users_result.scalar() or 0

        # Verified users
        verified_users_result = await db.execute(select(func.count(User.id)).where(User.is_verified))
        verified_users = verified_users_result.scalar() or 0

        # Admin users
        admin_users_result = await db.execute(select(func.count(User.id)).where(User.is_superuser))
        admin_users = admin_users_result.scalar() or 0

        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_properties_saved": total_properties,
            "new_users_30d": new_users_30d,
            "verified_users": verified_users,
            "admin_users": admin_users,
        }

    def _apply_user_filters(self, query, search, is_active, is_superuser):
        """Apply shared WHERE clauses for user list / count queries."""
        if search:
            search_pattern = f"%{search}%"
            query = query.where((User.email.ilike(search_pattern)) | (User.full_name.ilike(search_pattern)))
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        if is_superuser is not None:
            query = query.where(User.is_superuser == is_superuser)
        return query

    async def list_users(
        self,
        db: AsyncSession,
        search: str | None = None,
        is_active: bool | None = None,
        is_superuser: bool | None = None,
        limit: int = 50,
        offset: int = 0,
        order_by: str = "created_at_desc",
    ) -> tuple[list[dict[str, Any]], int]:
        """List users with optional filtering, ordering, and pagination.

        Returns ``(items, total_count)`` so the caller can set an
        ``X-Total-Count`` response header for the frontend.
        """
        # -- Total count (same filters, no pagination) --
        count_q = self._apply_user_filters(
            select(func.count(User.id)),
            search,
            is_active,
            is_superuser,
        )
        total = (await db.execute(count_q)).scalar() or 0

        # -- Data query --
        query = self._apply_user_filters(select(User), search, is_active, is_superuser)

        order_mapping = {
            "created_at_desc": User.created_at.desc(),
            "created_at_asc": User.created_at.asc(),
            "email_asc": User.email.asc(),
            "last_login_desc": User.last_login.desc().nullsfirst(),
        }
        query = query.order_by(order_mapping.get(order_by, User.created_at.desc()))
        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        users = result.scalars().all()

        counts_map = await self._get_user_property_counts(db, [user.id for user in users])

        items = [
            {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "is_superuser": user.is_superuser,
                "created_at": user.created_at,
                "last_login": user.last_login,
                "saved_properties_count": counts_map.get(user.id, 0),
            }
            for user in users
        ]
        return items, total

    async def _get_user_property_counts(self, db: AsyncSession, user_ids: list[UUID]) -> dict[UUID, int]:
        """Get saved property counts for multiple users."""
        if not user_ids:
            return {}

        counts_query = (
            select(SavedProperty.user_id, func.count(SavedProperty.id).label("count"))
            .where(SavedProperty.user_id.in_(user_ids))
            .group_by(SavedProperty.user_id)
        )

        counts_result = await db.execute(counts_query)
        return {row.user_id: row.count for row in counts_result}

    async def get_user_by_id(self, db: AsyncSession, user_id: UUID) -> User | None:
        """Get a user by ID."""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def update_user(self, db: AsyncSession, user_id: UUID, updates: dict[str, Any]) -> User | None:
        """
        Update a user's fields.

        Args:
            db: Database session
            user_id: User ID to update
            updates: Dictionary of fields to update

        Returns:
            Updated user or None if not found
        """
        user = await self.get_user_by_id(db, user_id)
        if not user:
            return None

        for field, value in updates.items():
            if value is not None and hasattr(user, field):
                setattr(user, field, value)

        user.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(user)
        return user

    async def delete_user(self, db: AsyncSession, user_id: UUID) -> bool:
        """
        Delete a user by ID.

        Returns True if deleted, False if not found.
        """
        user = await self.get_user_by_id(db, user_id)
        if not user:
            return False
        await db.delete(user)
        await db.commit()
        return True


# Singleton instance
admin_service = AdminService()
