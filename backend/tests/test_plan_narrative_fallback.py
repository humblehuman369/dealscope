"""Plan narrative — template fallback when Claude is missing, slow, or broken."""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest
from app.schemas.plans import PlanLever, PlanNarrativeRequest, WizardAnswers
from app.services import plan_narrative_service as svc

pytestmark = pytest.mark.asyncio


def _request(family: str = "financing") -> PlanNarrativeRequest:
    return PlanNarrativeRequest(
        address="953 Banyan Dr, Delray Beach, FL 33483",
        family=family,
        family_label="Creative Financing",
        headline="Seller Financing $38,000",
        bullets=["Market price: $450,000 → $450,000", "Seller 2nd: $38,000 (0%, 5yr balloon)"],
        levers=[
            PlanLever(label="Market price", before_label="$450,000", after_label="$450,000"),
            PlanLever(label="Seller 2nd", before_label="", after_label="$38,000 (0%, 5yr balloon)"),
        ],
        monthly_savings=312.0,
        cash_required=61_000.0,
        list_price=450_000.0,
        target_buy_price=412_000.0,
        wizard_answers=WizardAnswers(cash="25_75k", priority="least_cash", terms="seller_financing"),
    )


class _MemoryCache:
    def __init__(self) -> None:
        self.store: dict[str, object] = {}

    async def get(self, key: str):
        return self.store.get(key)

    async def set(self, key: str, value, ttl_seconds: int = 0):
        self.store[key] = value
        return True


@pytest.fixture(autouse=True)
def _isolated_client_and_cache(monkeypatch):
    """Each test decides what the Anthropic client looks like; cache is in-memory."""
    cache = _MemoryCache()
    monkeypatch.setattr(svc, "get_cache_service", lambda: cache)
    monkeypatch.setattr(svc, "_anthropic_checked", False)
    monkeypatch.setattr(svc, "_anthropic_client", None)
    return cache


async def test_no_api_key_uses_template(monkeypatch):
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", None)
    out = await svc.generate_narrative(_request())
    assert out.source == "template"
    assert "seller" in out.summary.lower()
    assert "$312" in out.summary
    assert "least cash out of pocket" in out.summary
    assert out.pitch


async def test_template_never_invents_numbers_for_price_plan(monkeypatch):
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", None)
    req = _request(family="price")
    req.levers = [PlanLever(label="Purchase price", before_label="$450,000", after_label="$412,000")]
    out = await svc.generate_narrative(req)
    assert "$412,000" in out.summary
    assert "$412,000" in out.pitch


async def test_ai_timeout_falls_back_to_template(monkeypatch):
    monkeypatch.setattr(svc, "AI_TIMEOUT_SECONDS", 0.05)

    def slow_call(client, facts):
        import time

        time.sleep(0.5)
        return ("late", "late")

    monkeypatch.setattr(svc, "_call_claude", slow_call)
    monkeypatch.setattr(svc, "_ensure_anthropic", lambda: MagicMock())
    out = await svc.generate_narrative(_request())
    assert out.source == "template"


async def test_ai_error_falls_back_to_template(monkeypatch):
    def boom(client, facts):
        raise RuntimeError("upstream 500")

    monkeypatch.setattr(svc, "_call_claude", boom)
    monkeypatch.setattr(svc, "_ensure_anthropic", lambda: MagicMock())
    out = await svc.generate_narrative(_request())
    assert out.source == "template"


async def test_ai_malformed_reply_falls_back_to_template(monkeypatch):
    monkeypatch.setattr(svc, "_call_claude", lambda client, facts: None)
    monkeypatch.setattr(svc, "_ensure_anthropic", lambda: MagicMock())
    out = await svc.generate_narrative(_request())
    assert out.source == "template"


async def test_ai_success_is_cached(monkeypatch, _isolated_client_and_cache):
    calls = {"n": 0}

    def ok(client, facts):
        calls["n"] += 1
        return ("AI summary using $38,000.", "AI pitch.")

    monkeypatch.setattr(svc, "_call_claude", ok)
    monkeypatch.setattr(svc, "_ensure_anthropic", lambda: MagicMock())

    first = await svc.generate_narrative(_request())
    second = await svc.generate_narrative(_request())
    assert first.source == "ai"
    assert second.source == "ai"
    assert calls["n"] == 1, "second identical request must be served from cache"
    assert svc.cache_key(_request()) in _isolated_client_and_cache.store


async def test_parse_ai_json_tolerates_fences():
    text = '```json\n{"summary": "S.", "pitch": "P."}\n```'
    assert svc._parse_ai_json(text) == ("S.", "P.")
    assert svc._parse_ai_json("not json") is None
    assert svc._parse_ai_json('{"summary": "", "pitch": "P."}') is None


async def test_event_loop_not_blocked_by_sync_client(monkeypatch):
    """The Claude call runs in a thread — the loop must stay responsive."""
    monkeypatch.setattr(svc, "_ensure_anthropic", lambda: MagicMock())

    def slow_ok(client, facts):
        import time

        time.sleep(0.2)
        return ("S.", "P.")

    monkeypatch.setattr(svc, "_call_claude", slow_ok)

    ticks = 0

    async def ticker():
        nonlocal ticks
        for _ in range(5):
            await asyncio.sleep(0.02)
            ticks += 1

    _, out = await asyncio.gather(ticker(), svc.generate_narrative(_request()))
    assert ticks == 5
    assert out.source == "ai"
