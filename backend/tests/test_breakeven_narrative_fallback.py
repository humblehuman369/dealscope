"""Breakeven narrative — template fallback and AI merge behaviour."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from app.schemas.plans import BreakevenNarrativeRequest, BreakevenWayInput
from app.services import plan_narrative_service as svc

pytestmark = pytest.mark.asyncio


def _request() -> BreakevenNarrativeRequest:
    return BreakevenNarrativeRequest(
        address="953 Banyan Dr, Delray Beach, FL 33483",
        list_price=459_000,
        income_value=323_000,
        target_buy_price=307_000,
        gap_amount=152_000,
        gap_pct=33.0,
        monthly_shortfall=812,
        baseline_cash_required=114_750,
        ways=[
            BreakevenWayInput(
                family="price",
                name="Price",
                change_pct=33.0,
                change_amount=152_000,
                result_amount=307_000,
                result_label="Target Buy",
                rating="low",
                reasons=["A 33% cut is deeper than most sellers accept in a single move"],
            ),
            BreakevenWayInput(
                family="income",
                name="Income",
                change_pct=18.2,
                change_amount=535,
                result_amount=3_475,
                result_label="Target rent",
                rating="low",
                reasons=["A 18.2% lift usually means rehab, a unit add, or a strategy change — not a rent comp"],
            ),
            BreakevenWayInput(
                family="financing",
                name="Terms",
                change_pct=20.0,
                change_amount=91_800,
                result_amount=91_800,
                result_label="Seller financing",
                closes_gap_alone=False,
                terms_note="0% interest, 5-yr balloon; price to $307,000",
                rating="medium",
                reasons=["94 days on market — creative terms get a hearing once the easy offers dry up"],
            ),
            BreakevenWayInput(
                family="capital_stack",
                name="Equity",
                change_pct=15.0,
                change_amount=68_850,
                result_amount=160_650,
                result_label="Down payment",
                terms_note="35% down",
                rating="your_call",
                reasons=["Your decision, not the seller's — no negotiation required"],
            ),
        ],
        blend_recommendation="94 days on market: a modest price cut plus a small seller-carried second is the most probable close.",
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
def _isolated(monkeypatch):
    cache = _MemoryCache()
    monkeypatch.setattr(svc, "get_cache_service", lambda: cache)
    monkeypatch.setattr(svc, "_anthropic_checked", False)
    monkeypatch.setattr(svc, "_anthropic_client", None)
    return cache


async def test_template_gives_sequencing_and_a_walk_away(monkeypatch):
    """The fallback's job is advice, not restatement of what the rows show."""
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", None)
    out = await svc.generate_breakeven_narrative(_request())
    assert out.source == "template"

    # Terms is the only "medium" here, so it leads; the rest become the backup.
    assert out.move.startswith("Open here: offer full asking price")
    assert "$91,800 at 0%" in out.move
    assert "94 days on market is your leverage" in out.move
    assert "If they push back" in out.move
    assert "is your backup" in out.move

    assert "walk" in out.walk_away
    assert "$812" in out.walk_away


async def test_template_leads_with_the_likeliest_lever(monkeypatch):
    """Ranking is likelihood first, then the cheapest concession for the buyer."""
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", None)
    req = _request()
    for way in req.ways:
        way.rating = "high" if way.family == "price" else "low"

    out = await svc.generate_breakeven_narrative(req)
    assert out.move.startswith("Open here: put $307,000 on the table")
    assert "$459,000" in out.walk_away


async def test_template_is_honest_when_no_lever_closes_the_gap(monkeypatch):
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", None)
    req = _request()
    req.ways = []

    out = await svc.generate_breakeven_narrative(req)
    assert "no opening play" in out.move
    assert "pass at asking" in out.walk_away
    assert "$812" in out.walk_away


async def test_ai_reply_replaces_the_template_wholesale(monkeypatch):
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", "test-key")
    client = MagicMock()
    block = MagicMock()
    block.type = "text"
    block.text = '{"move": "AI move text.", "walk_away": "AI walk-away text."}'
    client.messages.create.return_value = MagicMock(content=[block])
    monkeypatch.setattr(svc, "_anthropic_client", client)
    monkeypatch.setattr(svc, "_anthropic_checked", True)

    out = await svc.generate_breakeven_narrative(_request())
    assert out.source == "ai"
    assert out.move == "AI move text."
    assert out.walk_away == "AI walk-away text."

    # Cash to close is what distinguishes the levers, so the model must see it.
    prompt = client.messages.create.call_args.kwargs["messages"][0]["content"]
    assert "cash to close at asking on standard terms: $114,750" in prompt
    assert "restating them is worthless" in client.messages.create.call_args.kwargs["system"].lower()


async def test_ai_reply_missing_walk_away_falls_back(monkeypatch):
    """A half-answer is worse than the deterministic one — both fields or neither."""
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", "test-key")
    client = MagicMock()
    block = MagicMock()
    block.type = "text"
    block.text = '{"move": "AI move text."}'
    client.messages.create.return_value = MagicMock(content=[block])
    monkeypatch.setattr(svc, "_anthropic_client", client)
    monkeypatch.setattr(svc, "_anthropic_checked", True)

    out = await svc.generate_breakeven_narrative(_request())
    assert out.source == "template"


async def test_ai_garbage_falls_back_to_template(monkeypatch):
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", "test-key")
    client = MagicMock()
    block = MagicMock()
    block.type = "text"
    block.text = "Sure! Here is some prose with no JSON."
    client.messages.create.return_value = MagicMock(content=[block])
    monkeypatch.setattr(svc, "_anthropic_client", client)
    monkeypatch.setattr(svc, "_anthropic_checked", True)

    out = await svc.generate_breakeven_narrative(_request())
    assert out.source == "template"


async def test_result_is_cached(monkeypatch, _isolated):
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", None)
    req = _request()
    first = await svc.generate_breakeven_narrative(req)
    assert svc.breakeven_cache_key(req) in _isolated.store
    second = await svc.generate_breakeven_narrative(req)
    assert first == second
