"""Make It Work — plan claim (email-first save) end to end against Postgres."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from app.models.saved_property import SavedProperty
from app.models.verification_token import TokenType, VerificationToken
from app.repositories.user_repository import user_repo
from app.schemas.plans import PlanScenario
from app.services import plan_claim_service
from app.services.plan_claim_service import (
    PLAN_KEY,
    build_plan_redirect,
    encode_scenario,
    scenario_to_record_update,
)
from sqlalchemy import select

pytestmark = pytest.mark.asyncio

ADDRESS = "953 Banyan Dr, Delray Beach, FL 33483"


def _claim_body(email: str = "newlead@example.com") -> dict:
    return {
        "email": email,
        "address": ADDRESS,
        "address_parts": {"street": "953 Banyan Dr", "city": "Delray Beach", "state": "FL", "zip": "33483"},
        "zpid": "43210",
        "property_snapshot": {
            "listPrice": 450_000,
            "monthlyRent": 2_800,
            "bedrooms": 3,
            "bathrooms": 2,
            "sqft": 1_800,
            "zipCode": "33483",
        },
        "scenario": {
            "v": 1,
            "structureId": "seller-second-zero-balloon",
            "family": "financing",
            "label": "Option 3 — Creative Finance",
            "levers": {
                "custom_purchase_price": 450_000,
                "pending_extras": {
                    "seller_carry_amount": 38_000,
                    "seller_carry_rate": 0.0,
                    "seller_carry_term_years": 5,
                    "seller_carry_interest_only": True,
                },
            },
        },
        "wizard_answers": {"cash": "25_75k", "priority": "least_cash", "terms": "seller_financing"},
        "narrative": {"summary": "S.", "pitch": "P.", "source": "template"},
    }


@pytest.fixture
def sent_emails(monkeypatch):
    """Capture the plan email instead of sending it."""
    mock = AsyncMock(return_value={"success": True, "id": "test"})
    monkeypatch.setattr(plan_claim_service.email_service, "send_plan_saved_email", mock)
    return mock


@pytest.fixture(autouse=True)
def _no_rate_limit(monkeypatch):
    from app.routers import plans as plans_router

    monkeypatch.setattr(plans_router, "_enforce_hourly_limit", AsyncMock(return_value=None))


# ------------------------------------------------------------------
# Pure mapping
# ------------------------------------------------------------------


async def test_scenario_levers_map_onto_the_record():
    scenario = PlanScenario(**_claim_body()["scenario"])
    update = scenario_to_record_update(scenario).model_dump(exclude_unset=True)
    assert update["buy_price"] == 450_000
    assert update["seller_carry_amount"] == 38_000
    assert update["seller_carry_rate"] == 0.0
    assert update["seller_carry_term_years"] == 5
    assert "monthly_rent" not in update


async def test_scenario_encoding_matches_frontend_wire_format():
    scenario = PlanScenario(**_claim_body()["scenario"])
    encoded = encode_scenario(scenario)
    assert "=" not in encoded and "+" not in encoded and "/" not in encoded
    import base64
    import json

    padded = encoded + "=" * (-len(encoded) % 4)
    decoded = json.loads(base64.urlsafe_b64decode(padded))
    assert decoded["v"] == 1
    assert decoded["structureId"] == "seller-second-zero-balloon"
    assert decoded["levers"]["pending_extras"]["seller_carry_amount"] == 38_000


# ------------------------------------------------------------------
# HTTP: uniform 202, user + property + token + email
# ------------------------------------------------------------------


async def test_claim_creates_user_property_record_token_and_email(client, db_session, seeded_roles, sent_emails):
    resp = await client.post("/api/v1/plans/claim", json=_claim_body())
    assert resp.status_code == 202, resp.text
    assert resp.json()["status"] == "accepted"

    user = await user_repo.get_by_email(db_session, "newlead@example.com")
    assert user is not None
    assert user.is_verified is False

    saved = (
        await db_session.execute(select(SavedProperty).where(SavedProperty.user_id == user.id))
    ).scalar_one()
    assert saved.zpid == "43210"
    record = saved.deal_maker_record
    assert record["buy_price"] == 450_000
    assert record["seller_carry_amount"] == 38_000
    assert record["initial_assumptions"], "initial_assumptions must be locked from resolved defaults"
    plan = saved.property_data_snapshot[PLAN_KEY]
    assert plan["wizard_answers"]["priority"] == "least_cash"
    assert plan["narrative"]["summary"] == "S."

    token = (
        await db_session.execute(
            select(VerificationToken).where(
                VerificationToken.user_id == user.id,
                VerificationToken.token_type == TokenType.MAGIC_LINK.value,
            )
        )
    ).scalar_one()
    assert token.used_at is None

    sent_emails.assert_awaited_once()
    kwargs = sent_emails.await_args.kwargs
    assert kwargs["to"] == "newlead@example.com"
    assert kwargs["is_new_user"] is True
    assert "/auth/magic?" in kwargs["magic_url"]
    assert "token=" in kwargs["magic_url"]
    assert "next=" in kwargs["magic_url"]
    assert f"propertyId%3D{saved.id}" in kwargs["magic_url"] or f"propertyId={saved.id}" in kwargs["magic_url"]


async def test_claim_for_existing_user_reuses_account_and_updates_saved_property(
    client, db_session, created_user, sent_emails
):
    body = _claim_body(email=created_user.email)
    first = await client.post("/api/v1/plans/claim", json=body)
    assert first.status_code == 202

    # Second claim with a different scenario on the same address must update, not duplicate.
    body["scenario"]["structureId"] = "price-negotiation"
    body["scenario"]["family"] = "price"
    body["scenario"]["levers"] = {"custom_purchase_price": 412_000}
    second = await client.post("/api/v1/plans/claim", json=body)
    assert second.status_code == 202

    rows = (
        await db_session.execute(select(SavedProperty).where(SavedProperty.user_id == created_user.id))
    ).scalars().all()
    assert len(rows) == 1
    assert rows[0].deal_maker_record["buy_price"] == 412_000
    assert rows[0].property_data_snapshot[PLAN_KEY]["scenario"]["structureId"] == "price-negotiation"

    assert sent_emails.await_count == 2
    assert sent_emails.await_args.kwargs["is_new_user"] is False


async def test_claim_response_is_identical_on_internal_failure(client, monkeypatch, sent_emails):
    async def boom(*args, **kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(plan_claim_service, "claim_plan", boom)
    ok_shape = {"status": "accepted", "message": "If that address is valid, your plan is on its way."}

    resp = await client.post("/api/v1/plans/claim", json=_claim_body())
    assert resp.status_code == 202
    assert resp.json() == ok_shape


async def test_claim_rejects_malformed_email(client):
    body = _claim_body(email="not-an-email")
    resp = await client.post("/api/v1/plans/claim", json=body)
    assert resp.status_code == 422


async def test_claim_rate_limit_returns_429(client, monkeypatch):
    from app.routers import plans as plans_router
    from fastapi import HTTPException

    async def limited(kind, identifier, limit):
        raise HTTPException(status_code=429, detail={"code": "RATE_LIMIT_EXCEEDED", "message": "slow down"})

    monkeypatch.setattr(plans_router, "_enforce_hourly_limit", limited)
    resp = await client.post("/api/v1/plans/claim", json=_claim_body())
    assert resp.status_code == 429


async def test_redirect_is_same_origin_and_carries_scenario():
    class _Saved:
        id = "11111111-1111-1111-1111-111111111111"
        full_address = ADDRESS

    scenario = PlanScenario(**_claim_body()["scenario"])
    redirect = build_plan_redirect(_Saved(), scenario)
    assert redirect.startswith("/discovery?")
    assert "propertyId=11111111-1111-1111-1111-111111111111" in redirect
    assert "view=workbench" in redirect
    assert "scenario=" in redirect
