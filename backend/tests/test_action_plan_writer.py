"""Action Plan writer fallback and apply rules."""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from app.core.config import settings
from app.core.deps import get_current_user, get_current_verified_user
from app.main import app
from app.models.action_plan import ActionPlanCase
from app.models.saved_property import PropertyStatus
from app.services.action_plan.templates import build_template_plan
from app.services.action_plan.writer import (
    confirm_task_title,
    merge_research_into_plan,
    write_plan,
)
from app.services.saved_property_service import saved_property_service

from tests.test_action_plan_research import RIVER_HAMMOCK_RESEARCH

PRE_FORECLOSURE_SNAPSHOT = {
    "listing": {
        "listing_status": "OFF_MARKET",
        "is_off_market": True,
        "is_pre_foreclosure": True,
        "is_absentee_owner": True,
        "owner_names": ["Morris"],
        "listing_agent_name": "Pat Koolik",
        "listing_agent_phone": "772-555-0100",
        "brokerage_name": "Koolik Group",
    }
}

TEMPLATE = build_template_plan(
    PRE_FORECLOSURE_SNAPSHOT,
    address="117 River Hammock Dr, Fort Pierce, FL 34982",
    case=ActionPlanCase.PRE_FORECLOSURE,
)


@pytest.fixture(autouse=True)
def _reset_writer_client(monkeypatch):
    monkeypatch.setattr("app.services.action_plan.writer._anthropic_checked", False)
    monkeypatch.setattr("app.services.action_plan.writer._anthropic_client", None)


class TestWriterFallback:
    @pytest.mark.asyncio
    async def test_no_key_returns_template(self, monkeypatch):
        monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
        out = await write_plan(
            case=ActionPlanCase.PRE_FORECLOSURE,
            template=TEMPLATE,
            research=RIVER_HAMMOCK_RESEARCH,
        )
        assert out["summary"] == TEMPLATE["summary"]
        assert out["source"] == "template"
        titles = [t["title"] for t in out["tasks"]]
        assert any(t == TEMPLATE["tasks"][0]["title"] for t in titles)
        assert confirm_task_title("foreclosure_case_number") in titles
        assert not any("invented-case" in t.lower() for t in titles)

    @pytest.mark.asyncio
    async def test_malformed_json_returns_template(self, monkeypatch):
        client = MagicMock()
        block = MagicMock(type="text", text="not json at all")
        client.messages.create.return_value = MagicMock(content=[block])
        monkeypatch.setattr("app.services.action_plan.writer._ensure_anthropic", lambda: client)
        out = await write_plan(
            case=ActionPlanCase.PRE_FORECLOSURE,
            template=TEMPLATE,
            research=RIVER_HAMMOCK_RESEARCH,
        )
        assert out["summary"] == TEMPLATE["summary"]
        assert out["source"] == "template"

    @pytest.mark.asyncio
    async def test_timeout_returns_template(self, monkeypatch):
        monkeypatch.setattr("app.services.action_plan.writer.WRITER_TIMEOUT_SECONDS", 0.05)

        def slow(_client, _case, _template, _research):
            import time

            time.sleep(0.2)
            return {"summary": "should not land", "tasks": [{"title": "x"}], "contacts": []}

        monkeypatch.setattr("app.services.action_plan.writer._ensure_anthropic", lambda: object())
        monkeypatch.setattr("app.services.action_plan.writer._call_claude", slow)
        out = await write_plan(
            case=ActionPlanCase.PRE_FORECLOSURE,
            template=TEMPLATE,
            research=None,
        )
        assert out["summary"] == TEMPLATE["summary"]
        assert out["source"] == "template"

    @pytest.mark.asyncio
    async def test_valid_json_rewrites_plan(self, monkeypatch):
        written = {
            "summary": "Call Pat. Confirm the case number before you treat it as known.",
            "tasks": [
                {
                    "title": "Call Pat Koolik",
                    "notes": "Ask why it expired. Who: Pat Koolik · 772-468-1800",
                    "due_offset_days": 1,
                },
                {
                    "title": confirm_task_title("foreclosure_case_number"),
                    "notes": "UNVERIFIED. Do not treat a case number as known.",
                    "due_offset_days": 1,
                },
            ],
            "contacts": [
                {
                    "name": "Pat Koolik",
                    "role": "listing_agent",
                    "company": "Koolik Group",
                    "phone": "772-468-1800",
                    "email": None,
                    "notes": "Most recent listing agent.",
                }
            ],
        }
        client = MagicMock()
        block = MagicMock(type="text", text=json.dumps(written))
        client.messages.create.return_value = MagicMock(content=[block])
        monkeypatch.setattr("app.services.action_plan.writer._ensure_anthropic", lambda: client)
        out = await write_plan(
            case=ActionPlanCase.PRE_FORECLOSURE,
            template=TEMPLATE,
            research=RIVER_HAMMOCK_RESEARCH,
        )
        assert out["source"] == "ai"
        assert out["summary"] == written["summary"]
        assert out["facts"] == TEMPLATE["facts"]
        assert out["case"] == TEMPLATE["case"]
        assert any(t["title"] == "Call Pat Koolik" for t in out["tasks"])
        assert any(t["title"] == confirm_task_title("foreclosure_case_number") for t in out["tasks"])


class TestMergeResearch:
    def test_unverified_becomes_confirm_this(self):
        merged = merge_research_into_plan(TEMPLATE, RIVER_HAMMOCK_RESEARCH)
        titles = [t["title"] for t in merged["tasks"]]
        assert confirm_task_title("foreclosure_case_number") in titles
        notes = next(
            t["notes"]
            for t in merged["tasks"]
            if t["title"] == confirm_task_title("foreclosure_case_number")
        )
        assert "UNVERIFIED" in notes
        assert not any("Confirm this" in t["title"] and "Pat Koolik" in t["title"] for t in merged["tasks"])

    def test_does_not_duplicate_confirm_title(self):
        already = {
            **TEMPLATE,
            "tasks": [
                *TEMPLATE["tasks"],
                {
                    "title": confirm_task_title("foreclosure_case_number"),
                    "notes": "already",
                    "due_offset_days": 1,
                },
            ],
        }
        merged = merge_research_into_plan(already, RIVER_HAMMOCK_RESEARCH)
        titles = [t["title"] for t in merged["tasks"]]
        assert titles.count(confirm_task_title("foreclosure_case_number")) == 1


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
            "property_data_snapshot": {"listing": listing, "details": {"parcel_id": "2433-501-0044-000-5"}},
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


async def test_apply_writes_ai_contacts_and_confirm_tasks(auth_client, monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr(
        "app.services.action_plan.research.cached_research",
        AsyncMock(return_value=RIVER_HAMMOCK_RESEARCH),
    )

    async def _write(*, case, template, research):
        return merge_research_into_plan(
            {
                **template,
                "summary": "Call Pat. Confirm the hidden case number.",
                "source": "ai",
            },
            research,
        )

    monkeypatch.setattr("app.services.action_plan.research.write_plan", _write)
    property_id = await _save_property(
        auth_client,
        {
            "listing_status": "OFF_MARKET",
            "is_off_market": True,
            "is_pre_foreclosure": True,
            "listing_agent_name": "Pat Koolik",
        },
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    plan = created.json()
    assert plan["status"] == "ready"
    applied = await auth_client.post(f"/api/v1/action-plans/{plan['id']}/apply", json={})
    assert applied.status_code == 200, applied.text
    body = applied.json()
    titles = {t["title"] for t in body["tasks_created"]}
    assert confirm_task_title("foreclosure_case_number") in titles
    assert all(t["source"] == "ai" for t in body["tasks_created"])
    assert all(t["action_plan_id"] == plan["id"] for t in body["tasks_created"])
    confirm = next(t for t in body["tasks_created"] if t["title"] == confirm_task_title("foreclosure_case_number"))
    assert "UNVERIFIED" in (confirm["notes"] or "")
    assert not any("2024-CA-999" in (t["title"] + (t["notes"] or "")) for t in body["tasks_created"])

    koolik = next(c for c in body["contacts_created"] if c["name"] == "Pat Koolik")
    assert koolik["source"] == "ai"
    assert koolik["role"] == "listing_agent"
    assert koolik["action_plan_id"] == plan["id"]
    assert "VERIFIED" in (koolik["notes"] or "")
    assert "koolik.com" in (koolik["notes"] or "")

    clerk = next(c for c in body["contacts_created"] if "clerk" in c["name"].lower() or "772-462-2000" in (c["phone"] or ""))
    assert clerk["source"] == "ai"
    assert "VERIFIED" in (clerk["notes"] or "")
    assert body["can_move_to_pursuing"] is True
    assert body["moved_to_pursuing"] is False
    assert body["property_status"] == "prospecting"


async def test_apply_skips_open_confirm_title(auth_client, monkeypatch, db_session, created_user):
    from app.schemas.task import TaskCreate
    from app.services.task_service import task_service

    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr(
        "app.services.action_plan.research.cached_research",
        AsyncMock(return_value=RIVER_HAMMOCK_RESEARCH),
    )
    async def _write(**kw):
        return merge_research_into_plan(kw["template"], kw.get("research"))

    monkeypatch.setattr("app.services.action_plan.research.write_plan", _write)
    property_id = await _save_property(
        auth_client,
        {"listing_status": "OFF_MARKET", "is_off_market": True, "is_pre_foreclosure": True},
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    plan = created.json()
    title = confirm_task_title("foreclosure_case_number")
    seeded = await task_service.create(
        db_session, property_id, str(created_user.id), TaskCreate(title=title)
    )
    assert seeded is not None
    applied = await auth_client.post(f"/api/v1/action-plans/{plan['id']}/apply")
    assert applied.status_code == 200, applied.text
    created_titles = {t["title"] for t in applied.json()["tasks_created"]}
    assert title not in created_titles
    assert applied.json()["tasks_skipped"] >= 1


async def test_apply_can_move_prospecting_to_pursuing(auth_client, monkeypatch, db_session, created_user):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    property_id = await _save_property(
        auth_client,
        {"listing_status": "FOR_SALE", "is_off_market": False, "days_on_market": 8},
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    plan = created.json()
    applied = await auth_client.post(
        f"/api/v1/action-plans/{plan['id']}/apply",
        json={"move_to_pursuing": True},
    )
    assert applied.status_code == 200, applied.text
    body = applied.json()
    assert body["moved_to_pursuing"] is True
    assert body["can_move_to_pursuing"] is False
    assert body["property_status"] == "pursuing"
    assert all(t["source"] == "template" for t in body["tasks_created"])
    saved = await saved_property_service.get_by_id(db_session, property_id, str(created_user.id))
    assert saved is not None
    assert saved.status == PropertyStatus.PURSUING
