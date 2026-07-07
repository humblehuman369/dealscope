"""Tests for /api/buyers gates, trial redaction, and query helpers (3.3/3.4)."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.models.cash_buyer import CashBuyer
from app.routers import buyers as buyers_router
from app.routers.buyers import export_cash_buyers, get_buyer_stats, list_cash_buyers
from app.schemas.buyers import BuyerOut
from app.services.buyers_service import BuyerListFilters, _apply_filters
from app.services.entitlements import Entitlement
from fastapi import HTTPException
from sqlalchemy import select

pytestmark = pytest.mark.asyncio


def _user():
    return SimpleNamespace(id=uuid.uuid4(), email="user@example.com")


def _buyer(buyer_id: int = 1) -> BuyerOut:
    return BuyerOut(
        id=buyer_id,
        initials="AB",
        accent="#0EA5E9",
        company="Acme Buyers",
        owner="Jane Doe",
        street="1 Main St",
        city="Tampa",
        state="FL",
        zip="33602",
        phone="(555) 555-0100",
        email="jane@example.com",
        website="acme.example",
        coverage=["Hillsborough"],
        description="We buy houses",
        deals=10,
        years=5,
        response="24 hours",
        strategies=["Fix & Flip"],
    )


def _list_kwargs(**overrides):
    kwargs = dict(city=None, state=None, county=None, zip=None, strategy=None)
    kwargs.update(overrides)
    return kwargs


async def test_free_list_gets_403(monkeypatch):
    async def deny(*args, **kwargs):
        raise HTTPException(status_code=403, detail={"error": "PRO_REQUIRED", "total": 2812})

    monkeypatch.setattr(buyers_router, "require_view_access", deny)
    monkeypatch.setattr(buyers_router, "_count_strict_buyers", AsyncMock(return_value=2812))

    with pytest.raises(HTTPException) as exc:
        await list_cash_buyers(
            current_user=_user(), db=SimpleNamespace(), page=1, limit=25, **_list_kwargs()
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "PRO_REQUIRED"


async def test_trial_list_is_redacted(monkeypatch):
    monkeypatch.setattr(
        buyers_router, "require_view_access", AsyncMock(return_value=Entitlement.TRIAL)
    )
    monkeypatch.setattr(buyers_router, "_count_strict_buyers", AsyncMock(return_value=2812))
    monkeypatch.setattr(
        buyers_router, "list_buyers_page", AsyncMock(return_value=([_buyer()], 1, 1))
    )

    response = await list_cash_buyers(
        current_user=_user(), db=SimpleNamespace(), page=1, limit=25, **_list_kwargs()
    )

    assert response.contactsRedacted is True
    buyer = response.buyers[0]
    assert buyer.phone == ""
    assert buyer.email == ""
    assert buyer.website == ""
    assert buyer.street == ""
    # Non-contact fields stay visible for honest trial browsing.
    assert buyer.company == "Acme Buyers"
    assert buyer.city == "Tampa"


async def test_paid_list_keeps_contacts(monkeypatch):
    monkeypatch.setattr(
        buyers_router, "require_view_access", AsyncMock(return_value=Entitlement.PAID)
    )
    monkeypatch.setattr(buyers_router, "_count_strict_buyers", AsyncMock(return_value=2812))
    monkeypatch.setattr(
        buyers_router, "list_buyers_page", AsyncMock(return_value=([_buyer()], 1, 1))
    )

    response = await list_cash_buyers(
        current_user=_user(), db=SimpleNamespace(), page=1, limit=25, **_list_kwargs()
    )

    assert response.contactsRedacted is False
    assert response.buyers[0].phone == "(555) 555-0100"


async def test_stats_teaser_for_free(monkeypatch):
    monkeypatch.setattr(
        buyers_router, "resolve_entitlement", AsyncMock(return_value=Entitlement.FREE)
    )
    monkeypatch.setattr(buyers_router, "_count_strict_buyers", AsyncMock(return_value=2812))

    response = await get_buyer_stats(current_user=_user(), db=SimpleNamespace())

    assert response.status_code == 401
    assert b'"total"' in response.body
    assert b"byState" not in response.body


async def test_export_blocked_at_monthly_ceiling(monkeypatch):
    monkeypatch.setattr(buyers_router, "require_paid_export", AsyncMock(return_value=None))
    monkeypatch.setattr(buyers_router, "_count_strict_buyers", AsyncMock(return_value=2812))
    monkeypatch.setattr(buyers_router, "get_export_usage", AsyncMock(return_value=1_000))

    with pytest.raises(HTTPException) as exc:
        await export_cash_buyers(
            current_user=_user(), db=SimpleNamespace(), fmt="csv", **_list_kwargs()
        )

    assert exc.value.status_code == 429
    assert exc.value.detail["error"] == "EXPORT_LIMIT_REACHED"


async def test_export_caps_request_at_200(monkeypatch):
    monkeypatch.setattr(buyers_router, "require_paid_export", AsyncMock(return_value=None))
    monkeypatch.setattr(buyers_router, "_count_strict_buyers", AsyncMock(return_value=2812))
    monkeypatch.setattr(buyers_router, "get_export_usage", AsyncMock(return_value=0))
    add_usage = AsyncMock(return_value=3)
    monkeypatch.setattr(buyers_router, "add_export_usage", add_usage)

    captured: dict = {}

    async def fake_page(db, *, filters, page, limit):
        captured["limit"] = limit
        return [_buyer(i) for i in range(1, 4)], 3, 1

    monkeypatch.setattr(buyers_router, "list_buyers_page", fake_page)

    response = await export_cash_buyers(
        current_user=_user(), db=SimpleNamespace(), fmt="csv", **_list_kwargs()
    )

    # The DB query itself is capped at the export maximum (200).
    assert captured["limit"] == 200
    assert response.headers["X-Export-Records"] == "3"
    assert add_usage.await_args.args[-1] == 3
    assert "Acme Buyers" in response.body.decode("utf-8")


def test_apply_filters_strict_only():
    stmt = _apply_filters(select(CashBuyer), BuyerListFilters())
    compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "passes_strict_filter" in compiled
