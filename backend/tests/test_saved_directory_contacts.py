"""Tests for SavedDirectoryContactService — CRUD and ownership."""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cash_buyer import CashBuyer
from app.schemas.saved_directory_contact import SavedDirectoryContactCreate
from app.services.saved_directory_contact_service import (
    SavedDirectoryContactService,
    saved_directory_contact_service,
)

pytestmark = pytest.mark.asyncio


@pytest.fixture
def service() -> SavedDirectoryContactService:
    return saved_directory_contact_service


async def _create_buyer(db: AsyncSession, *, company: str = "Test Buyer Co") -> CashBuyer:
    now = datetime.now(UTC)
    buyer = CashBuyer(
        id=900_000 + int(uuid.uuid4().int % 100_000),
        company_name=company,
        phone=f"+1555{uuid.uuid4().int % 10_000_000:07d}",
        strategies=["Fix & Flip"],
        coverage=["FL"],
        passes_strict_filter=True,
        created_at=now,
        updated_at=now,
    )
    db.add(buyer)
    await db.flush()
    return buyer


class TestSavedDirectoryContacts:
    async def test_save_and_list_buyer(
        self, db_session: AsyncSession, created_user, service: SavedDirectoryContactService
    ):
        buyer = await _create_buyer(db_session)
        user_id = str(created_user.id)

        row = await service.save_contact(
            db_session,
            user_id,
            SavedDirectoryContactCreate(
                entity_type="buyer",
                entity_id=buyer.id,
                snapshot={"company": buyer.company_name, "phone": buyer.phone},
            ),
        )
        await db_session.commit()

        assert row.entity_type == "buyer"
        assert row.entity_id == buyer.id

        items = await service.list_contacts(db_session, user_id, entity_type="buyer")
        assert len(items) == 1
        assert items[0].snapshot["company"] == buyer.company_name

    async def test_save_lender_without_db_lookup(
        self, db_session: AsyncSession, created_user, service: SavedDirectoryContactService
    ):
        user_id = str(created_user.id)
        row = await service.save_contact(
            db_session,
            user_id,
            SavedDirectoryContactCreate(
                entity_type="lender",
                entity_id=66,
                snapshot={"company": "Kiavi", "phone": "555-0100"},
            ),
        )
        await db_session.commit()
        assert row.entity_type == "lender"

    async def test_duplicate_save_raises(
        self, db_session: AsyncSession, created_user, service: SavedDirectoryContactService
    ):
        buyer = await _create_buyer(db_session, company="Dup Buyer")
        user_id = str(created_user.id)
        payload = SavedDirectoryContactCreate(
            entity_type="buyer",
            entity_id=buyer.id,
            snapshot={"company": buyer.company_name},
        )
        await service.save_contact(db_session, user_id, payload)
        await db_session.commit()

        with pytest.raises(ValueError, match="already saved"):
            await service.save_contact(db_session, user_id, payload)

    async def test_check_and_delete(
        self, db_session: AsyncSession, created_user, service: SavedDirectoryContactService
    ):
        buyer = await _create_buyer(db_session, company="Delete Me Buyer")
        user_id = str(created_user.id)
        row = await service.save_contact(
            db_session,
            user_id,
            SavedDirectoryContactCreate(
                entity_type="buyer",
                entity_id=buyer.id,
                snapshot={"company": buyer.company_name},
            ),
        )
        await db_session.commit()

        found = await service.check_saved(db_session, user_id, "buyer", buyer.id)
        assert found is not None
        assert found.id == row.id

        deleted = await service.delete_contact(db_session, str(row.id), user_id)
        assert deleted is True
        await db_session.commit()

        assert await service.check_saved(db_session, user_id, "buyer", buyer.id) is None

    async def test_buyer_not_found_raises(
        self, db_session: AsyncSession, created_user, service: SavedDirectoryContactService
    ):
        with pytest.raises(ValueError, match="buyer not found"):
            await service.save_contact(
                db_session,
                str(created_user.id),
                SavedDirectoryContactCreate(
                    entity_type="buyer",
                    entity_id=999_999_999,
                    snapshot={"company": "Ghost"},
                ),
            )

    async def test_list_isolation(
        self, db_session: AsyncSession, created_user, service: SavedDirectoryContactService
    ):
        buyer = await _create_buyer(db_session, company="Private Buyer")
        await service.save_contact(
            db_session,
            str(created_user.id),
            SavedDirectoryContactCreate(
                entity_type="buyer",
                entity_id=buyer.id,
                snapshot={"company": buyer.company_name},
            ),
        )
        await db_session.commit()

        other_items = await service.list_contacts(db_session, str(uuid.uuid4()))
        assert other_items == []
