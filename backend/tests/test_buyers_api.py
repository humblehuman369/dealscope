"""Tests for /api/buyers paid Pro gate and query helpers."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import uuid

import pytest
from fastapi import HTTPException

from app.core.deps import require_paid_pro_buyers
from app.models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from app.services.buyers_service import BuyerListFilters, _apply_filters
from app.models.cash_buyer import CashBuyer
from sqlalchemy import select


pytestmark = pytest.mark.asyncio


def _user():
    return SimpleNamespace(id=uuid.uuid4(), email="paid@example.com")


def _subscription(status: SubscriptionStatus):
    return Subscription(
        user_id=uuid.uuid4(),
        tier=SubscriptionTier.PRO,
        status=status,
        properties_limit=-1,
        searches_per_month=-1,
        api_calls_per_month=-1,
    )


async def test_paid_pro_required_returns_401_with_total(monkeypatch):
    user = _user()
    billing = SimpleNamespace(
        get_subscription=AsyncMock(return_value=_subscription(SubscriptionStatus.TRIALING))
    )
    monkeypatch.setattr("app.services.billing_service.billing_service", billing)
    monkeypatch.setattr("app.core.deps._count_strict_buyers", AsyncMock(return_value=2812))

    with pytest.raises(HTTPException) as exc:
        await require_paid_pro_buyers(current_user=user, db=SimpleNamespace())

    assert exc.value.status_code == 401
    assert exc.value.detail["error"] == "PRO_REQUIRED"
    assert exc.value.detail["total"] == 2812


async def test_active_paid_pro_passes(monkeypatch):
    user = _user()
    billing = SimpleNamespace(
        get_subscription=AsyncMock(return_value=_subscription(SubscriptionStatus.ACTIVE))
    )
    monkeypatch.setattr("app.services.billing_service.billing_service", billing)

    result = await require_paid_pro_buyers(current_user=user, db=SimpleNamespace())
    assert result is user


def test_apply_filters_strict_only():
    stmt = _apply_filters(select(CashBuyer), BuyerListFilters())
    compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "passes_strict_filter" in compiled
