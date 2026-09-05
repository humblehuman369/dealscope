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


async def test_template_uses_only_supplied_numbers(monkeypatch):
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", None)
    out = await svc.generate_breakeven_narrative(_request())
    assert out.source == "template"
    assert "$152,000" in out.overview
    assert "$812" in out.overview
    assert set(out.ways) == {"price", "income", "financing", "capital_stack"}
    assert "$307,000" in out.ways["price"] and "33.0%" in out.ways["price"]
    assert "$3,475" in out.ways["income"]
    assert "only closes part of the gap" in out.ways["financing"]
    assert "your decision" in out.ways["capital_stack"].lower()
    assert out.blend.startswith("94 days on market")


async def test_ai_reply_is_merged_and_missing_ways_backfilled(monkeypatch):
    monkeypatch.setattr(svc.settings, "ANTHROPIC_API_KEY", "test-key")
    client = MagicMock()
    block = MagicMock()
    block.type = "text"
    block.text = (
        '{"overview": "AI overview.", "ways": {"price": "AI price text.", "financing": "AI terms text."}, '
        '"blend": "AI blend."}'
    )
    client.messages.create.return_value = MagicMock(content=[block])
    monkeypatch.setattr(svc, "_anthropic_client", client)
    monkeypatch.setattr(svc, "_anthropic_checked", True)

    out = await svc.generate_breakeven_narrative(_request())
    assert out.source == "ai"
    assert out.ways["price"] == "AI price text."
    assert out.ways["financing"] == "AI terms text."
    # Model skipped these — template fills them so no row is blank.
    assert "$3,475" in out.ways["income"]
    assert "capital_stack" in out.ways


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
