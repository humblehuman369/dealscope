"""CRUD for property contacts."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import ContactRole, PropertyContact
from app.models.saved_property import SavedProperty
from app.schemas.contact import ContactCreate, ContactUpdate


class ContactService:
    async def _ensure_owns_property(
        self, db: AsyncSession, property_id: str, user_id: str
    ) -> SavedProperty | None:
        result = await db.execute(
            select(SavedProperty).where(
                SavedProperty.id == uuid.UUID(property_id),
                SavedProperty.user_id == uuid.UUID(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_property(
        self, db: AsyncSession, property_id: str, user_id: str
    ) -> list[PropertyContact] | None:
        if not await self._ensure_owns_property(db, property_id, user_id):
            return None
        result = await db.execute(
            select(PropertyContact)
            .where(PropertyContact.saved_property_id == uuid.UUID(property_id))
            .order_by(PropertyContact.created_at)
        )
        return list(result.scalars().all())

    async def create(
        self, db: AsyncSession, property_id: str, user_id: str, data: ContactCreate
    ) -> PropertyContact | None:
        if not await self._ensure_owns_property(db, property_id, user_id):
            return None
        contact = PropertyContact(
            saved_property_id=uuid.UUID(property_id),
            created_by_id=uuid.UUID(user_id),
            name=data.name.strip(),
            role=ContactRole(data.role.value),
            company=(data.company.strip() if data.company else None),
            phone=(data.phone.strip() if data.phone else None),
            email=(str(data.email).strip().lower() if data.email else None),
            notes=(data.notes.strip() if data.notes else None),
        )
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        return contact

    async def update(
        self, db: AsyncSession, contact_id: str, user_id: str, data: ContactUpdate
    ) -> PropertyContact | None:
        result = await db.execute(
            select(PropertyContact)
            .join(SavedProperty, SavedProperty.id == PropertyContact.saved_property_id)
            .where(
                and_(
                    PropertyContact.id == uuid.UUID(contact_id),
                    SavedProperty.user_id == uuid.UUID(user_id),
                )
            )
        )
        contact = result.scalar_one_or_none()
        if contact is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if isinstance(value, str):
                value = value.strip() or None
                if field == "email" and value:
                    value = value.lower()
            if field == "role" and value is not None:
                value = ContactRole(value if isinstance(value, str) else value.value)
            setattr(contact, field, value)

        contact.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(contact)
        return contact

    async def delete(self, db: AsyncSession, contact_id: str, user_id: str) -> bool:
        result = await db.execute(
            select(PropertyContact)
            .join(SavedProperty, SavedProperty.id == PropertyContact.saved_property_id)
            .where(
                and_(
                    PropertyContact.id == uuid.UUID(contact_id),
                    SavedProperty.user_id == uuid.UUID(user_id),
                )
            )
        )
        contact = result.scalar_one_or_none()
        if contact is None:
            return False
        await db.delete(contact)
        await db.commit()
        return True


contact_service = ContactService()
