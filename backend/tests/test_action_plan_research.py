"""Action Plan research step — parser, provider dispatch, timeout, poll."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from app.core.config import settings
from app.core.deps import get_current_user, get_current_verified_user
from app.main import app
from app.models.action_plan import ActionPlan, ActionPlanCase, ActionPlanStatus
from app.services.action_plan.research import (
    CASE_TARGETS,
    ResearchPoll,
    ResearchStart,
    build_openai_request,
    build_property_prompt,
    count_web_searches,
    estimate_cost_cents,
    parse_research_json,
    poll_research,
    provider_is_built,
    refresh_research,
    resolve_provider,
    start_research,
)

# River Hammock-shaped findings from the research doc / hand test. No invented
# case number — ChatGPT left that UNVERIFIED when the page hid it.
RIVER_HAMMOCK_RESEARCH = {
    "findings": [
        {
            "field": "most_recent_listing_agent",
            "value": "Pat Koolik, Koolik Group",
            "status": "VERIFIED",
            "source_url": "https://www.koolik.com/listings/117-river-hammock",
            "note": "Most recent expired listing.",
        },
        {
            "field": "listing_history",
            "value": "On Hold, then Expired June 2026",
            "status": "VERIFIED",
            "source_url": "https://www.koolik.com/listings/117-river-hammock",
            "note": "MLS history table, not the last Zillow row.",
        },
        {
            "field": "foreclosure_plaintiff",
            "value": "U.S. Bank as trustee",
            "status": "VERIFIED",
            "source_url": "https://trellis.law/example",
            "note": "Complaint names the trustee.",
        },
        {
            "field": "foreclosure_case_number",
            "value": "",
            "status": "UNVERIFIED",
            "source_url": None,
            "note": "The page hid the case number.",
        },
        {
            "field": "county_clerk_phone",
            "value": "772-462-2000",
            "status": "VERIFIED",
            "source_url": "https://www.stlucieclerk.com",
            "note": "Records phone from the clerk's own site.",
        },
    ],
    "not_found": ["auction date"],
    "conflicts": [
        {
            "field": "last_listing_end",
            "what_disagrees": "Zillow said removed 2024; MLS history said expired June 2026",
            "which_i_trust": "MLS history",
            "why": "Zillow often hides old listings.",
        }
    ],
    "best_first_call": {
        "who": "Pat Koolik",
        "role": "listing_agent",
        "phone": "772-468-1800",
        "why": "Most recent listing agent.",
    },
}

PRE_FORECLOSURE_PAYLOAD = {
    "address": {
        "full_address": "117 River Hammock Dr, Fort Pierce, FL 34982",
        "city": "Fort Pierce",
        "state": "FL",
        "county": "St. Lucie",
    },
    "details": {"parcel_id": "2433-501-0044-000-5"},
    "listing": {
        "listing_status": "OFF_MARKET",
        "is_off_market": True,
        "is_pre_foreclosure": True,
        "is_absentee_owner": True,
        "owner_names": ["Jane Morris", "Robert Morris"],
        "owner_mailing_address": "900 Mailing Rd, Orlando, FL",
        "listing_agent_name": "Pat Koolik",
        "brokerage_name": "Koolik Group",
        "list_price": 275000,
        "days_on_market": 40,
    },
}


class TestParserAndCost:
    def test_river_hammock_json(self):
        parsed = parse_research_json(json.dumps(RIVER_HAMMOCK_RESEARCH))
        fields = {f["field"]: f for f in parsed["findings"]}
        assert fields["most_recent_listing_agent"]["status"] == "VERIFIED"
        assert fields["foreclosure_case_number"]["status"] == "UNVERIFIED"
        assert fields["foreclosure_case_number"]["source_url"] is None
        assert parsed["best_first_call"]["who"] == "Pat Koolik"
        assert parsed["conflicts"][0]["which_i_trust"] == "MLS history"
        assert "auction date" in parsed["not_found"]

    def test_rejects_empty(self):
        with pytest.raises(ValueError):
            parse_research_json("")

    def test_rejects_missing_best_first_call(self):
        with pytest.raises(ValueError):
            parse_research_json(json.dumps({"findings": [], "not_found": [], "conflicts": []}))

    def test_drops_bogus_finding_status(self):
        payload = {
            **RIVER_HAMMOCK_RESEARCH,
            "findings": [
                {
                    "field": "agent",
                    "value": "x",
                    "status": "GUESSED",
                    "source_url": "https://example.com",
                    "note": "",
                }
            ],
        }
        parsed = parse_research_json(json.dumps(payload))
        assert parsed["findings"] == []

    def test_counts_web_search_calls(self):
        output = [
            {"type": "web_search_call"},
            {"type": "web_search_call"},
            {"type": "message", "content": []},
        ]
        assert count_web_searches(output) == 2

    def test_terra_cost_matches_doc_ballpark(self):
        # 10 searches + 40k in + 3k out ≈ 22 cents on terra.
        cents = estimate_cost_cents("gpt-5.6-terra", searches=10, input_tokens=40_000, output_tokens=3_000)
        assert 20 <= cents <= 24


class TestPromptAndProvider:
    def test_every_case_builds_a_prompt(self):
        assert set(CASE_TARGETS) == set(ActionPlanCase)
        for case, lines in CASE_TARGETS.items():
            assert len(lines) >= 3
            prompt = build_property_prompt({}, case, address="1 Main St")
            assert "Find, in this order:" in prompt
            assert "1 Main St" in prompt

    def test_pre_foreclosure_prompt_matches_doc_shape(self):
        prompt = build_property_prompt(
            PRE_FORECLOSURE_PAYLOAD,
            ActionPlanCase.PRE_FORECLOSURE,
            address="117 River Hammock Dr, Fort Pierce, FL 34982",
        )
        assert "117 River Hammock Dr" in prompt
        assert "St. Lucie, FL" in prompt
        assert "2433-501-0044-000-5" in prompt
        assert "Pre-foreclosure flag is set" in prompt
        assert "Jane Morris" in prompt
        assert "Pat Koolik" in prompt
        assert "Find, in this order:" in prompt
        assert "foreclosure case" in prompt.lower()

    def test_openai_request_shape(self):
        body = build_openai_request("sys", "user")
        assert body["model"] == "gpt-5.6-terra"
        assert body["background"] is True
        assert body["store"] is True
        assert body["reasoning"] == {"effort": "medium"}
        tool = body["tools"][0]
        assert tool["type"] == "web_search"
        assert tool["search_context_size"] == "high"
        assert "spokeo.com" in tool["filters"]["blocked_domains"]
        assert "facebook.com" in tool["filters"]["blocked_domains"]
        assert body["max_tool_calls"] == 12
        fmt = body["text"]["format"]
        assert fmt["type"] == "json_schema"
        assert fmt["name"] == "property_research"
        assert fmt["strict"] is True
        assert fmt["schema"]["required"] == ["findings", "not_found", "best_first_call", "conflicts"]

    def test_openai_is_built_others_are_not(self):
        from app.services.action_plan.research import ResearchProvider

        assert provider_is_built(ResearchProvider.OPENAI)
        assert not provider_is_built(ResearchProvider.ANTHROPIC)
        assert not provider_is_built(ResearchProvider.XAI)

    @pytest.mark.asyncio
    async def test_anthropic_skips_openai(self, monkeypatch):
        monkeypatch.setattr(settings, "ACTION_PLAN_RESEARCH_PROVIDER", "anthropic")
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test-not-used")

        async def boom(*_a, **_k):
            raise AssertionError("OpenAI must not be called when provider is anthropic")

        monkeypatch.setattr("app.services.action_plan.research._openai_request", boom)
        monkeypatch.setattr("app.services.action_plan.research.cached_research", AsyncMock(return_value=None))
        result = await start_research(PRE_FORECLOSURE_PAYLOAD, ActionPlanCase.PRE_FORECLOSURE, address="x")
        assert result.kind == "skipped"
        assert result.reason == "provider_not_built"
        assert resolve_provider().value == "anthropic"

    @pytest.mark.asyncio
    async def test_xai_skips_openai(self, monkeypatch):
        monkeypatch.setattr(settings, "ACTION_PLAN_RESEARCH_PROVIDER", "xai")
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test-not-used")
        monkeypatch.setattr("app.services.action_plan.research.cached_research", AsyncMock(return_value=None))
        result = await start_research(PRE_FORECLOSURE_PAYLOAD, ActionPlanCase.ON_MARKET, address="x")
        assert result.kind == "skipped"
        assert result.reason == "provider_not_built"

    @pytest.mark.asyncio
    async def test_missing_key_skips(self, monkeypatch):
        monkeypatch.setattr(settings, "ACTION_PLAN_RESEARCH_PROVIDER", "openai")
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
        monkeypatch.setattr("app.services.action_plan.research.cached_research", AsyncMock(return_value=None))
        result = await start_research(PRE_FORECLOSURE_PAYLOAD, ActionPlanCase.PRE_FORECLOSURE, address="x")
        assert result.kind == "skipped"
        assert result.reason == "no_key"

    @pytest.mark.asyncio
    async def test_cache_hit_skips_openai(self, monkeypatch):
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
        monkeypatch.setattr(
            "app.services.action_plan.research.cached_research",
            AsyncMock(return_value=RIVER_HAMMOCK_RESEARCH),
        )

        async def boom(*_a, **_k):
            raise AssertionError("cache hit must not call OpenAI")

        monkeypatch.setattr("app.services.action_plan.research._openai_request", boom)
        result = await start_research(PRE_FORECLOSURE_PAYLOAD, ActionPlanCase.PRE_FORECLOSURE, address="x")
        assert result.kind == "cached"
        assert result.research["best_first_call"]["who"] == "Pat Koolik"


class TestPollOnce:
    @pytest.mark.asyncio
    async def test_still_running(self, monkeypatch):
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
        monkeypatch.setattr(
            "app.services.action_plan.research._openai_request",
            AsyncMock(return_value={"id": "resp_1", "status": "in_progress", "output": []}),
        )
        polled = await poll_research("resp_1")
        assert polled.status == "running"

    @pytest.mark.asyncio
    async def test_queued_is_running(self, monkeypatch):
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
        monkeypatch.setattr(
            "app.services.action_plan.research._openai_request",
            AsyncMock(return_value={"status": "queued"}),
        )
        polled = await poll_research("resp_1")
        assert polled.status == "running"

    @pytest.mark.asyncio
    async def test_completed_parses_output_text(self, monkeypatch):
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
        monkeypatch.setattr(
            "app.services.action_plan.research._openai_request",
            AsyncMock(
                return_value={
                    "status": "completed",
                    "output_text": json.dumps(RIVER_HAMMOCK_RESEARCH),
                    "output": [{"type": "web_search_call"}, {"type": "web_search_call"}],
                    "usage": {"input_tokens": 40000, "output_tokens": 3000},
                }
            ),
        )
        polled = await poll_research("resp_1")
        assert polled.status == "completed"
        assert polled.searches == 2
        assert polled.input_tokens == 40000
        assert polled.research["best_first_call"]["who"] == "Pat Koolik"

    @pytest.mark.asyncio
    async def test_failed_status(self, monkeypatch):
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
        monkeypatch.setattr(
            "app.services.action_plan.research._openai_request",
            AsyncMock(return_value={"status": "failed", "error": "boom"}),
        )
        polled = await poll_research("resp_1")
        assert polled.status == "failed"

    @pytest.mark.asyncio
    async def test_timeout_cancels_and_ships_template(self, monkeypatch):
        monkeypatch.setattr(settings, "ACTION_PLAN_RESEARCH_TIMEOUT_SECONDS", 240)
        cancel = AsyncMock()
        poll = AsyncMock(side_effect=AssertionError("timed-out plans must not poll OpenAI"))
        monkeypatch.setattr("app.services.action_plan.research.cancel_research", cancel)
        monkeypatch.setattr("app.services.action_plan.research.poll_research", poll)
        plan = ActionPlan(
            id=uuid.uuid4(),
            saved_property_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            case=ActionPlanCase.PRE_FORECLOSURE,
            status=ActionPlanStatus.RESEARCHING,
            provider="openai",
            provider_response_id="resp_timeout",
            created_at=datetime.now(UTC) - timedelta(minutes=5),
        )
        await refresh_research(plan)
        assert plan.status is ActionPlanStatus.READY
        assert plan.research is None
        cancel.assert_awaited_once_with("resp_timeout")
        poll.assert_not_called()


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


async def test_create_without_key_stays_template(auth_client, monkeypatch):
    monkeypatch.setattr(
        "app.services.action_plan.research.poll_research",
        AsyncMock(side_effect=AssertionError("ready plans must not poll OpenAI")),
    )
    property_id = await _save_property(
        auth_client,
        {"listing_status": "OFF_MARKET", "is_off_market": True, "is_pre_foreclosure": True},
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "ready"
    assert body["source"] == "template"
    assert body["research"] is None
    assert len(body["tasks"]) >= 3
    polled = await auth_client.get(f"/api/v1/action-plan/{body['id']}")
    assert polled.status_code == 200
    assert polled.json()["status"] == "ready"
    assert polled.json()["research"] is None


async def test_create_starts_research_when_openai_returns_id(auth_client, monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr(settings, "ACTION_PLAN_RESEARCH_PROVIDER", "openai")
    monkeypatch.setattr("app.services.action_plan.research.cached_research", AsyncMock(return_value=None))
    monkeypatch.setattr(
        "app.services.action_plan.research.start_research",
        AsyncMock(return_value=ResearchStart(kind="started", response_id="resp_abc")),
    )
    property_id = await _save_property(
        auth_client,
        {"listing_status": "OFF_MARKET", "is_off_market": True, "is_pre_foreclosure": True},
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "researching"
    assert body["source"] == "template"
    assert len(body["tasks"]) >= 3


async def test_get_poll_attaches_findings(auth_client, monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr("app.services.action_plan.research.cached_research", AsyncMock(return_value=None))
    monkeypatch.setattr(
        "app.services.action_plan.research.start_research",
        AsyncMock(return_value=ResearchStart(kind="started", response_id="resp_abc")),
    )
    monkeypatch.setattr(
        "app.services.action_plan.research.poll_research",
        AsyncMock(
            return_value=ResearchPoll(
                status="completed",
                research=RIVER_HAMMOCK_RESEARCH,
                searches=8,
                input_tokens=40000,
                output_tokens=3000,
            )
        ),
    )
    monkeypatch.setattr("app.services.action_plan.research.store_cached_research", AsyncMock())
    property_id = await _save_property(
        auth_client,
        {"listing_status": "OFF_MARKET", "is_off_market": True, "is_pre_foreclosure": True},
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    plan_id = created.json()["id"]
    polled = await auth_client.get(f"/api/v1/action-plan/{plan_id}")
    assert polled.status_code == 200, polled.text
    body = polled.json()
    assert body["status"] == "ready"
    assert body["research"]["best_first_call"]["who"] == "Pat Koolik"
    assert any(f["status"] == "VERIFIED" for f in body["research"]["findings"])
    assert any(f["status"] == "UNVERIFIED" and f["field"] == "foreclosure_case_number" for f in body["research"]["findings"])


async def test_get_still_running(auth_client, monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr("app.services.action_plan.research.cached_research", AsyncMock(return_value=None))
    monkeypatch.setattr(
        "app.services.action_plan.research.start_research",
        AsyncMock(return_value=ResearchStart(kind="started", response_id="resp_abc")),
    )
    monkeypatch.setattr(
        "app.services.action_plan.research.poll_research",
        AsyncMock(return_value=ResearchPoll(status="running")),
    )
    property_id = await _save_property(
        auth_client,
        {"listing_status": "FOR_SALE", "is_off_market": False, "days_on_market": 12},
    )
    created = await auth_client.post(f"/api/v1/properties/saved/{property_id}/action-plan")
    polled = await auth_client.get(f"/api/v1/action-plan/{created.json()['id']}")
    assert polled.status_code == 200
    assert polled.json()["status"] == "researching"
    assert polled.json()["research"] is None


async def test_get_unknown_plan_404(auth_client):
    missing = await auth_client.get(f"/api/v1/action-plan/{uuid.uuid4()}")
    assert missing.status_code == 404


async def test_apply_still_writes_template_after_research(auth_client, monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr("app.services.action_plan.research.cached_research", AsyncMock(return_value=None))
    monkeypatch.setattr(
        "app.services.action_plan.research.start_research",
        AsyncMock(return_value=ResearchStart(kind="cached", research=RIVER_HAMMOCK_RESEARCH)),
    )
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
    plan = created.json()
    assert plan["status"] == "ready"
    assert plan["research"]["best_first_call"]["who"] == "Pat Koolik"
    applied = await auth_client.post(f"/api/v1/action-plan/{plan['id']}/apply")
    assert applied.status_code == 200, applied.text
    titles = {t["title"] for t in applied.json()["tasks_created"]}
    assert any("listing agent" in t.lower() for t in titles)
    assert all(t["source"] == "template" for t in applied.json()["tasks_created"])
