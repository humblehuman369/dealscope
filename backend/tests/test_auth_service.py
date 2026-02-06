"""
Tests for the rebuilt AuthService — registration, authentication,
account lockout, MFA, password management, and audit logging.
"""

import pytest
import uuid
from datetime import datetime, timedelta, timezone

from app.services.auth_service import AuthService, AuthError, MFARequired, auth_service
from app.services.session_service import session_service
from app.services.token_service import token_service
from app.repositories.user_repository import user_repo
from app.repositories.audit_repository import audit_repo
from app.repositories.role_repository import role_repo
from app.models.audit_log import AuditAction
from app.models.verification_token import TokenType


pytestmark = pytest.mark.asyncio


# ------------------------------------------------------------------
# Password hashing
# ------------------------------------------------------------------

class TestPasswordHashing:
    def test_hash_and_verify(self):
        hashed = auth_service.hash_password("Test1234")
        assert auth_service.verify_password("Test1234", hashed)
        assert not auth_service.verify_password("Wrong", hashed)

    def test_different_hashes_for_same_password(self):
        h1 = auth_service.hash_password("Test1234")
        h2 = auth_service.hash_password("Test1234")
        assert h1 != h2  # bcrypt uses random salt


# ------------------------------------------------------------------
# Registration
# ------------------------------------------------------------------

class TestRegistration:
    async def test_register_success(self, db_session, seeded_roles, sample_user_data):
        user, token = await auth_service.register_user(
            db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"],
            full_name=sample_user_data["full_name"],
        )
        assert user.email == sample_user_data["email"].lower()
        assert user.full_name == sample_user_data["full_name"]
        assert user.is_active is True

    async def test_register_duplicate_email(self, db_session, seeded_roles, created_user, sample_user_data):
        with pytest.raises(AuthError, match="already registered"):
            await auth_service.register_user(
                db_session,
                email=sample_user_data["email"],
                password="Another1234",
                full_name="Duplicate",
            )

    async def test_register_creates_audit_log(self, db_session, seeded_roles, sample_user_data):
        user, _ = await auth_service.register_user(
            db_session,
            email="audit@example.com",
            password=sample_user_data["password"],
            full_name="Audit User",
        )
        logs = await audit_repo.list_for_user(db_session, user.id)
        assert any(l.action == AuditAction.REGISTER for l in logs)


# ------------------------------------------------------------------
# Authentication
# ------------------------------------------------------------------

class TestAuthentication:
    async def test_login_success(self, db_session, created_user, sample_user_data):
        user, session, jwt = await auth_service.authenticate(
            db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"],
        )
        assert user.id == created_user.id
        assert session is not None
        assert jwt is not None

    async def test_login_wrong_password(self, db_session, created_user, sample_user_data):
        with pytest.raises(AuthError, match="Invalid email or password"):
            await auth_service.authenticate(
                db_session,
                email=sample_user_data["email"],
                password="WrongPassword1",
            )

    async def test_login_unknown_email(self, db_session, created_user):
        with pytest.raises(AuthError, match="Invalid email or password"):
            await auth_service.authenticate(
                db_session,
                email="nobody@example.com",
                password="Whatever1",
            )

    async def test_login_inactive_user(self, db_session, created_user, sample_user_data):
        await user_repo.update(db_session, created_user.id, is_active=False)
        await db_session.flush()
        with pytest.raises(AuthError, match="deactivated"):
            await auth_service.authenticate(
                db_session,
                email=sample_user_data["email"],
                password=sample_user_data["password"],
            )


# ------------------------------------------------------------------
# Account lockout
# ------------------------------------------------------------------

class TestAccountLockout:
    async def test_lockout_after_max_attempts(self, db_session, created_user, sample_user_data):
        for _ in range(5):
            with pytest.raises(AuthError):
                await auth_service.authenticate(
                    db_session,
                    email=sample_user_data["email"],
                    password="WrongPassword1",
                )

        # 6th attempt should be locked
        with pytest.raises(AuthError, match="locked"):
            await auth_service.authenticate(
                db_session,
                email=sample_user_data["email"],
                password=sample_user_data["password"],  # even correct password
            )

    async def test_successful_login_resets_lockout(self, db_session, created_user, sample_user_data):
        # 3 failed attempts
        for _ in range(3):
            with pytest.raises(AuthError):
                await auth_service.authenticate(
                    db_session,
                    email=sample_user_data["email"],
                    password="WrongPassword1",
                )

        # Successful login
        user, _, _ = await auth_service.authenticate(
            db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"],
        )
        # Counter should be reset
        refreshed = await user_repo.get_by_id(db_session, user.id)
        assert refreshed.failed_login_attempts == 0


# ------------------------------------------------------------------
# Token service
# ------------------------------------------------------------------

class TestTokenService:
    def test_create_and_verify_jwt(self):
        uid = uuid.uuid4()
        sid = uuid.uuid4()
        jwt = token_service.create_jwt(uid, sid)
        payload = token_service.verify_jwt(jwt)
        assert payload is not None
        assert payload["sub"] == str(uid)
        assert payload["sid"] == str(sid)

    def test_invalid_jwt_returns_none(self):
        assert token_service.verify_jwt("garbage") is None

    async def test_verification_token_lifecycle(self, db_session, created_user):
        raw = await token_service.create_verification_token(
            db_session, created_user.id, TokenType.EMAIL_VERIFICATION
        )
        assert raw is not None

        # Validate
        user_id = await token_service.validate_verification_token(
            db_session, raw, TokenType.EMAIL_VERIFICATION
        )
        assert user_id == created_user.id

        # Cannot reuse
        user_id2 = await token_service.validate_verification_token(
            db_session, raw, TokenType.EMAIL_VERIFICATION
        )
        assert user_id2 is None


# ------------------------------------------------------------------
# Session service
# ------------------------------------------------------------------

class TestSessionService:
    async def test_create_session(self, db_session, created_user):
        session, jwt = await session_service.create_session(
            db_session, created_user.id
        )
        assert session.user_id == created_user.id
        assert jwt is not None

    async def test_revoke_session(self, db_session, created_user):
        session, _ = await session_service.create_session(
            db_session, created_user.id
        )
        await session_service.revoke_session(db_session, session.id)

        sessions = await session_service.list_sessions(db_session, created_user.id)
        assert len(sessions) == 0

    async def test_refresh_session(self, db_session, created_user):
        session, _ = await session_service.create_session(
            db_session, created_user.id
        )
        result = await session_service.refresh_session(db_session, session.refresh_token)
        assert result is not None
        _, new_jwt, new_refresh = result
        assert new_jwt is not None
        assert new_refresh != session.refresh_token  # rotated

    async def test_refresh_revoked_session_fails(self, db_session, created_user):
        session, _ = await session_service.create_session(
            db_session, created_user.id
        )
        await session_service.revoke_session(db_session, session.id)
        result = await session_service.refresh_session(db_session, session.refresh_token)
        assert result is None

    async def test_validate_session_from_jwt(self, db_session, created_user):
        session, jwt = await session_service.create_session(
            db_session, created_user.id
        )
        validated = await session_service.validate_session_from_jwt(db_session, jwt)
        assert validated is not None
        assert validated.id == session.id


# ------------------------------------------------------------------
# Password management
# ------------------------------------------------------------------

class TestPasswordManagement:
    async def test_change_password(self, db_session, created_user, sample_user_data):
        session, _ = await session_service.create_session(
            db_session, created_user.id
        )
        result = await auth_service.change_password(
            db_session,
            created_user.id,
            sample_user_data["password"],
            "NewSecure1234",
            current_session_id=session.id,
        )
        assert result is True

        # Old password no longer works
        with pytest.raises(AuthError):
            await auth_service.change_password(
                db_session,
                created_user.id,
                sample_user_data["password"],
                "AnotherNew1234",
            )

    async def test_password_reset_flow(self, db_session, created_user, sample_user_data):
        result = await auth_service.request_password_reset(
            db_session, sample_user_data["email"]
        )
        assert result is not None
        raw_token, user = result

        # Reset with token
        user = await auth_service.reset_password(
            db_session, raw_token, "ResetPass1234"
        )
        assert user is not None

        # Login with new password
        user2, _, _ = await auth_service.authenticate(
            db_session,
            email=sample_user_data["email"],
            password="ResetPass1234",
        )
        assert user2.id == created_user.id


# ------------------------------------------------------------------
# RBAC
# ------------------------------------------------------------------

class TestRBAC:
    async def test_user_has_role(self, db_session, created_user, seeded_roles):
        roles = await role_repo.get_user_roles(db_session, created_user.id)
        assert len(roles) >= 1
        role_names = {ur.role.name for ur in roles}
        assert "member" in role_names

    async def test_assign_and_check_permission(self, db_session, created_user, seeded_roles):
        from app.models.role import Permission, RolePermission

        # Create a permission
        perm = Permission(codename="test:action", description="Test")
        db_session.add(perm)
        await db_session.flush()

        # Link to member role
        rp = RolePermission(
            role_id=seeded_roles["member"].id,
            permission_id=perm.id,
        )
        db_session.add(rp)
        await db_session.flush()

        has = await role_repo.user_has_permission(db_session, created_user.id, "test:action")
        assert has is True

        has_other = await role_repo.user_has_permission(db_session, created_user.id, "nonexistent")
        assert has_other is False
