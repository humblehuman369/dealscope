"""Assumptions-vs-actuals v1 — actuals persist via the generic property PATCH."""

import pytest

from app.core.deps import get_current_user, get_current_verified_user
from app.main import app

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def auth_client(client, created_user, db_session):
    from app.models.user import User

    user_id = created_user.id

    async def _user():
        return await db_session.get(User, user_id)

    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_current_verified_user] = _user
    yield client
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_verified_user, None)


async def test_actuals_round_trip(auth_client):
    created = await auth_client.post(
        "/api/v1/properties/saved",
        json={
            "address_street": "1 Main St",
            "address_city": "Tampa",
            "address_state": "FL",
            "address_zip": "33601",
            "full_address": "1 Main St, Tampa, FL 33601",
            "status": "owned",
        },
    )
    assert created.status_code == 201, created.text
    pid = created.json()["id"]

    actuals = {
        "monthly_rent": 2300,
        "monthly_expenses": 1900,
        "updated_at": "2026-07-30T00:00:00Z",
    }
    patched = await auth_client.patch(f"/api/v1/properties/saved/{pid}", json={"actuals": actuals})
    assert patched.status_code == 200, patched.text
    assert patched.json()["actuals"]["monthly_rent"] == 2300

    detail = await auth_client.get(f"/api/v1/properties/saved/{pid}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["actuals"]["monthly_expenses"] == 1900
