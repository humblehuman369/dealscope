"""Tests for /api/lenders — pagination cap, filters, and the paid gate (Task 3.1)."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.routers.lenders import _require_paid_lenders, get_lender_stats
from app.services.entitlements import Entitlement
from app.services.lenders_service import (
    MAX_PAGE_SIZE,
    get_lender_by_id,
    lender_total,
    list_lenders_page,
)
from fastapi import HTTPException


def _user():
    return SimpleNamespace(id=uuid.uuid4(), email="user@example.com")


# ---------------------------------------------------------------------------
# Service: pagination and filters (real dataset, no DB required)
# ---------------------------------------------------------------------------


def test_page_size_is_capped_at_25():
    lenders, total, total_pages = list_lenders_page(page=1, limit=10_000)
    assert len(lenders) <= MAX_PAGE_SIZE == 25
    assert total > 25  # dataset is larger than one page
    assert total_pages >= total // MAX_PAGE_SIZE


def test_no_single_response_contains_the_full_dataset():
    total = lender_total()
    lenders, _, _ = list_lenders_page(page=1, limit=MAX_PAGE_SIZE)
    assert len(lenders) < total


def test_pagination_walks_without_overlap():
    page1, _, _ = list_lenders_page(page=1, limit=25)
    page2, _, _ = list_lenders_page(page=2, limit=25)
    ids1 = {lender.id for lender in page1}
    ids2 = {lender.id for lender in page2}
    assert ids1.isdisjoint(ids2)


def test_page_beyond_range_is_empty():
    _, total, _ = list_lenders_page(page=1, limit=25)
    beyond = (total // 25) + 2
    lenders, _, _ = list_lenders_page(page=beyond, limit=25)
    assert lenders == []


def test_state_filter():
    lenders, total, _ = list_lenders_page(state="FL", page=1, limit=25)
    assert total > 0
    assert all("FL" in lender.states_served for lender in lenders)


def test_name_search_filter():
    lenders, total, _ = list_lenders_page(q="capital", page=1, limit=25)
    assert total > 0
    assert all(
        "capital" in lender.company_name.lower() or "capital" in lender.domain.lower()
        for lender in lenders
    )


def test_get_lender_by_id_roundtrip():
    first_page, _, _ = list_lenders_page(page=1, limit=1)
    lender = first_page[0]
    assert get_lender_by_id(lender.id) is not None
    assert get_lender_by_id(lender.id).company_name == lender.company_name
    assert get_lender_by_id(-1) is None


# ---------------------------------------------------------------------------
# Router gate: resolves through the ONE entitlement helper
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("entitlement", [Entitlement.FREE, Entitlement.TRIAL])
async def test_non_paid_gets_401_pro_required_with_total(monkeypatch, entitlement):
    monkeypatch.setattr(
        "app.routers.lenders.resolve_entitlement", AsyncMock(return_value=entitlement)
    )

    with pytest.raises(HTTPException) as exc:
        await _require_paid_lenders(SimpleNamespace(), _user())

    assert exc.value.status_code == 401
    assert exc.value.detail["error"] == "PRO_REQUIRED"
    assert exc.value.detail["total"] == lender_total()


async def test_paid_passes_gate(monkeypatch):
    monkeypatch.setattr(
        "app.routers.lenders.resolve_entitlement", AsyncMock(return_value=Entitlement.PAID)
    )
    # Must not raise.
    await _require_paid_lenders(SimpleNamespace(), _user())


async def test_stats_teaser_for_non_paid(monkeypatch):
    monkeypatch.setattr(
        "app.routers.lenders.resolve_entitlement", AsyncMock(return_value=Entitlement.TRIAL)
    )

    response = await get_lender_stats(current_user=_user(), db=SimpleNamespace())

    assert response.status_code == 401
    assert b'"total"' in response.body
    # Teaser must not include breakdowns.
    assert b"byState" not in response.body


async def test_stats_full_for_paid(monkeypatch):
    monkeypatch.setattr(
        "app.routers.lenders.resolve_entitlement", AsyncMock(return_value=Entitlement.PAID)
    )

    stats = await get_lender_stats(current_user=_user(), db=SimpleNamespace())

    assert stats.total == lender_total()
    assert stats.byState  # breakdowns included for paid users
