"""Gap Alerts v1 — price-drop detection over the pre-purchase watchlist."""

from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.saved_property import PropertyStatus, SavedProperty
from app.services import gap_alert_jobs
from app.services.gap_alert_jobs import send_gap_alerts

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def watched_property(db_session, created_user) -> SavedProperty:
    prop = SavedProperty(
        user_id=created_user.id,
        address_street="953 Banyan Dr",
        address_city="Delray Beach",
        address_state="FL",
        address_zip="33483",
        full_address="953 Banyan Dr, Delray Beach, FL 33483",
        status=PropertyStatus.PROSPECTING,
        property_data_snapshot={"listPrice": 500_000},
    )
    db_session.add(prop)
    await db_session.commit()
    await db_session.refresh(prop)
    return prop


@pytest.fixture
def stubbed_services(monkeypatch):
    """Stub the provider fetch and the push sender; capture pushes."""
    state = {"price": None, "pushes": []}

    async def fake_search(address, pre_fetched=None, zpid=None):
        return SimpleNamespace(listing=SimpleNamespace(list_price=state["price"]))

    async def fake_push(db, user_id, *, title, body, data, category, channel_id):
        state["pushes"].append({"user_id": user_id, "title": title, "data": data})

    monkeypatch.setattr(gap_alert_jobs.property_service, "search_property", fake_search)
    monkeypatch.setattr(gap_alert_jobs.push_service, "send_to_user", fake_push)
    return state


async def test_price_drop_alerts_once(db_session, watched_property, stubbed_services):
    stubbed_services["price"] = 450_000

    result = await send_gap_alerts(db_session)
    assert result["checked"] == 1
    assert result["price_drops"] == 1
    assert result["alerts_sent"] == 1
    assert len(stubbed_services["pushes"]) == 1
    push = stubbed_services["pushes"][0]
    assert push["data"]["type"] == "gap_alert"
    assert push["data"]["old_price"] == 500_000
    assert push["data"]["new_price"] == 450_000

    # Baseline advanced — rerunning at the same price must not re-alert.
    await db_session.refresh(watched_property)
    assert watched_property.last_known_list_price == Decimal("450000")
    result = await send_gap_alerts(db_session)
    assert result["price_drops"] == 0
    assert len(stubbed_services["pushes"]) == 1


async def test_small_wiggle_does_not_alert(db_session, watched_property, stubbed_services):
    stubbed_services["price"] = 497_500  # -0.5% — below the 1% threshold

    result = await send_gap_alerts(db_session)
    assert result["checked"] == 1
    assert result["price_drops"] == 0
    assert stubbed_services["pushes"] == []


async def test_delisted_property_keeps_baseline(db_session, watched_property, stubbed_services):
    stubbed_services["price"] = None  # off-market: no current asking price

    result = await send_gap_alerts(db_session)
    assert result["checked"] == 1
    assert result["price_drops"] == 0
    await db_session.refresh(watched_property)
    assert watched_property.last_known_list_price is None
    assert watched_property.price_checked_at is not None


async def test_owned_properties_are_not_checked(db_session, watched_property, stubbed_services):
    watched_property.status = PropertyStatus.OWNED
    await db_session.commit()
    stubbed_services["price"] = 100_000

    result = await send_gap_alerts(db_session)
    assert result["checked"] == 0
    assert stubbed_services["pushes"] == []
