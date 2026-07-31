"""Offer Tracker v1 — CRUD round-trip for /properties/saved/{id}/offers."""

import pytest

from app.core.deps import get_current_user, get_current_verified_user
from app.main import app

pytestmark = pytest.mark.asyncio

ADDRESS = "953 Banyan Dr, Delray Beach, FL 33483"


@pytest.fixture
async def auth_client(client, created_user, db_session):
    """Shared HTTP client authenticated as the created user (per-request
    User re-fetch — see test_apply_to_deal_flow for the MissingGreenlet
    rationale)."""
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
            "status": "negotiating",
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


async def test_offer_crud_round_trip(auth_client, saved_property_id):
    # Empty to start
    listed = await auth_client.get(f"/api/v1/properties/saved/{saved_property_id}/offers")
    assert listed.status_code == 200, listed.text
    assert listed.json() == []

    # Create
    created = await auth_client.post(
        f"/api/v1/properties/saved/{saved_property_id}/offers",
        json={
            "amount": 425000,
            "status": "submitted",
            "offer_date": "2026-07-28",
            "expires_at": "2026-08-04",
            "notes": "As-is, 21-day close",
        },
    )
    assert created.status_code == 201, created.text
    offer = created.json()
    assert float(offer["amount"]) == 425000
    assert offer["status"] == "submitted"

    # Seller counters
    patched = await auth_client.patch(
        f"/api/v1/properties/saved/{saved_property_id}/offers/{offer['id']}",
        json={"status": "countered", "counter_amount": 442000},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["status"] == "countered"
    assert float(patched.json()["counter_amount"]) == 442000

    # Newest-first listing includes it
    listed = await auth_client.get(f"/api/v1/properties/saved/{saved_property_id}/offers")
    assert [o["id"] for o in listed.json()] == [offer["id"]]

    # Delete
    deleted = await auth_client.delete(
        f"/api/v1/properties/saved/{saved_property_id}/offers/{offer['id']}"
    )
    assert deleted.status_code == 204
    listed = await auth_client.get(f"/api/v1/properties/saved/{saved_property_id}/offers")
    assert listed.json() == []


async def test_offer_rejects_nonpositive_amount(auth_client, saved_property_id):
    resp = await auth_client.post(
        f"/api/v1/properties/saved/{saved_property_id}/offers",
        json={"amount": 0},
    )
    assert resp.status_code == 422


async def test_offers_404_on_foreign_property(auth_client):
    resp = await auth_client.get(
        "/api/v1/properties/saved/00000000-0000-0000-0000-000000000000/offers"
    )
    assert resp.status_code == 404
