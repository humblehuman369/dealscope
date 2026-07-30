"""End-to-end reproduction of the Comp Appraisal "Apply to Deal" flow.

Replays the exact three HTTP calls `useApplyToDeal` makes:

    1. GET  /api/v1/properties/saved/check?address=...
    2. POST /api/v1/properties/saved            (snapshot built client-side)
    3. PATCH /api/v1/properties/saved/{id}/deal-maker

The production bug report is a toast reading "An unexpected error occurred",
which is the global 500 handler's generic message — i.e. an exception escaped
a route handler entirely. These tests pin every request in the flow to a
non-500 response for the payload shapes the frontend actually sends.
"""

import pytest

from app.core.deps import get_current_user, get_current_verified_user
from app.main import app

pytestmark = pytest.mark.asyncio

ADDRESS = "953 Banyan Dr, Delray Beach, FL 33483"


@pytest.fixture
async def auth_client(client, created_user, db_session):
    """The shared HTTP client, authenticated as the created user.

    Re-fetches the User per request (like the real ``get_current_user``):
    the shared test session expires ORM instances on rollback (e.g. after a
    duplicate-save 409), and an expired instance would lazy-load outside the
    async context and raise MissingGreenlet.
    """
    from app.models.user import User

    user_id = created_user.id

    async def _user():
        return await db_session.get(User, user_id)

    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_current_verified_user] = _user
    yield client
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_verified_user, None)


def _frontend_save_body(**snapshot_extra):
    """Body shape produced by useApplyToDeal.persistToDeal for an unsaved property."""
    snapshot = {
        "street": "953 Banyan Dr",
        "city": "Delray Beach",
        "state": "FL",
        "zipCode": "33483",
        "bedrooms": 5,
        "bathrooms": 5.5,
        "sqft": 5822,
        "zpid": "43172519",
        # Comp appraisal market value is stamped over listPrice by the hook
        "listPrice": 4_946_172,
        "list_price": 4_946_172,
        **snapshot_extra,
    }
    return {
        "address_street": "953 Banyan Dr",
        "address_city": "Delray Beach",
        "address_state": "FL",
        "address_zip": "33483",
        "full_address": ADDRESS,
        "zpid": "43172519",
        "property_data_snapshot": snapshot,
        "status": "prospecting",
    }


async def _run_flow(auth_client, save_body, patch_body):
    check = await auth_client.get(
        "/api/v1/properties/saved/check", params={"address": ADDRESS, "zpid": "43172519"}
    )
    assert check.status_code == 200, check.text
    assert check.json()["is_saved"] is False

    created = await auth_client.post("/api/v1/properties/saved", json=save_body)
    assert created.status_code == 201, created.text
    property_id = created.json()["id"]

    patched = await auth_client.patch(
        f"/api/v1/properties/saved/{property_id}/deal-maker", json=patch_body
    )
    assert patched.status_code == 200, patched.text
    return property_id, patched.json()


async def test_apply_market_value_full_flow(auth_client):
    """Market value apply: check -> save -> patch must all succeed."""
    property_id, body = await _run_flow(
        auth_client,
        _frontend_save_body(value_iq_estimate=4_800_000, monthlyRent=12_000),
        {"market_value_override": 4_946_172, "buy_price": 4_946_172},
    )
    assert body["record"]["market_value_override"] == 4_946_172
    assert body["record"]["buy_price"] == 4_946_172

    # The dashboard must reflect the applied value on reload
    detail = await auth_client.get(f"/api/v1/properties/saved/{property_id}")
    assert detail.status_code == 200, detail.text


async def test_apply_rent_on_sparse_offmarket_snapshot(auth_client):
    """Rent apply on an off-market home with no list price and no rent data.

    This is the sparse-snapshot shape that historically produced 500s
    (zero list_price -> divide-by-zero style metric failures).
    """
    save_body = _frontend_save_body()
    save_body["property_data_snapshot"] = {
        "street": "953 Banyan Dr",
        "city": "Delray Beach",
        "state": "FL",
        "zipCode": "33483",
        "zpid": "43172519",
        "monthlyRent": 2_800,
        "rent_estimate": 2_800,
    }
    _, body = await _run_flow(
        auth_client,
        save_body,
        {"monthly_rent_override": 2_800, "monthly_rent": 2_800},
    )
    assert body["record"]["monthly_rent_override"] == 2_800


async def test_apply_on_property_with_no_deal_maker_record(auth_client, db_session):
    """PATCH against a saved property whose deal_maker_record is NULL
    (legacy saves) must rebuild the record instead of failing."""
    save_body = _frontend_save_body()
    # No snapshot at all -> save_property skips DealMakerRecord creation
    save_body.pop("property_data_snapshot")

    created = await auth_client.post("/api/v1/properties/saved", json=save_body)
    assert created.status_code == 201, created.text
    property_id = created.json()["id"]
    assert created.json().get("deal_maker") is None

    patched = await auth_client.patch(
        f"/api/v1/properties/saved/{property_id}/deal-maker",
        json={"market_value_override": 4_946_172, "buy_price": 4_946_172},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["record"]["buy_price"] == 4_946_172


async def test_reapply_when_already_saved_uses_409_recheck_path(auth_client):
    """Second apply on the same property: POST returns 409, frontend re-checks
    and PATCHes the existing record. The 409 must be a clean 409, not a 500."""
    save_body = _frontend_save_body()
    first = await auth_client.post("/api/v1/properties/saved", json=save_body)
    assert first.status_code == 201, first.text

    second = await auth_client.post("/api/v1/properties/saved", json=save_body)
    assert second.status_code == 409, second.text

    recheck = await auth_client.get(
        "/api/v1/properties/saved/check", params={"address": ADDRESS, "zpid": "43172519"}
    )
    assert recheck.status_code == 200, recheck.text
    assert recheck.json()["is_saved"] is True
    property_id = recheck.json()["saved_property_id"]

    patched = await auth_client.patch(
        f"/api/v1/properties/saved/{property_id}/deal-maker",
        json={"arv": 5_200_000},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["record"]["arv"] == 5_200_000


async def test_comp_analysis_round_trip(auth_client):
    """Comp selections/adjustments persist on the saved property and come
    back on both PATCH response and subsequent GET (dashboard reload)."""
    created = await auth_client.post("/api/v1/properties/saved", json=_frontend_save_body())
    assert created.status_code == 201, created.text
    property_id = created.json()["id"]

    comp_state = {
        "version": 1,
        "sale": {
            "selected_ids": ["43172520", "43172521", "43172522"],
            "override_market": 4_900_000,
            "override_arv": None,
        },
        "rent": {
            "selected_ids": ["991", "992"],
            "override_market": None,
            "override_improved": 13_500,
        },
    }

    patched = await auth_client.patch(
        f"/api/v1/properties/saved/{property_id}", json={"comp_analysis": comp_state}
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["comp_analysis"] == comp_state

    fetched = await auth_client.get(f"/api/v1/properties/saved/{property_id}")
    assert fetched.status_code == 200, fetched.text
    assert fetched.json()["comp_analysis"] == comp_state
