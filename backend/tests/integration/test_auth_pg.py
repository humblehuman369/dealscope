"""
Integration tests for auth flows against real PostgreSQL.

Exercises registration, login, session creation, and MFA — all of which
touch ARRAY, JSON, and RETURNING clauses that diverge on SQLite.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.auth_service import auth_service
from app.services.session_service import session_service
from app.repositories.user_repository import user_repo
from app.repositories.role_repository import role_repo
from app.models.role import Role


pytestmark = pytest.mark.asyncio


async def _seed_member_role(db: AsyncSession) -> Role:
    role = Role(name="member", description="Standard user")
    db.add(role)
    await db.flush()
    return role


class TestRegistrationFlow:
    async def test_register_creates_user(self, pg_session: AsyncSession):
        role = await _seed_member_role(pg_session)
        user, token = await auth_service.register_user(
            pg_session,
            email="alice@example.com",
            password="StrongP@ss1",
            full_name="Alice Test",
        )
        await pg_session.commit()
        assert user.email == "alice@example.com"
        assert user.is_active is True
        assert token  # verification token returned

    async def test_duplicate_email_raises(self, pg_session: AsyncSession):
        await _seed_member_role(pg_session)
        await auth_service.register_user(
            pg_session, email="dup@example.com", password="StrongP@ss1", full_name="Dup"
        )
        await pg_session.commit()
        with pytest.raises(Exception):
            await auth_service.register_user(
                pg_session, email="dup@example.com", password="StrongP@ss1", full_name="Dup2"
            )


class TestLoginFlow:
    async def test_login_returns_session(self, pg_session: AsyncSession):
        await _seed_member_role(pg_session)
        user, _ = await auth_service.register_user(
            pg_session, email="bob@example.com", password="StrongP@ss1", full_name="Bob"
        )
        user.is_verified = True
        await pg_session.commit()

        session_obj, jwt_token = await session_service.create_session(
            pg_session, user.id, ip_address="127.0.0.1", user_agent="test"
        )
        await pg_session.commit()
        assert session_obj.user_id == user.id
        assert jwt_token


class TestSavedPropertyPg:
    async def test_save_and_retrieve(self, pg_session: AsyncSession):
        """Ensure SavedProperty JSONB and ARRAY columns work on real Postgres."""
        await _seed_member_role(pg_session)
        user, _ = await auth_service.register_user(
            pg_session, email="carol@example.com", password="StrongP@ss1", full_name="Carol"
        )
        await pg_session.commit()

        from app.models.saved_property import SavedProperty
        sp = SavedProperty(
            user_id=user.id,
            address_street="123 Main St",
            address_city="Austin",
            address_state="TX",
            address_zip="78701",
            full_address="123 Main St, Austin, TX 78701",
            tags=["investment", "duplex"],
            property_data_snapshot={"price": 300_000, "bedrooms": 3},
        )
        pg_session.add(sp)
        await pg_session.commit()
        await pg_session.refresh(sp)

        assert sp.id is not None
        assert sp.tags == ["investment", "duplex"]
        assert sp.property_data_snapshot["price"] == 300_000
