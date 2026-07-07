"""Tests for /api/lenders — pagination cap, filters, gates, and exports (3.1/3.3/3.4)."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.routers import lenders as lenders_router
from app.routers.lenders import export_lenders, get_lender_stats, list_lenders
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


def _list_kwargs(**overrides):
    kwargs = dict(
        state=None,
        product=None,
        min_loan=None,
        credit=None,
        q=None,
        include_web_only=True,
    )
    kwargs.update(overrides)
    return kwargs


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
# Router: view gates + trial redaction (Task 3.3)
# ---------------------------------------------------------------------------


async def test_free_list_gets_403(monkeypatch):
    async def deny(*args, **kwargs):
        raise HTTPException(status_code=403, detail={"error": "PRO_REQUIRED"})

    monkeypatch.setattr(lenders_router, "require_view_access", deny)

    with pytest.raises(HTTPException) as exc:
        await list_lenders(
            current_user=_user(), db=SimpleNamespace(), page=1, limit=25, **_list_kwargs()
        )

    assert exc.value.status_code == 403


async def test_trial_list_is_redacted(monkeypatch):
    monkeypatch.setattr(
        lenders_router, "require_view_access", AsyncMock(return_value=Entitlement.TRIAL)
    )

    response = await list_lenders(
        current_user=_user(), db=SimpleNamespace(), page=1, limit=25, **_list_kwargs()
    )

    assert response.contactsRedacted is True
    assert len(response.lenders) > 0
    for lender in response.lenders:
        assert not lender.phone
        assert not lender.email
        assert not lender.website
        assert not lender.domain


async def test_paid_list_keeps_contacts(monkeypatch):
    monkeypatch.setattr(
        lenders_router, "require_view_access", AsyncMock(return_value=Entitlement.PAID)
    )

    response = await list_lenders(
        current_user=_user(), db=SimpleNamespace(), page=1, limit=25, **_list_kwargs()
    )

    assert response.contactsRedacted is False
    assert any(lender.phone or lender.email for lender in response.lenders)


async def test_stats_teaser_for_free(monkeypatch):
    monkeypatch.setattr(
        lenders_router, "resolve_entitlement", AsyncMock(return_value=Entitlement.FREE)
    )

    response = await get_lender_stats(current_user=_user(), db=SimpleNamespace())

    assert response.status_code == 401
    assert b'"total"' in response.body
    assert b"byState" not in response.body


@pytest.mark.parametrize("entitlement", [Entitlement.TRIAL, Entitlement.PAID])
async def test_stats_full_for_trial_and_paid(monkeypatch, entitlement):
    monkeypatch.setattr(
        lenders_router, "resolve_entitlement", AsyncMock(return_value=entitlement)
    )

    stats = await get_lender_stats(current_user=_user(), db=SimpleNamespace())

    assert stats.total == lender_total()
    assert stats.byState


# ---------------------------------------------------------------------------
# Router: export gates + meters (Task 3.4)
# ---------------------------------------------------------------------------


def _patch_export(monkeypatch, *, used: int):
    monkeypatch.setattr(
        lenders_router, "require_paid_export", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(lenders_router, "get_export_usage", AsyncMock(return_value=used))
    add_usage = AsyncMock(return_value=used)
    monkeypatch.setattr(lenders_router, "add_export_usage", add_usage)
    return add_usage


async def test_export_caps_at_200_records(monkeypatch):
    add_usage = _patch_export(monkeypatch, used=0)

    response = await export_lenders(
        current_user=_user(), db=SimpleNamespace(), fmt="csv", **_list_kwargs()
    )

    assert response.headers["X-Export-Records"] == "200"
    # header + 200 data rows
    assert response.body.decode("utf-8").strip().count("\n") == 200
    add_usage.assert_awaited_once()
    assert add_usage.await_args.args[-1] == 200


async def test_export_respects_monthly_remaining(monkeypatch):
    """950 of 1,000 used → this export is capped at the remaining 50 records."""
    _patch_export(monkeypatch, used=950)

    response = await export_lenders(
        current_user=_user(), db=SimpleNamespace(), fmt="csv", **_list_kwargs()
    )

    assert response.headers["X-Export-Records"] == "50"


async def test_export_blocked_at_monthly_ceiling(monkeypatch):
    _patch_export(monkeypatch, used=1_000)

    with pytest.raises(HTTPException) as exc:
        await export_lenders(
            current_user=_user(), db=SimpleNamespace(), fmt="csv", **_list_kwargs()
        )

    assert exc.value.status_code == 429
    assert exc.value.detail["error"] == "EXPORT_LIMIT_REACHED"
    assert (
        exc.value.detail["message"]
        == "You've hit this month's export limit. It resets on your billing date."
    )


async def test_print_export_follows_same_caps(monkeypatch):
    _patch_export(monkeypatch, used=0)

    response = await export_lenders(
        current_user=_user(), db=SimpleNamespace(), fmt="print", **_list_kwargs()
    )

    assert response.headers["X-Export-Records"] == "200"
    body = response.body.decode("utf-8")
    assert "<table>" in body
    assert "window.print()" in body
