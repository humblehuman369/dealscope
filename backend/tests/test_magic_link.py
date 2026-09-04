"""Magic link consume — single use, expiry, verification flip, MFA branch, safe redirect."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from app.models.verification_token import TokenType, VerificationToken
from app.repositories.user_repository import user_repo
from app.services.auth_service import AuthError, auth_service
from app.services.token_service import token_service
from sqlalchemy import select, update

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def unverified_user(db_session, seeded_roles):
    from app.repositories.role_repository import role_repo

    user = await user_repo.create(
        db_session,
        email="lead@example.com",
        hashed_password=auth_service.hash_password("Placeholder123!"),
        full_name="lead",
        is_active=True,
        is_verified=False,
    )
    await role_repo.assign_role(db_session, user.id, seeded_roles["member"].id)
    await db_session.flush()
    return user


async def _issue(db, user_id, minutes: int = 30) -> str:
    return await token_service.create_verification_token(db, user_id, TokenType.MAGIC_LINK, expires_minutes=minutes)


async def test_consume_signs_in_and_verifies(client, db_session, unverified_user):
    raw = await _issue(db_session, unverified_user.id)

    resp = await client.post(
        "/api/v1/auth/magic-link/consume",
        params={"next": "/discovery?propertyId=abc&view=workbench"},
        json={"token": raw},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["redirect"] == "/discovery?propertyId=abc&view=workbench"
    assert body["access_token"]
    assert body["refresh_token"]
    assert "access_token=" in resp.headers.get("set-cookie", "")

    refreshed = await user_repo.get_by_id(db_session, unverified_user.id)
    assert refreshed.is_verified is True
    assert refreshed.last_login is not None


async def test_token_is_single_use(client, db_session, unverified_user):
    raw = await _issue(db_session, unverified_user.id)
    first = await client.post("/api/v1/auth/magic-link/consume", json={"token": raw})
    assert first.status_code == 200
    second = await client.post("/api/v1/auth/magic-link/consume", json={"token": raw})
    assert second.status_code == 400


async def test_expired_token_is_rejected(client, db_session, unverified_user):
    raw = await _issue(db_session, unverified_user.id)
    await db_session.execute(
        update(VerificationToken)
        .where(VerificationToken.user_id == unverified_user.id)
        .values(expires_at=datetime.now(UTC) - timedelta(minutes=1))
    )
    await db_session.flush()
    resp = await client.post("/api/v1/auth/magic-link/consume", json={"token": raw})
    assert resp.status_code == 400
    refreshed = await user_repo.get_by_id(db_session, unverified_user.id)
    assert refreshed.is_verified is False


async def test_wrong_token_type_is_rejected(client, db_session, unverified_user):
    raw = await token_service.create_verification_token(db_session, unverified_user.id, TokenType.EMAIL_VERIFICATION)
    resp = await client.post("/api/v1/auth/magic-link/consume", json={"token": raw})
    assert resp.status_code == 400


async def test_garbage_token_is_rejected(client):
    resp = await client.post("/api/v1/auth/magic-link/consume", json={"token": "x" * 40})
    assert resp.status_code == 400


async def test_mfa_account_is_verified_but_not_signed_in(client, db_session, unverified_user):
    await user_repo.update(db_session, unverified_user.id, mfa_enabled=True, mfa_secret="enc-secret")
    raw = await _issue(db_session, unverified_user.id)

    resp = await client.post(
        "/api/v1/auth/magic-link/consume", params={"next": "/discovery?propertyId=1"}, json={"token": raw}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["redirect"].startswith("/login?")
    assert "reason=mfa" in body["redirect"]
    assert body["access_token"] is None
    assert "access_token=" not in resp.headers.get("set-cookie", "")

    refreshed = await user_repo.get_by_id(db_session, unverified_user.id)
    assert refreshed.is_verified is True


@pytest.mark.parametrize(
    "bad_next",
    ["https://evil.example/", "//evil.example/x", "javascript:alert(1)", "/ok\\r\\nSet-Cookie: x=y"],
)
async def test_off_origin_next_falls_back_to_deals(client, db_session, unverified_user, bad_next):
    raw = await _issue(db_session, unverified_user.id)
    resp = await client.post("/api/v1/auth/magic-link/consume", params={"next": bad_next}, json={"token": raw})
    assert resp.status_code == 200
    assert resp.json()["redirect"] == "/deals"


async def test_service_marks_token_used_even_for_mfa(db_session, unverified_user):
    await user_repo.update(db_session, unverified_user.id, mfa_enabled=True, mfa_secret="enc-secret")
    raw = await _issue(db_session, unverified_user.id)
    user, session_obj, jwt = await auth_service.consume_magic_link(db_session, raw)
    assert user.id == unverified_user.id
    assert session_obj is None and jwt is None
    with pytest.raises(AuthError):
        await auth_service.consume_magic_link(db_session, raw)
    used = (
        await db_session.execute(select(VerificationToken).where(VerificationToken.user_id == unverified_user.id))
    ).scalar_one()
    assert used.used_at is not None
