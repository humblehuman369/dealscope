"""
Tests for admin service and RBAC enforcement on admin endpoints.
"""

import pytest
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.admin_service import admin_service
from app.services.auth_service import auth_service
from app.repositories.user_repository import user_repo
from app.repositories.role_repository import role_repo
from app.repositories.audit_repository import audit_repo
from app.models.role import Permission, RolePermission


pytestmark = pytest.mark.asyncio


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------

@pytest.fixture
async def admin_user(db_session: AsyncSession, seeded_roles):
    """Create a user with admin role and admin:* permission."""
    user = await user_repo.create(
        db_session,
        email="admin@dealgapiq.test",
        hashed_password=auth_service.hash_password("AdminPass123"),
        full_name="Admin User",
        is_active=True,
        is_verified=True,
    )
    # Assign admin role
    await role_repo.assign_role(db_session, user.id, seeded_roles["admin"].id)

    # Create admin permissions and link to admin role
    for codename in ("admin:users", "admin:stats", "admin:assumptions", "admin:metrics"):
        perm = Permission(codename=codename, description=codename)
        db_session.add(perm)
        await db_session.flush()
        rp = RolePermission(role_id=seeded_roles["admin"].id, permission_id=perm.id)
        db_session.add(rp)

    await db_session.flush()
    return user


@pytest.fixture
async def regular_user(db_session: AsyncSession, seeded_roles):
    """Create a standard member user with no admin permissions."""
    user = await user_repo.create(
        db_session,
        email="member@dealgapiq.test",
        hashed_password=auth_service.hash_password("MemberPass123"),
        full_name="Regular Member",
        is_active=True,
        is_verified=True,
    )
    await role_repo.assign_role(db_session, user.id, seeded_roles["member"].id)
    await db_session.flush()
    return user


# ------------------------------------------------------------------
# Admin service — user management
# ------------------------------------------------------------------

class TestAdminServiceUserManagement:
    async def test_list_users(self, db_session, admin_user, regular_user):
        users = await admin_service.list_users(db=db_session)
        assert len(users) >= 2
        emails = {u["email"] for u in users}
        assert "admin@dealgapiq.test" in emails
        assert "member@dealgapiq.test" in emails

    async def test_get_user_by_id(self, db_session, admin_user):
        user = await admin_service.get_user_by_id(db_session, admin_user.id)
        assert user is not None
        assert user.email == "admin@dealgapiq.test"

    async def test_get_user_not_found(self, db_session, admin_user):
        user = await admin_service.get_user_by_id(db_session, uuid.uuid4())
        assert user is None

    async def test_update_user(self, db_session, regular_user):
        updated = await admin_service.update_user(
            db_session, regular_user.id, {"full_name": "Updated Name"}
        )
        assert updated.full_name == "Updated Name"

    async def test_delete_user(self, db_session, regular_user):
        result = await admin_service.delete_user(db_session, regular_user.id)
        assert result is True

        deleted = await admin_service.get_user_by_id(db_session, regular_user.id)
        assert deleted is None


# ------------------------------------------------------------------
# RBAC enforcement
# ------------------------------------------------------------------

class TestRBACEnforcement:
    async def test_admin_has_permission(self, db_session, admin_user):
        has = await role_repo.user_has_permission(
            db_session, admin_user.id, "admin:users"
        )
        assert has is True

    async def test_member_lacks_admin_permission(self, db_session, regular_user):
        has = await role_repo.user_has_permission(
            db_session, regular_user.id, "admin:users"
        )
        assert has is False

    async def test_admin_has_stats_permission(self, db_session, admin_user):
        has = await role_repo.user_has_permission(
            db_session, admin_user.id, "admin:stats"
        )
        assert has is True


# ------------------------------------------------------------------
# Platform stats
# ------------------------------------------------------------------

class TestPlatformStats:
    async def test_get_platform_stats(self, db_session, admin_user, regular_user):
        stats = await admin_service.get_platform_stats(db_session)
        assert "total_users" in stats
        assert stats["total_users"] >= 2
        assert "active_users" in stats
