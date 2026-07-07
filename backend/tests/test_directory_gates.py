"""Tests for the server-enforced directory gates (Tasks 3.3 / 3.4)."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.services import directory_gates
from app.services.directory_gates import (
    enforce_detail_view_cap,
    require_paid_export,
    require_view_access,
)
from app.services.entitlements import Entitlement
from fastapi import HTTPException


def _user():
    return SimpleNamespace(id=uuid.uuid4())


def _patch_entitlement(monkeypatch, entitlement, subscription=None):
    monkeypatch.setattr(
        directory_gates,
        "resolve_entitlement_with_subscription",
        AsyncMock(return_value=(entitlement, subscription)),
    )


# ---------------------------------------------------------------------------
# require_view_access — view free-tier: 403; trial + paid may view
# ---------------------------------------------------------------------------


async def test_free_cannot_view(monkeypatch):
    _patch_entitlement(monkeypatch, Entitlement.FREE)

    with pytest.raises(HTTPException) as exc:
        await require_view_access(
            SimpleNamespace(), _user(), pro_message="Pro required", teaser_total=484
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "PRO_REQUIRED"
    assert exc.value.detail["total"] == 484


@pytest.mark.parametrize("entitlement", [Entitlement.TRIAL, Entitlement.PAID])
async def test_trial_and_paid_can_view(monkeypatch, entitlement):
    _patch_entitlement(monkeypatch, entitlement)

    result = await require_view_access(
        SimpleNamespace(), _user(), pro_message="Pro required", teaser_total=484
    )
    assert result == entitlement


# ---------------------------------------------------------------------------
# enforce_detail_view_cap — trial counted 25/day; paid uncapped
# ---------------------------------------------------------------------------


async def test_paid_detail_views_are_not_counted(monkeypatch):
    counter = AsyncMock()
    monkeypatch.setattr(directory_gates, "record_detail_view", counter)

    await enforce_detail_view_cap(SimpleNamespace(), _user(), Entitlement.PAID)

    counter.assert_not_awaited()


async def test_trial_detail_view_under_limit_allowed(monkeypatch):
    monkeypatch.setattr(
        directory_gates, "record_detail_view", AsyncMock(return_value=(True, 10))
    )

    await enforce_detail_view_cap(SimpleNamespace(), _user(), Entitlement.TRIAL)


async def test_trial_detail_view_over_limit_returns_429(monkeypatch):
    monkeypatch.setattr(
        directory_gates, "record_detail_view", AsyncMock(return_value=(False, 25))
    )

    with pytest.raises(HTTPException) as exc:
        await enforce_detail_view_cap(SimpleNamespace(), _user(), Entitlement.TRIAL)

    assert exc.value.status_code == 429
    assert exc.value.detail["error"] == "VIEW_LIMIT_REACHED"
    assert exc.value.detail["message"] == "Daily view limit reached — resets tomorrow."


# ---------------------------------------------------------------------------
# require_paid_export — paid only, checked before any file is generated
# ---------------------------------------------------------------------------


async def test_paid_export_allowed_returns_subscription(monkeypatch):
    subscription = SimpleNamespace(current_period_start=None)
    _patch_entitlement(monkeypatch, Entitlement.PAID, subscription)

    result = await require_paid_export(
        SimpleNamespace(), _user(), pro_message="Pro required", teaser_total=484
    )
    assert result is subscription


async def test_trial_export_blocked_with_first_payment_copy(monkeypatch):
    _patch_entitlement(monkeypatch, Entitlement.TRIAL)

    with pytest.raises(HTTPException) as exc:
        await require_paid_export(
            SimpleNamespace(), _user(), pro_message="Pro required", teaser_total=484
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "EXPORTS_PAID_ONLY"
    assert exc.value.detail["message"] == "Exports unlock with your first payment."


async def test_free_export_blocked_with_pro_teaser(monkeypatch):
    _patch_entitlement(monkeypatch, Entitlement.FREE)

    with pytest.raises(HTTPException) as exc:
        await require_paid_export(
            SimpleNamespace(), _user(), pro_message="Pro required", teaser_total=484
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "PRO_REQUIRED"
