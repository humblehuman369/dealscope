"""
Service for managing default assumptions in the database.
"""

import logging
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assumption_defaults import AdminAssumptionDefaults
from app.schemas.property import AllAssumptions

logger = logging.getLogger(__name__)


async def get_default_assumptions(db: AsyncSession) -> AllAssumptions:
    """Fetch default assumptions from DB or fall back to schema defaults."""
    result = await db.execute(
        select(AdminAssumptionDefaults).order_by(AdminAssumptionDefaults.updated_at.desc()).limit(1)
    )
    record = result.scalar_one_or_none()

    if record and record.assumptions:
        try:
            return AllAssumptions.model_validate(record.assumptions)
        except Exception as exc:
            logger.warning(f"Failed to parse stored assumptions, falling back to defaults: {exc}")

    return AllAssumptions()


async def get_assumptions_record(db: AsyncSession) -> Optional[AdminAssumptionDefaults]:
    """Return the latest assumptions record if it exists."""
    result = await db.execute(
        select(AdminAssumptionDefaults).order_by(AdminAssumptionDefaults.updated_at.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def upsert_default_assumptions(
    db: AsyncSession,
    assumptions: AllAssumptions,
    updated_by: Optional[uuid.UUID] = None,
) -> AdminAssumptionDefaults:
    """Create or update the stored default assumptions."""
    record = await get_assumptions_record(db)

    if record is None:
        record = AdminAssumptionDefaults(
            assumptions=assumptions.model_dump(),
            updated_by=updated_by,
        )
        db.add(record)
    else:
        record.assumptions = assumptions.model_dump()
        record.updated_by = updated_by

    await db.commit()
    await db.refresh(record)
    return record
