"""Action Plan Phase 0 — case sorting, template plans, and the task merge rule."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from app.core.config import settings
from app.core.deps import get_current_user, get_current_verified_user
from app.main import app
from app.models.action_plan import ActionPlanCase, ActionPlanSource
from app.models.task import PropertyTask
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.action_plan.cases import sort_case
from app.services.action_plan.templates import build_template_plan
from app.services.task_service import is_open_title_duplicate, task_service
from sqlalchemy import select


@pytest.fixture(autouse=True)
def _no_openai_research(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")

# ------------------------------------------------------------------
# Case sorting — nine cases plus overlapping-flag priority
# ------------------------------------------------------------------


def _listing(**fields):
    return {"listing": fields}


class TestSortCase:
    def test_on_market(self):
        payload = _listing(
            listing_status="FOR_SALE",
            is_off_market=False,
            days_on_market=12,
            price_reduction_count=0,
        )
        assert sort_case(payload) is ActionPlanCase.ON_MARKET

    def test_on_market_stale_by_dom(self):
        payload = _listing(
            listing_status="FOR_SALE",
            is_off_market=False,
            days_on_market=30,
            price_reduction_count=0,
        )
        assert sort_case(payload) is ActionPlanCase.ON_MARKET_STALE

    def test_on_market_stale_by_price_cuts(self):
        payload = _listing(
            listing_status="FOR_SALE",
            is_off_market=False,
            days_on_market=10,
            price_reduction_count=2,
        )
        assert sort_case(payload) is ActionPlanCase.ON_MARKET_STALE

    def test_expired_or_on_hold(self):
        payload = _listing(listing_status="EXPIRED", is_off_market=True)
        assert sort_case(payload) is ActionPlanCase.EXPIRED_OR_ON_HOLD

    def test_on_hold(self):
        payload = _listing(listing_status="On Hold", is_off_market=True)
        assert sort_case(payload) is ActionPlanCase.EXPIRED_OR_ON_HOLD

    def test_off_market_absentee(self):
        payload = _listing(
            listing_status="OFF_MARKET",
            is_off_market=True,
            is_absentee_owner=True,
            owner_names=["Jane Morris"],
        )
        assert sort_case(payload) is ActionPlanCase.OFF_MARKET_ABSENTEE

    def test_off_market_owner_occupied(self):
        payload = _listing(
            listing_status="OFF_MARKET",
            is_off_market=True,
            is_owner_occupied=True,
            is_absentee_owner=False,
        )
        assert sort_case(payload) is ActionPlanCase.OFF_MARKET_OWNER_OCCUPIED

    def test_pre_foreclosure(self):
        payload = _listing(
            listing_status="OFF_MARKET",
            is_off_market=True,
            is_pre_foreclosure=True,
            is_absentee_owner=True,
        )
        assert sort_case(payload) is ActionPlanCase.PRE_FORECLOSURE

    def test_foreclosure_or_auction(self):
        payload = _listing(
            listing_status="FOR_SALE",
            is_off_market=False,
            is_foreclosure=True,
            is_auction=True,
        )
        assert sort_case(payload) is ActionPlanCase.FORECLOSURE_OR_AUCTION

    def test_bank_owned(self):
        payload = _listing(
            listing_status="FOR_SALE",
            is_off_market=False,
            is_bank_owned=True,
        )
        assert sort_case(payload) is ActionPlanCase.BANK_OWNED

    def test_fsbo(self):
        payload = _listing(
            listing_status="FOR_SALE",
            is_off_market=False,
            is_fsbo=True,
            days_on_market=5,
        )
        assert sort_case(payload) is ActionPlanCase.FSBO

    def test_flat_payload_without_listing_key(self):
        assert (
            sort_case({"listing_status": "FOR_SALE", "is_off_market": False, "days_on_market": 8})
            is ActionPlanCase.ON_MARKET
        )

    def test_for_sale_wins_over_default_is_off_market(self):
        # ListingInfo defaults is_off_market to True. A FOR_SALE status must
        # still sort as on-market.
        payload = _listing(listing_status="FOR_SALE", is_off_market=True, days_on_market=4)
        assert sort_case(payload) is ActionPlanCase.ON_MARKET

    def test_every_case_has_a_template(self):
        for case in ActionPlanCase:
            plan = build_template_plan({"listing": {"listing_status": "OFF_MARKET"}}, case=case)
            assert 3 <= len(plan["tasks"]) <= 7
            assert plan["summary"]
            assert plan["case"] == case.value
            assert plan["source"] == "template"


class TestMergeRule:
    def test_skips_open_title(self):
        assert is_open_title_duplicate("Call the listing agent", {"call the listing agent"})

    def test_completed_title_does_not_block(self):
        # Open-title set does not include completed tasks.
        assert not is_open_title_duplicate("Call the listing agent", set())

    def test_whitespace_and_case(self):
        assert is_open_title_duplicate("  Call The Listing Agent  ", {"call the listing agent"})


# ------------------------------------------------------------------
# HTTP: create + apply
# ------------------------------------------------------------------


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


async def _save_property(auth_client, listing: dict) -> str:
    created = await auth_client.post(
        "/api/v1/properties/saved",
        json={
            "address_street": "117 River Hammock Dr",
            "address_city": "Fort Pierce",
            "address_state": "FL",
            "address_zip": "34982",
            "full_address": f"117 River Hammock Dr, Fort Pierce, FL 34982 {uuid.uuid4().hex[:6]}",
            "status": "prospecting",
            "property_data_snapshot": {"listing": listing},
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


async def test_create_returns_template_plan(auth_client):
    property_id = await _save_property(
        auth_client,
        {
            "listing_status": "OFF_MARKET",
            "is_off_market": True,
            "is_pre_foreclosure": True,
            "is_absentee_owner": True,
            "owner_names": ["Morris"],
            "listing_agent_name": "Pat Koolik",
            "listing_agent_phone": "772-555-0100",
            "brokerage_name": "Koolik Group",
        },
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["case"] == "pre_foreclosure"
    assert body["status"] == "ready"
    assert body["source"] == "template"
    assert len(body["tasks"]) >= 3
    assert any(c["role"] == "listing_agent" for c in body["contacts"])
    assert any(c["role"] == "seller" for c in body["contacts"])
    # No personal phone on the seller contact.
    seller = next(c for c in body["contacts"] if c["role"] == "seller")
    assert seller["phone"] is None


async def test_apply_writes_tasks_and_skips_open_duplicates(auth_client, db_session, created_user):
    property_id = await _save_property(
        auth_client,
        {
            "listing_status": "FOR_SALE",
            "is_off_market": False,
            "days_on_market": 12,
            "listing_agent_name": "Alex Agent",
        },
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    assert created.status_code == 201, created.text
    plan = created.json()
    first_title = plan["tasks"][0]["title"]

    # Pre-existing open task with the first template title.
    seeded = await task_service.create(
        db_session,
        property_id,
        str(created_user.id),
        TaskCreate(title=first_title),
    )
    assert seeded is not None

    applied = await auth_client.post(f"/api/v1/action-plan/{plan['id']}/apply")
    assert applied.status_code == 200, applied.text
    body = applied.json()
    assert body["tasks_skipped"] >= 1
    created_titles = {t["title"] for t in body["tasks_created"]}
    assert first_title not in created_titles
    assert all(t["source"] == "template" for t in body["tasks_created"])
    assert all(t["action_plan_id"] == plan["id"] for t in body["tasks_created"])

    # Contacts from known facts land with source=template.
    assert any(c["name"] == "Alex Agent" for c in body["contacts_created"])


async def test_apply_does_not_skip_completed_same_title(auth_client, db_session, created_user):
    property_id = await _save_property(
        auth_client,
        {"listing_status": "FOR_SALE", "is_off_market": False, "days_on_market": 8},
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    plan = created.json()
    first_title = plan["tasks"][0]["title"]

    task = await task_service.create(
        db_session, property_id, str(created_user.id), TaskCreate(title=first_title)
    )
    assert task is not None
    await task_service.update(
        db_session,
        str(task.id),
        str(created_user.id),
        TaskUpdate(completed_at=datetime.now(UTC)),
    )

    applied = await auth_client.post(f"/api/v1/action-plan/{plan['id']}/apply")
    assert applied.status_code == 200, applied.text
    created_titles = {t["title"] for t in applied.json()["tasks_created"]}
    assert first_title in created_titles

    result = await db_session.execute(
        select(PropertyTask).where(PropertyTask.saved_property_id == uuid.UUID(property_id))
    )
    rows = list(result.scalars().all())
    matching = [t for t in rows if t.title == first_title]
    assert len(matching) == 2
    sources = {t.source if not hasattr(t.source, "value") else t.source.value for t in matching}
    assert ActionPlanSource.USER.value in sources or "user" in sources
    assert ActionPlanSource.TEMPLATE.value in sources or "template" in sources


async def test_create_unknown_property_404(auth_client):
    missing = await auth_client.post(f"/api/v1/properties/saved/{uuid.uuid4()}/action-plan")
    assert missing.status_code == 404


async def test_apply_unknown_plan_404(auth_client):
    missing = await auth_client.post(f"/api/v1/action-plan/{uuid.uuid4()}/apply")
    assert missing.status_code == 404
