"""Tests for the server-enforced directory gates."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.services import directory_gates
from app.services.directory_gates import require_paid_export, require_view_access
from app.services.entitlements import Entitlement
from fastapi import HTTPException


def _user():
    return SimpleNamespace(id=uuid.uuid4())


def _total(count: int):
    """The teaser count is a callable so it is only paid for on a refusal."""
    return AsyncMock(return_value=count)


def _patch_entitlement(monkeypatch, entitlement, subscription=None):
    monkeypatch.setattr(
        directory_gates,
        "resolve_entitlement_with_subscription",
        AsyncMock(return_value=(entitlement, subscription)),
    )


# ---------------------------------------------------------------------------
# require_view_access — paid only; free and trial are both refused
# ---------------------------------------------------------------------------


async def test_free_cannot_view(monkeypatch):
    _patch_entitlement(monkeypatch, Entitlement.FREE)

    with pytest.raises(HTTPException) as exc:
        await require_view_access(
            SimpleNamespace(), _user(), pro_message="Pro required", count_total=_total(484)
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "PRO_REQUIRED"
    assert exc.value.detail["total"] == 484


async def test_trial_cannot_view(monkeypatch):
    """The directories are not part of the free trial."""
    _patch_entitlement(monkeypatch, Entitlement.TRIAL)

    with pytest.raises(HTTPException) as exc:
        await require_view_access(
            SimpleNamespace(), _user(), pro_message="Pro required", count_total=_total(484)
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "DIRECTORY_PAID_ONLY"
    assert exc.value.detail["message"] == "The directories unlock with your first payment."
    # The teaser count still renders behind the gate.
    assert exc.value.detail["total"] == 484


async def test_trial_gets_different_copy_than_free(monkeypatch):
    """A trialing user already picked a plan; 'upgrade to Pro' would confuse them."""
    errors = {}
    for entitlement in (Entitlement.FREE, Entitlement.TRIAL):
        _patch_entitlement(monkeypatch, entitlement)
        with pytest.raises(HTTPException) as exc:
            await require_view_access(
                SimpleNamespace(), _user(), pro_message="Pro required", count_total=_total(484)
            )
        errors[entitlement] = exc.value.detail["message"]

    assert errors[Entitlement.FREE] != errors[Entitlement.TRIAL]


async def test_paid_can_view(monkeypatch):
    _patch_entitlement(monkeypatch, Entitlement.PAID)

    assert (
        await require_view_access(
            SimpleNamespace(), _user(), pro_message="Pro required", count_total=_total(484)
        )
        is None
    )


async def test_an_authorised_request_never_counts_the_directory(monkeypatch):
    """The count exists only to fill the teaser on a 403. Computing it eagerly
    billed every paid request for a COUNT(*) that was then discarded."""
    _patch_entitlement(monkeypatch, Entitlement.PAID)
    count_total = _total(484)

    await require_view_access(
        SimpleNamespace(), _user(), pro_message="Pro required", count_total=count_total
    )

    count_total.assert_not_awaited()


# ---------------------------------------------------------------------------
# require_paid_export — paid only, checked before any file is generated
# ---------------------------------------------------------------------------


async def test_paid_export_allowed_returns_subscription(monkeypatch):
    subscription = SimpleNamespace(current_period_start=None)
    _patch_entitlement(monkeypatch, Entitlement.PAID, subscription)

    result = await require_paid_export(
        SimpleNamespace(), _user(), pro_message="Pro required", count_total=_total(484)
    )
    assert result is subscription


async def test_trial_export_blocked_with_first_payment_copy(monkeypatch):
    _patch_entitlement(monkeypatch, Entitlement.TRIAL)

    with pytest.raises(HTTPException) as exc:
        await require_paid_export(
            SimpleNamespace(), _user(), pro_message="Pro required", count_total=_total(484)
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "EXPORTS_PAID_ONLY"
    assert exc.value.detail["message"] == "Exports unlock with your first payment."


async def test_free_export_blocked_with_pro_teaser(monkeypatch):
    _patch_entitlement(monkeypatch, Entitlement.FREE)

    with pytest.raises(HTTPException) as exc:
        await require_paid_export(
            SimpleNamespace(), _user(), pro_message="Pro required", count_total=_total(484)
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "PRO_REQUIRED"
