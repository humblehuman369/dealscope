"""CRUD for property offers — mirrors TaskService's ownership pattern."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.offer import PropertyOffer
from app.models.saved_property import SavedProperty
from app.schemas.offer import OfferCreate, OfferUpdate


class OfferService:
    async def _ensure_owns_property(
        self, db: AsyncSession, property_id: str, user_id: str
    ) -> SavedProperty | None:
        """Return the property if ``user_id`` owns it, else None."""
        result = await db.execute(
            select(SavedProperty).where(
                SavedProperty.id == uuid.UUID(property_id),
                SavedProperty.user_id == uuid.UUID(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_property(
        self, db: AsyncSession, property_id: str, user_id: str
    ) -> list[PropertyOffer] | None:
        """Return offers newest-first, or None if the user doesn't own the property."""
        if not await self._ensure_owns_property(db, property_id, user_id):
            return None
        result = await db.execute(
            select(PropertyOffer)
            .where(PropertyOffer.saved_property_id == uuid.UUID(property_id))
            .order_by(PropertyOffer.offer_date.desc(), PropertyOffer.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(
        self, db: AsyncSession, property_id: str, user_id: str, data: OfferCreate
    ) -> PropertyOffer | None:
        if not await self._ensure_owns_property(db, property_id, user_id):
            return None
        offer = PropertyOffer(
            saved_property_id=uuid.UUID(property_id),
            created_by_id=uuid.UUID(user_id),
            amount=data.amount,
            counter_amount=data.counter_amount,
            status=data.status,
            offer_date=data.offer_date or datetime.now(UTC),
            expires_at=data.expires_at,
            notes=(data.notes.strip() or None) if data.notes else None,
        )
        db.add(offer)
        await db.commit()
        await db.refresh(offer)
        return offer

    async def update(
        self, db: AsyncSession, offer_id: str, user_id: str, data: OfferUpdate
    ) -> PropertyOffer | None:
        # Single query: fetch offer and verify ownership via the join condition.
        result = await db.execute(
            select(PropertyOffer)
            .join(SavedProperty, SavedProperty.id == PropertyOffer.saved_property_id)
            .where(
                and_(
                    PropertyOffer.id == uuid.UUID(offer_id),
                    SavedProperty.user_id == uuid.UUID(user_id),
                )
            )
        )
        offer = result.scalar_one_or_none()
        if offer is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "notes" and value is not None:
                value = value.strip() or None
            setattr(offer, field, value)

        offer.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(offer)
        return offer

    async def delete(self, db: AsyncSession, offer_id: str, user_id: str) -> bool:
        result = await db.execute(
            select(PropertyOffer)
            .join(SavedProperty, SavedProperty.id == PropertyOffer.saved_property_id)
            .where(
                and_(
                    PropertyOffer.id == uuid.UUID(offer_id),
                    SavedProperty.user_id == uuid.UUID(user_id),
                )
            )
        )
        offer = result.scalar_one_or_none()
        if offer is None:
            return False
        await db.delete(offer)
        await db.commit()
        return True


offer_service = OfferService()
