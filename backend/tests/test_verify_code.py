"""6-digit email verification code — signs in, one use, locks after six misses."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from app.models.verification_token import TokenType, VerificationToken
from app.repositories.user_repository import user_repo
from app.services.auth_service import auth_service
from app.services.token_service import token_service
from sqlalchemy import select, update

pytestmark = pytest.mark.asyncio

VERIFY_CODE = "/api/v1/auth/verify-code"
VERIFY_EMAIL = "/api/v1/auth/verify-email"
BAD_TOKEN_MESSAGE = "Invalid or expired verification token"


def _error_message(resp) -> str:
    body = resp.json()
    return body.get("error", {}).get("message") or body.get("detail") or ""


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


async def _issue(db, user_id) -> tuple[str, str]:
    return await token_service.create_email_verification(db, user_id)


async def test_correct_code_signs_in_and_invalidates_the_link(client, db_session, unverified_user):
    raw_token, raw_code = await _issue(db_session, unverified_user.id)

    resp = await client.post(
        VERIFY_CODE,
        params={"next": "/discovery?propertyId=abc"},
        json={"email": unverified_user.email, "code": raw_code},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["redirect"] == "/discovery?propertyId=abc"
    assert body["access_token"]
    assert body["refresh_token"]
    assert "access_token=" in resp.headers.get("set-cookie", "")

    refreshed = await user_repo.get_by_id(db_session, unverified_user.id)
    assert refreshed.is_verified is True
    assert refreshed.last_login is not None

    link = await client.post(VERIFY_EMAIL, json={"token": raw_token})
    assert link.status_code == 400
    assert _error_message(link) == BAD_TOKEN_MESSAGE


async def test_wrong_code_five_times_then_sixth_invalidates_both(client, db_session, unverified_user):
    raw_token, raw_code = await _issue(db_session, unverified_user.id)

    for _ in range(5):
        resp = await client.post(
            VERIFY_CODE, json={"email": unverified_user.email, "code": "000000"}
        )
        assert resp.status_code == 400
        assert _error_message(resp) == BAD_TOKEN_MESSAGE

    still = await client.post(VERIFY_EMAIL, json={"token": raw_token})
    assert still.status_code == 200, still.text

    raw_token, raw_code = await _issue(db_session, unverified_user.id)
    for _ in range(5):
        resp = await client.post(
            VERIFY_CODE, json={"email": unverified_user.email, "code": "000000"}
        )
        assert resp.status_code == 400

    sixth = await client.post(
        VERIFY_CODE, json={"email": unverified_user.email, "code": "000000"}
    )
    assert sixth.status_code == 400

    link = await client.post(VERIFY_EMAIL, json={"token": raw_token})
    assert link.status_code == 400
    code = await client.post(
        VERIFY_CODE, json={"email": unverified_user.email, "code": raw_code}
    )
    assert code.status_code == 400


async def test_expired_code_fails(client, db_session, unverified_user):
    raw_token, raw_code = await _issue(db_session, unverified_user.id)
    await db_session.execute(
        update(VerificationToken)
        .where(VerificationToken.user_id == unverified_user.id)
        .values(expires_at=datetime.now(UTC) - timedelta(minutes=1))
    )
    await db_session.flush()

    resp = await client.post(
        VERIFY_CODE, json={"email": unverified_user.email, "code": raw_code}
    )
    assert resp.status_code == 400
    refreshed = await user_repo.get_by_id(db_session, unverified_user.id)
    assert refreshed.is_verified is False

    link = await client.post(VERIFY_EMAIL, json={"token": raw_token})
    assert link.status_code == 400


async def test_used_link_makes_the_code_fail(client, db_session, unverified_user):
    raw_token, raw_code = await _issue(db_session, unverified_user.id)
    link = await client.post(VERIFY_EMAIL, json={"token": raw_token})
    assert link.status_code == 200, link.text
    assert link.json()["access_token"]

    code = await client.post(
        VERIFY_CODE, json={"email": unverified_user.email, "code": raw_code}
    )
    assert code.status_code == 400
    assert _error_message(code) == BAD_TOKEN_MESSAGE


async def test_unknown_email_uses_the_same_error(client):
    resp = await client.post(
        VERIFY_CODE, json={"email": "nobody@example.com", "code": "123456"}
    )
    assert resp.status_code == 400
    assert _error_message(resp) == BAD_TOKEN_MESSAGE


async def test_link_signs_in_like_the_code(client, db_session, unverified_user):
    raw_token, _code = await _issue(db_session, unverified_user.id)
    resp = await client.post(
        VERIFY_EMAIL,
        params={"next": "/onboarding"},
        json={"token": raw_token},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["redirect"] == "/onboarding"
    assert body["access_token"]
    assert "access_token=" in resp.headers.get("set-cookie", "")

    used = (
        await db_session.execute(
            select(VerificationToken).where(VerificationToken.user_id == unverified_user.id)
        )
    ).scalar_one()
    assert used.used_at is not None
