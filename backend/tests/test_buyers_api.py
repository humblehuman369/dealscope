"""Tests for /api/buyers gates, trial redaction, and query helpers (3.3/3.4)."""

import uuid
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.models.cash_buyer import CashBuyer
from app.routers import buyers as buyers_router
from app.routers.buyers import export_cash_buyers, get_buyer_stats, list_cash_buyers
from app.schemas.buyers import BuyerOut
from app.services import directory_pipeline
from app.services.buyers_service import BuyerListFilters, _apply_filters, row_to_buyer_record
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


def _stub_total(monkeypatch, total: int):
    """Replace the spec's row count so these tests need no database.

    The count is reached through the spec rather than a module global, so it has
    to be swapped on the spec itself.
    """
    monkeypatch.setattr(
        buyers_router,
        "SPEC",
        replace(buyers_router.SPEC, count_total=AsyncMock(return_value=total)),
    )


async def test_free_list_gets_403(monkeypatch):
    async def deny(*args, **kwargs):
        raise HTTPException(status_code=403, detail={"error": "PRO_REQUIRED", "total": 2812})

    monkeypatch.setattr(buyers_router, "gate_view", deny)

    with pytest.raises(HTTPException) as exc:
        await list_cash_buyers(
            current_user=_user(), db=SimpleNamespace(), page=1, limit=25, **_list_kwargs()
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "PRO_REQUIRED"


async def test_trial_list_gets_403(monkeypatch):
    """The directory is not part of the free trial."""

    async def deny(*args, **kwargs):
        raise HTTPException(
            status_code=403, detail={"error": "DIRECTORY_PAID_ONLY", "total": 2812}
        )

    monkeypatch.setattr(buyers_router, "gate_view", deny)

    with pytest.raises(HTTPException) as exc:
        await list_cash_buyers(
            current_user=_user(), db=SimpleNamespace(), page=1, limit=25, **_list_kwargs()
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "DIRECTORY_PAID_ONLY"


async def test_paid_list_keeps_contacts(monkeypatch):
    """Paid responses are never redacted — there is no redaction path left."""
    monkeypatch.setattr(buyers_router, "gate_view", AsyncMock(return_value=None))
    monkeypatch.setattr(
        buyers_router, "list_buyers_page", AsyncMock(return_value=([_buyer()], 1, 1))
    )

    response = await list_cash_buyers(
        current_user=_user(), db=SimpleNamespace(), page=1, limit=25, **_list_kwargs()
    )

    buyer = response.buyers[0]
    assert buyer.phone == "(555) 555-0100"
    assert buyer.email
    assert buyer.street


async def test_stats_teaser_for_free(monkeypatch):
    monkeypatch.setattr(
        directory_pipeline, "resolve_entitlement", AsyncMock(return_value=Entitlement.FREE)
    )
    _stub_total(monkeypatch, 2812)

    response = await get_buyer_stats(current_user=_user(), db=SimpleNamespace())

    assert response.status_code == 401
    assert b'"total"' in response.body
    assert b"byState" not in response.body


async def test_export_blocked_at_monthly_ceiling(monkeypatch):
    monkeypatch.setattr(directory_pipeline, "require_paid_export", AsyncMock(return_value=None))
    monkeypatch.setattr(directory_pipeline, "get_export_usage", AsyncMock(return_value=1_000))

    with pytest.raises(HTTPException) as exc:
        await export_cash_buyers(
            current_user=_user(), db=SimpleNamespace(), fmt="csv", **_list_kwargs()
        )

    assert exc.value.status_code == 429
    assert exc.value.detail["error"] == "EXPORT_LIMIT_REACHED"


async def test_export_caps_request_at_200(monkeypatch):
    monkeypatch.setattr(directory_pipeline, "require_paid_export", AsyncMock(return_value=None))
    monkeypatch.setattr(directory_pipeline, "get_export_usage", AsyncMock(return_value=0))
    add_usage = AsyncMock(return_value=3)
    monkeypatch.setattr(directory_pipeline, "add_export_usage", add_usage)

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


# ---------------------------------------------------------------------------
# Row -> wire mapping (moved here when buyer_directory_service was deleted)
# ---------------------------------------------------------------------------


def _row(**overrides) -> CashBuyer:
    fields = dict(
        id=42,
        company_name="Acme Buyers",
        owner_name="Jane Doe",
        phone="(555) 555-0100",
        email="jane@example.com",
        street="1 Main St",
        city="Austin",
        state="TX",
        zip="78701",
        website="acme.example",
        description="We buy houses",
        strategies=["Fix & Flip"],
        coverage=["Travis"],
        buyer_type="local",
        deals=10,
        years=5,
        response_time="24 hours",
        accent="#A78BFA",
        initials="AB",
        passes_strict_filter=True,
        created_at=SimpleNamespace(),
        updated_at=SimpleNamespace(),
    )
    fields.update(overrides)
    return CashBuyer(**fields)


def test_row_to_record_maps_columns_to_their_api_names():
    """The column names and the JSON keys diverged long ago; the frontend reads
    the JSON ones."""
    record = row_to_buyer_record(_row())

    assert record["id"] == 42
    assert record["company"] == "Acme Buyers"
    assert record["owner"] == "Jane Doe"
    assert record["response"] == "24 hours"
    assert record["buyerType"] == "local"
    assert record["coverage"] == ["Travis"]


def test_nullable_columns_become_empty_strings_not_nulls():
    """A null reaching the frontend renders as "null" in the card, so every
    optional text column is coalesced on the way out."""
    record = row_to_buyer_record(
        _row(owner_name=None, email=None, street=None, zip=None, website=None,
             description=None, response_time=None, initials=None, deals=None, years=None)
    )

    assert record["owner"] == ""
    assert record["email"] == ""
    assert record["website"] == ""
    assert record["response"] == ""
    assert record["deals"] == 0
    assert record["years"] == 0


def test_a_missing_buyer_type_is_omitted_rather_than_nulled():
    assert "buyerType" not in row_to_buyer_record(_row(buyer_type=None))


def test_a_missing_accent_falls_back_to_the_brand_colour():
    assert row_to_buyer_record(_row(accent=None))["accent"] == "#0EA5E9"
