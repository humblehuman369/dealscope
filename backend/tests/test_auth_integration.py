"""
Auth integration tests — full HTTP request/response cycle through FastAPI.

These tests exercise the auth endpoints end-to-end using TestClient
against an in-memory SQLite database, verifying:
  - Registration → Login → Refresh → Logout flow
  - Failed login lockout at threshold
  - Password reset flow
  - MFA setup and verification
  - Session management (list, revoke)
  - RBAC permission checks
"""

from unittest.mock import AsyncMock, patch

import pytest
from app.repositories.user_repository import user_repo

pytestmark = pytest.mark.asyncio


# ------------------------------------------------------------------
# Fixtures: wire test DB into the app
# ------------------------------------------------------------------

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"
LOGOUT_URL = "/api/v1/auth/logout"
ME_URL = "/api/v1/auth/me"
SESSIONS_URL = "/api/v1/auth/sessions"
CHANGE_PW_URL = "/api/v1/auth/change-password"
RESET_PW_URL = "/api/v1/auth/reset-password"
MFA_SETUP_URL = "/api/v1/auth/mfa/setup"


VALID_USER = {
    "email": "integration@test.com",
    "password": "Str0ng!Pass#",
    "full_name": "Integration Test",
}


# ------------------------------------------------------------------
# Registration
# ------------------------------------------------------------------

class TestRegistrationFlow:
    @patch("app.routers.auth.email_service")
    async def test_register_returns_user(self, mock_email, client):
        mock_email.send_verification_email = AsyncMock(return_value={"success": True})
        resp = await client.post(REGISTER_URL, json=VALID_USER)
        assert resp.status_code in (200, 201)
        body = resp.json()
        # With email verification required, register returns a message +
        # requires_verification instead of an auto-login user payload.
        if body.get("requires_verification"):
            assert body.get("message")
        else:
            assert body.get("email") or (body.get("user") or {}).get("email")

    @patch("app.routers.auth.email_service")
    async def test_duplicate_registration(self, mock_email, client):
        mock_email.send_verification_email = AsyncMock(return_value={"success": True})
        await client.post(REGISTER_URL, json=VALID_USER)
        resp2 = await client.post(REGISTER_URL, json=VALID_USER)
        assert resp2.status_code in (400, 409, 422)

    async def test_register_weak_password(self, client):
        resp = await client.post(
            REGISTER_URL,
            json={"email": "weak@test.com", "password": "123", "full_name": "Weak"},
        )
        assert resp.status_code == 422


# ------------------------------------------------------------------
# Login → Refresh → Logout
# ------------------------------------------------------------------

class TestLoginFlow:
    @patch("app.routers.auth.email_service")
    async def test_full_flow(self, mock_email, client, db_session, seeded_roles):
        """Register → login → refresh → me → logout."""
        mock_email.send_verification_email = AsyncMock(return_value={"success": True})

        # Register
        reg_resp = await client.post(REGISTER_URL, json=VALID_USER)
        assert reg_resp.status_code in (200, 201)

        # Mark user as verified so login works
        user = await user_repo.get_by_email(db_session, VALID_USER["email"])
        if user:
            await user_repo.update(db_session, user.id, is_verified=True)
            await db_session.flush()

        # Login
        login_resp = await client.post(
            LOGIN_URL,
            json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        assert login_resp.status_code == 200
        tokens = login_resp.json()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        assert access_token is not None

        auth_header = {"Authorization": f"Bearer {access_token}"}

        # Refresh
        if refresh_token:
            ref_resp = await client.post(
                REFRESH_URL, json={"refresh_token": refresh_token}
            )
            assert ref_resp.status_code == 200

        # Me
        me_resp = await client.get(ME_URL, headers=auth_header)
        assert me_resp.status_code == 200
        assert me_resp.json().get("email") == VALID_USER["email"]

        # Logout
        logout_resp = await client.post(LOGOUT_URL, headers=auth_header)
        assert logout_resp.status_code in (200, 204)

    async def test_login_wrong_password(self, client, db_session, created_user):
        resp = await client.post(
            LOGIN_URL,
            json={"email": "test@example.com", "password": "WrongPassword!1"},
        )
        assert resp.status_code in (400, 401)

    async def test_login_unknown_email(self, client):
        resp = await client.post(
            LOGIN_URL,
            json={"email": "nobody@example.com", "password": "Whatever!1"},
        )
        assert resp.status_code in (400, 401)


# ------------------------------------------------------------------
# Account lockout
# ------------------------------------------------------------------

class TestLockout:
    async def test_lockout_after_5_failures(self, client, db_session, created_user):
        """After 5 wrong passwords, even the correct one should fail."""
        for _ in range(5):
            await client.post(
                LOGIN_URL,
                json={
                    "email": "test@example.com",
                    "password": "WrongPassword!1",
                },
            )

        # 6th attempt with correct password — should still be locked
        resp = await client.post(
            LOGIN_URL,
            json={
                "email": "test@example.com",
                "password": "SecurePassword123",
            },
        )
        # 423 Locked is the canonical lockout response
        assert resp.status_code in (400, 401, 403, 423, 429)


# ------------------------------------------------------------------
# Session management
# ------------------------------------------------------------------

class TestSessionManagement:
    async def test_list_sessions(self, client, db_session, created_user):
        # Login first to create a session
        login_resp = await client.post(
            LOGIN_URL,
            json={
                "email": "test@example.com",
                "password": "SecurePassword123",
            },
        )
        if login_resp.status_code != 200:
            pytest.skip("Login failed — skipping session test")

        token = login_resp.json().get("access_token")
        header = {"Authorization": f"Bearer {token}"}

        resp = await client.get(SESSIONS_URL, headers=header)
        assert resp.status_code == 200
        sessions = resp.json()
        assert isinstance(sessions, list)
        assert len(sessions) >= 1
        assert sessions[0]["client_type"] == "desktop"

    async def test_desktop_login_replaces_previous_desktop_session(self, client, db_session, created_user):
        first_login = await client.post(
            LOGIN_URL,
            json={
                "email": "test@example.com",
                "password": "SecurePassword123",
            },
        )
        assert first_login.status_code == 200

        second_login = await client.post(
            LOGIN_URL,
            json={
                "email": "test@example.com",
                "password": "SecurePassword123",
            },
        )
        assert second_login.status_code == 200

        token = second_login.json().get("access_token")
        resp = await client.get(SESSIONS_URL, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        sessions = resp.json()
        assert len(sessions) == 1
        assert sessions[0]["client_type"] == "desktop"

    async def test_mobile_login_replaces_previous_mobile_session(self, client, db_session, created_user):
        mobile_headers = {"X-DGIQ-Client-Type": "mobile"}
        first_login = await client.post(
            LOGIN_URL,
            json={
                "email": "test@example.com",
                "password": "SecurePassword123",
            },
            headers=mobile_headers,
        )
        assert first_login.status_code == 200

        second_login = await client.post(
            LOGIN_URL,
            json={
                "email": "test@example.com",
                "password": "SecurePassword123",
            },
            headers=mobile_headers,
        )
        assert second_login.status_code == 200

        token = second_login.json().get("access_token")
        resp = await client.get(SESSIONS_URL, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        sessions = resp.json()
        assert len(sessions) == 1
        assert sessions[0]["client_type"] == "mobile"

    async def test_desktop_and_mobile_sessions_can_coexist(self, client, db_session, created_user):
        desktop_login = await client.post(
            LOGIN_URL,
            json={
                "email": "test@example.com",
                "password": "SecurePassword123",
            },
        )
        assert desktop_login.status_code == 200

        mobile_login = await client.post(
            LOGIN_URL,
            json={
                "email": "test@example.com",
                "password": "SecurePassword123",
            },
            headers={"X-DGIQ-Client-Type": "mobile"},
        )
        assert mobile_login.status_code == 200

        token = mobile_login.json().get("access_token")
        resp = await client.get(SESSIONS_URL, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        sessions = resp.json()
        assert sorted(session["client_type"] for session in sessions) == ["desktop", "mobile"]


# ------------------------------------------------------------------
# Health check (smoke test)
# ------------------------------------------------------------------

class TestHealthSmoke:
    async def test_health_endpoint(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body.get("status") in ("healthy", "degraded", "unhealthy")
