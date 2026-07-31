"""Deal memo v1 — generation round-trip (template fallback path)."""

import pytest

from app.core.deps import get_current_user, get_current_verified_user
from app.main import app

pytestmark = pytest.mark.asyncio

ADDRESS = "953 Banyan Dr, Delray Beach, FL 33483"


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


@pytest.fixture
async def saved_property_id(auth_client) -> str:
    created = await auth_client.post(
        "/api/v1/properties/saved",
        json={
            "address_street": "953 Banyan Dr",
            "address_city": "Delray Beach",
            "address_state": "FL",
            "address_zip": "33483",
            "full_address": ADDRESS,
            "property_data_snapshot": {
                "listPrice": 500_000,
                "list_price": 500_000,
                "bedrooms": 3,
                "bathrooms": 2,
                "sqft": 1800,
                "monthlyRent": 3_000,
                "rent_estimate": 3_000,
            },
            "status": "prospecting",
        },
    )
    assert created.status_code == 201, created.text
    pid = created.json()["id"]

    # Seed a deal-maker record so the memo has real numbers to explain.
    patched = await auth_client.patch(
        f"/api/v1/properties/saved/{pid}/deal-maker",
        json={"buy_price": 460_000, "monthly_rent": 3_000},
    )
    assert patched.status_code == 200, patched.text
    return pid


async def test_memo_round_trip(auth_client, saved_property_id):
    # No memo until generated
    got = await auth_client.get(f"/api/v1/properties/saved/{saved_property_id}/memo")
    assert got.status_code == 200, got.text
    assert got.json()["memo"] is None

    # Generate — test env has no ANTHROPIC_API_KEY, so this is the template path
    generated = await auth_client.post(f"/api/v1/properties/saved/{saved_property_id}/memo")
    assert generated.status_code == 200, generated.text
    memo = generated.json()["memo"]
    assert memo["source"] == "template"
    assert "$460,000" in memo["text"]
    assert memo["generated_at"]

    # Persisted — a later GET returns the same memo
    got = await auth_client.get(f"/api/v1/properties/saved/{saved_property_id}/memo")
    assert got.json()["memo"]["text"] == memo["text"]


async def test_memo_404_on_foreign_property(auth_client):
    resp = await auth_client.post(
        "/api/v1/properties/saved/00000000-0000-0000-0000-000000000000/memo"
    )
    assert resp.status_code == 404
