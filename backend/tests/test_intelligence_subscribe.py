import pytest
from sqlalchemy import select

from app.models.intelligence_subscriber import IntelligenceSubscriber


@pytest.mark.asyncio
async def test_intelligence_subscribe_creates_row(client, db_session):
    response = await client.post(
        "/api/v1/intelligence/subscribe",
        json={
            "email": "investor@example.com",
            "investor_type": "SFR",
            "source": "investor-intelligence",
            "placement": "hub",
        },
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}

    result = await db_session.execute(
        select(IntelligenceSubscriber).where(IntelligenceSubscriber.email == "investor@example.com")
    )
    row = result.scalar_one()
    assert row.investor_type == "SFR"
    assert row.placement == "hub"


@pytest.mark.asyncio
async def test_intelligence_subscribe_is_idempotent(client, db_session):
    payload = {"email": "repeat@example.com", "investor_type": "Flipper", "placement": "hero"}
    first = await client.post("/api/v1/intelligence/subscribe", json=payload)
    second = await client.post(
        "/api/v1/intelligence/subscribe",
        json={**payload, "investor_type": "Multifamily", "placement": "campaign"},
    )
    assert first.status_code == 200
    assert second.status_code == 200

    result = await db_session.execute(
        select(IntelligenceSubscriber).where(IntelligenceSubscriber.email == "repeat@example.com")
    )
    rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].investor_type == "Multifamily"
    assert rows[0].placement == "campaign"


@pytest.mark.asyncio
async def test_intelligence_subscribe_preserves_investor_type_when_omitted(client, db_session):
    email = "keep-type@example.com"
    first = await client.post(
        "/api/v1/intelligence/subscribe",
        json={"email": email, "investor_type": "SFR", "placement": "hub"},
    )
    second = await client.post(
        "/api/v1/intelligence/subscribe",
        json={"email": email},
    )
    assert first.status_code == 200
    assert second.status_code == 200

    result = await db_session.execute(
        select(IntelligenceSubscriber).where(IntelligenceSubscriber.email == email)
    )
    row = result.scalar_one()
    assert row.investor_type == "SFR"
    assert row.placement == "hub"


@pytest.mark.asyncio
async def test_intelligence_subscribe_preserves_investor_type_when_invalid(client, db_session):
    email = "keep-invalid@example.com"
    await client.post(
        "/api/v1/intelligence/subscribe",
        json={"email": email, "investor_type": "SFR"},
    )
    await client.post(
        "/api/v1/intelligence/subscribe",
        json={"email": email, "investor_type": "not-a-type"},
    )

    result = await db_session.execute(
        select(IntelligenceSubscriber).where(IntelligenceSubscriber.email == email)
    )
    assert result.scalar_one().investor_type == "SFR"


@pytest.mark.asyncio
async def test_intelligence_subscribe_rejects_invalid_email(client):
    response = await client.post(
        "/api/v1/intelligence/subscribe",
        json={"email": "not-an-email"},
    )
    assert response.status_code == 422
