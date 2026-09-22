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
    US_STATES,
    assemble_state_market,
    is_indexable,
    resolve_state_code,
    state_assumptions,
    state_slug,
)
from fastapi import HTTPException

# Every jurisdiction with its own MARKET_ADJUSTMENTS row. FL_SOUTH is a
# sub-region key, not a state, so it is deliberately absent.
STATE_SPECIFIC = {"CA", "FL", "GA", "TX"}


def _market(code, *, state_lenders=0, nationwide=90, buyers=0, cities=None, generated_at=None):
    return assemble_state_market(
        code,
        state_lender_count=state_lenders,
        nationwide_lender_count=nationwide,
        buyer_count=buyers,
        buyer_cities=cities or [],
        generated_at=generated_at,
    )


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
    def test_only_four_states_have_specific_rows(self):
        # If this changes, the indexable set changes with it — update the PR notes.
        specific = {code for code in US_STATES if state_assumptions(code).is_state_specific}
        assert specific == STATE_SPECIFIC

    def test_specific_assumptions_plus_state_lenders_is_indexable(self):
        detail = _market("TX", state_lenders=12)
        assert detail.data_sections == ["assumptions", "lenders"]
        assert detail.indexable is True

    def test_specific_assumptions_plus_buyers_is_indexable(self):
        detail = _market("CA", buyers=5, cities=[CityCount(city="Los Angeles", count=3)])
        assert detail.data_sections == ["assumptions", "buyers"]
        assert detail.indexable is True

    def test_directory_data_without_specific_assumptions_is_noindex(self):
        # Previously indexable: two directory sections. Now the baseline table
        # would be the page's centrepiece while claiming to be about Ohio.
        detail = _market("OH", state_lenders=3, buyers=9, cities=[CityCount(city="Columbus", count=4)])
        assert detail.has_state_specific_assumptions is False
        assert detail.data_sections == ["lenders", "buyers"]
        assert detail.indexable is False

    def test_nationwide_lenders_never_count_as_a_state_section(self):
        # The padding case from the audit: ~90 nationwide lenders on every state.
        detail = _market("CA", state_lenders=0, nationwide=90, buyers=0)
        assert detail.lender_count == 90
        assert detail.state_lender_count == 0
        assert detail.nationwide_lender_count == 90
        assert detail.data_sections == ["assumptions"]
        assert detail.indexable is False

    def test_specific_assumptions_alone_is_noindex(self):
        detail = _market("GA", nationwide=0)
        assert detail.data_sections == ["assumptions"]
        assert detail.indexable is False

    def test_baseline_alone_never_indexes(self):
        detail = _market("WY", nationwide=0)
        assert detail.data_sections == []
        assert detail.indexable is False

    def test_lender_count_is_the_sum_of_both_kinds(self):
        detail = _market("FL", state_lenders=130, nationwide=90, buyers=200)
        assert detail.lender_count == 220
        assert detail.indexable is True

    @pytest.mark.parametrize(
        "specific,state_lenders,buyers,expected",
        [
            (True, 1, 0, True),
            (True, 0, 1, True),
            (True, 0, 0, False),
            (False, 50, 50, False),
            (False, 0, 0, False),
        ],
    )
    def test_is_indexable_rule(self, specific, state_lenders, buyers, expected):
        assert (
            is_indexable(
                has_state_specific_assumptions=specific,
                state_lender_count=state_lenders,
                buyer_count=buyers,
            )
            is expected
        )

    def test_generated_at_is_iso(self):
        stamp = datetime(2026, 9, 3, 12, 0, tzinfo=UTC)
        detail = _market("FL", state_lenders=1, buyers=1, generated_at=stamp)
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
            return _market(code, state_lenders=5, buyers=7)

        monkeypatch.setattr(markets_router, "get_state_market", fake_detail)

        first = await markets_router.get_state("florida", db=AsyncMock())
        second = await markets_router.get_state("FL", db=AsyncMock())

        assert first.code == "FL"
        assert first.indexable is True
        assert second.model_dump() == first.model_dump()
        assert calls["n"] == 1, "second request must be served from cache"

    async def test_cache_keys_are_versioned_past_v1(self):
        # v1 payloads lack the split lender counts; reading one would 500.
        assert markets_router._LIST_KEY != "markets:states:v1"
        assert not markets_router._detail_key("FL").startswith("markets:state:v1:")

    async def test_list_returns_every_state(self, memory_cache, monkeypatch):
        async def fake_lenders(db):
            return {code: (4 if code == "FL" else 0) for code in US_STATES}

        async def fake_nationwide(db):
            return 90

        async def fake_buyers(db):
            return {code: (2 if code in {"FL", "OH"} else 0) for code in US_STATES}

        monkeypatch.setattr(markets_service, "lender_counts_by_state", fake_lenders)
        monkeypatch.setattr(markets_service, "nationwide_lender_count", fake_nationwide)
        monkeypatch.setattr(markets_service, "buyer_counts_by_state", fake_buyers)

        result = await markets_router.get_states(db=AsyncMock())
        assert len(result.states) == 51
        by_code = {s.code: s for s in result.states}
        assert by_code["FL"].indexable is True
        assert by_code["FL"].lender_count == 94
        assert by_code["FL"].state_lender_count == 4
        # Buyers but a baseline assumptions row: rendered, not indexed.
        assert by_code["OH"].indexable is False
        # Nationwide padding alone is not a state section.
        assert by_code["WY"].indexable is False
        assert by_code["WY"].lender_count == 90
        assert by_code["WY"].state_lender_count == 0
        assert by_code["WY"].nationwide_lender_count == 90
        assert {s.code for s in result.states if s.indexable} == {"FL"}
