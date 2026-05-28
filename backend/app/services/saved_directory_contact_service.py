"""Service for saved directory contacts (lenders and cash buyers)."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cash_buyer import CashBuyer
from app.models.saved_directory_contact import DirectoryEntityType, SavedDirectoryContact
from app.schemas.saved_directory_contact import SavedDirectoryContactCreate


class SavedDirectoryContactService:
    async def list_contacts(
        self,
        db: AsyncSession,
        user_id: str,
        *,
        entity_type: str | None = None,
    ) -> list[SavedDirectoryContact]:
        stmt = (
            select(SavedDirectoryContact)
            .where(SavedDirectoryContact.user_id == uuid.UUID(user_id))
            .order_by(SavedDirectoryContact.created_at.desc())
        )
        if entity_type:
            stmt = stmt.where(SavedDirectoryContact.entity_type == entity_type)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count_contacts(
        self,
        db: AsyncSession,
        user_id: str,
        *,
        entity_type: str | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(SavedDirectoryContact).where(
            SavedDirectoryContact.user_id == uuid.UUID(user_id)
        )
        if entity_type:
            stmt = stmt.where(SavedDirectoryContact.entity_type == entity_type)
        result = await db.execute(stmt)
        return int(result.scalar_one())

    async def get_by_id(
        self,
        db: AsyncSession,
        contact_id: str,
        user_id: str,
    ) -> SavedDirectoryContact | None:
        result = await db.execute(
            select(SavedDirectoryContact).where(
                SavedDirectoryContact.id == uuid.UUID(contact_id),
                SavedDirectoryContact.user_id == uuid.UUID(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def check_saved(
        self,
        db: AsyncSession,
        user_id: str,
        entity_type: str,
        entity_id: int,
    ) -> SavedDirectoryContact | None:
        result = await db.execute(
            select(SavedDirectoryContact).where(
                SavedDirectoryContact.user_id == uuid.UUID(user_id),
                SavedDirectoryContact.entity_type == entity_type,
                SavedDirectoryContact.entity_id == entity_id,
            )
        )
        return result.scalar_one_or_none()

    async def _buyer_exists(self, db: AsyncSession, entity_id: int) -> bool:
        result = await db.execute(select(CashBuyer.id).where(CashBuyer.id == entity_id))
        return result.scalar_one_or_none() is not None

    async def save_contact(
        self,
        db: AsyncSession,
        user_id: str,
        data: SavedDirectoryContactCreate,
    ) -> SavedDirectoryContact:
        if data.entity_type == DirectoryEntityType.BUYER.value:
            if not await self._buyer_exists(db, data.entity_id):
                raise ValueError("buyer not found")

        existing = await self.check_saved(db, user_id, data.entity_type, data.entity_id)
        if existing:
            raise ValueError("already saved")

        row = SavedDirectoryContact(
            user_id=uuid.UUID(user_id),
            entity_type=data.entity_type,
            entity_id=data.entity_id,
            snapshot=data.snapshot,
        )
        db.add(row)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            raise ValueError("already saved") from None
        return row

    async def delete_contact(
        self,
        db: AsyncSession,
        contact_id: str,
        user_id: str,
    ) -> bool:
        row = await self.get_by_id(db, contact_id, user_id)
        if not row:
            return False
        await db.delete(row)
        await db.flush()
        return True


saved_directory_contact_service = SavedDirectoryContactService()
