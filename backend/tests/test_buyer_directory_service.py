"""Tests for cash buyer directory service."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.cash_buyer import CashBuyer
from app.services.buyer_directory_service import _row_to_record, invalidate_buyers_cache, list_buyers


def test_row_to_record_maps_postgres_columns_to_api_shape():
    row = CashBuyer(
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

    record = _row_to_record(row)

    assert record["id"] == 42
    assert record["company"] == "Acme Buyers"
    assert record["owner"] == "Jane Doe"
    assert record["response"] == "24 hours"
    assert record["buyerType"] == "local"
    assert record["strategies"] == ["Fix & Flip"]
    assert record["coverage"] == ["Travis"]


@pytest.mark.asyncio
async def test_list_buyers_reads_from_database():
    invalidate_buyers_cache()
    buyer = CashBuyer(
        id=1,
        company_name="DB Buyer",
        owner_name=None,
        phone="555-0001",
        email=None,
        street=None,
        city="Miami",
        state="FL",
        zip=None,
        website=None,
        description=None,
        strategies=[],
        coverage=["Miami-Dade"],
        buyer_type=None,
        deals=None,
        years=None,
        response_time=None,
        accent=None,
        initials=None,
        passes_strict_filter=True,
        created_at=SimpleNamespace(),
        updated_at=SimpleNamespace(),
    )

    scalars = MagicMock()
    scalars.all.return_value = [buyer]
    result = MagicMock()
    result.scalars.return_value = scalars

    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)

    records = await list_buyers(db)

    assert len(records) == 1
    assert records[0]["company"] == "DB Buyer"
    assert records[0]["city"] == "Miami"
    db.execute.assert_awaited_once()
