"""Tests for /api/v1/markets — state assembly, indexability guard, slug resolution, caching.

The assembly step is pure so the noindex rule is pinned without a database; the
router tests stub the query functions and use an in-memory CacheService.
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from app.routers import markets as markets_router
from app.schemas.markets import CityCount
from app.services import markets_service
from app.services.assumptions_service import MARKET_ADJUSTMENTS
from app.services.cache_service import CacheService
from app.services.markets_service import (
    MIN_INDEXABLE_SECTIONS,
    US_STATES,
    assemble_state_market,
    resolve_state_code,
    state_assumptions,
    state_slug,
)
from fastapi import HTTPException


class TestStateLookup:
    def test_all_51_jurisdictions_present(self):
        assert len(US_STATES) == 51
        assert "DC" in US_STATES

    def test_slugs_are_unique_and_url_safe(self):
        slugs = [state_slug(c) for c in US_STATES]
        assert len(set(slugs)) == len(slugs)
        assert all(s == s.lower() and " " not in s for s in slugs)
        assert state_slug("NC") == "north-carolina"

    @pytest.mark.parametrize(
        "value,expected",
        [
            ("FL", "FL"),
            ("fl", "FL"),
            ("florida", "FL"),
            ("New-York", "NY"),
            ("district-of-columbia", "DC"),
            ("atlantis", None),
            ("", None),
        ],
    )
    def test_resolve_state_code(self, value, expected):
        assert resolve_state_code(value) == expected


class TestStateAssumptions:
    def test_state_with_own_row_is_specific(self):
        fl = state_assumptions("FL")
        assert fl.is_state_specific is True
        assert fl.property_tax_rate == MARKET_ADJUSTMENTS["FL"]["property_tax_rate"]

    def test_state_on_baseline_is_not_specific(self):
        # AL is listed but carries the national defaults verbatim.
        al = state_assumptions("AL")
        assert al.is_state_specific is False
        assert al.vacancy_rate == MARKET_ADJUSTMENTS["DEFAULT"]["vacancy_rate"]

    def test_unlisted_state_falls_back_to_baseline(self):
        # Every jurisdiction must resolve even if the adjustments table lacks it.
        for code in US_STATES:
            assert state_assumptions(code).property_tax_rate > 0


class TestIndexabilityGuard:
    def test_specific_assumptions_plus_lenders_is_indexable(self):
        detail = assemble_state_market("TX", lender_count=12, buyer_count=0, buyer_cities=[])
        assert detail.data_sections == ["assumptions", "lenders"]
        assert detail.indexable is True

    def test_lenders_plus_buyers_is_indexable_without_specific_assumptions(self):
        detail = assemble_state_market(
            "OH", lender_count=3, buyer_count=9, buyer_cities=[CityCount(city="Columbus", count=4)]
        )
        assert detail.has_state_specific_assumptions is False
        assert detail.data_sections == ["lenders", "buyers"]
        assert detail.indexable is True

    def test_single_section_is_noindex(self):
        only_lenders = assemble_state_market("OH", lender_count=3, buyer_count=0, buyer_cities=[])
        assert only_lenders.data_sections == ["lenders"]
        assert only_lenders.indexable is False

        only_assumptions = assemble_state_market("CA", lender_count=0, buyer_count=0, buyer_cities=[])
        assert only_assumptions.data_sections == ["assumptions"]
        assert only_assumptions.indexable is False

    def test_baseline_alone_never_indexes(self):
        # The national baseline is not evidence about the state.
        detail = assemble_state_market("WY", lender_count=0, buyer_count=0, buyer_cities=[])
        assert detail.data_sections == []
        assert detail.indexable is False
        assert MIN_INDEXABLE_SECTIONS == 2

    def test_generated_at_is_iso(self):
        stamp = datetime(2026, 9, 3, 12, 0, tzinfo=UTC)
        detail = assemble_state_market("FL", lender_count=1, buyer_count=1, buyer_cities=[], generated_at=stamp)
        assert detail.generated_at == "2026-09-03T12:00:00+00:00"


@pytest.fixture
def memory_cache(monkeypatch):
    cache = CacheService(redis_url=None)
    monkeypatch.setattr(markets_router, "get_cache_service", lambda: cache)
    return cache


class TestRouter:
    async def test_unknown_state_404(self, memory_cache):
        with pytest.raises(HTTPException) as exc:
            await markets_router.get_state("atlantis", db=AsyncMock())
        assert exc.value.status_code == 404

    async def test_detail_accepts_slug_and_caches(self, memory_cache, monkeypatch):
        calls = {"n": 0}

        async def fake_detail(db, code):
            calls["n"] += 1
            return assemble_state_market(code, lender_count=5, buyer_count=7, buyer_cities=[])

        monkeypatch.setattr(markets_router, "get_state_market", fake_detail)

        first = await markets_router.get_state("florida", db=AsyncMock())
        second = await markets_router.get_state("FL", db=AsyncMock())

        assert first.code == "FL"
        assert first.indexable is True
        assert second.model_dump() == first.model_dump()
        assert calls["n"] == 1, "second request must be served from cache"

    async def test_list_returns_every_state(self, memory_cache, monkeypatch):
        async def fake_lenders(db):
            return {code: (4 if code == "FL" else 0) for code in US_STATES}

        async def fake_buyers(db):
            return {code: (2 if code == "FL" else 0) for code in US_STATES}

        monkeypatch.setattr(markets_service, "lender_counts_by_state", fake_lenders)
        monkeypatch.setattr(markets_service, "buyer_counts_by_state", fake_buyers)

        result = await markets_router.get_states(db=AsyncMock())
        assert len(result.states) == 51
        by_code = {s.code: s for s in result.states}
        assert by_code["FL"].indexable is True
        assert by_code["WY"].indexable is False
        assert by_code["WY"].lender_count == 0
