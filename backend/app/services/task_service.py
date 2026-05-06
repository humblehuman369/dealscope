"""CRUD for property tasks."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_property import SavedProperty
from app.models.task import PropertyTask
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
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
    ) -> list[PropertyTask] | None:
        """Return tasks for a property, or None if the user doesn't own it."""
        if not await self._ensure_owns_property(db, property_id, user_id):
            return None
        result = await db.execute(
            select(PropertyTask)
            .where(PropertyTask.saved_property_id == uuid.UUID(property_id))
            .order_by(
                # Open tasks first (completed_at NULL), then by sort_order, then created.
                PropertyTask.completed_at.is_not(None),
                PropertyTask.sort_order,
                PropertyTask.created_at,
            )
        )
        return list(result.scalars().all())

    async def create(
        self, db: AsyncSession, property_id: str, user_id: str, data: TaskCreate
    ) -> PropertyTask | None:
        if not await self._ensure_owns_property(db, property_id, user_id):
            return None
        # Default sort_order = max(existing) + 1 so new tasks land at the bottom
        # of the open list — feels like Notes/Apple Reminders. Cheap to compute.
        next_order = data.sort_order
        if next_order is None:
            current_max = await db.scalar(
                select(func.max(PropertyTask.sort_order)).where(
                    PropertyTask.saved_property_id == uuid.UUID(property_id)
                )
            )
            next_order = (current_max or 0) + 1
        task = PropertyTask(
            saved_property_id=uuid.UUID(property_id),
            created_by_id=uuid.UUID(user_id),
            title=data.title.strip(),
            notes=(data.notes.strip() if data.notes else None),
            due_date=data.due_date,
            sort_order=next_order,
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task

    async def update(
        self, db: AsyncSession, task_id: str, user_id: str, data: TaskUpdate
    ) -> PropertyTask | None:
        # Single query: fetch task and verify ownership via the join condition.
        result = await db.execute(
            select(PropertyTask)
            .join(SavedProperty, SavedProperty.id == PropertyTask.saved_property_id)
            .where(
                and_(
                    PropertyTask.id == uuid.UUID(task_id),
                    SavedProperty.user_id == uuid.UUID(user_id),
                )
            )
        )
        task = result.scalar_one_or_none()
        if task is None:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Capture whether the caller intended to flip completion state, since
        # we set completed_by_id alongside completed_at as a pair.
        completion_field_present = "completed_at" in update_data

        for field, value in update_data.items():
            if field == "title" and value is not None:
                value = value.strip()
            if field == "notes" and value is not None:
                value = value.strip() or None
            setattr(task, field, value)

        if completion_field_present:
            if task.completed_at is not None:
                task.completed_by_id = uuid.UUID(user_id)
            else:
                task.completed_by_id = None

        task.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(task)
        return task

    async def delete(self, db: AsyncSession, task_id: str, user_id: str) -> bool:
        result = await db.execute(
            select(PropertyTask)
            .join(SavedProperty, SavedProperty.id == PropertyTask.saved_property_id)
            .where(
                and_(
                    PropertyTask.id == uuid.UUID(task_id),
                    SavedProperty.user_id == uuid.UUID(user_id),
                )
            )
        )
        task = result.scalar_one_or_none()
        if task is None:
            return False
        await db.delete(task)
        await db.commit()
        return True

    async def summary_for_property(
        self, db: AsyncSession, property_id: str, user_id: str
    ) -> dict[str, int] | None:
        """Return {total, open, overdue} counts in a single round-trip."""
        if not await self._ensure_owns_property(db, property_id, user_id):
            return None
        now = datetime.now(UTC)
        result = await db.execute(
            select(
                func.count(PropertyTask.id),
                func.count().filter(PropertyTask.completed_at.is_(None)),
                func.count().filter(
                    and_(
                        PropertyTask.completed_at.is_(None),
                        PropertyTask.due_date.is_not(None),
                        PropertyTask.due_date < now,
                    )
                ),
            ).where(PropertyTask.saved_property_id == uuid.UUID(property_id))
        )
        total, open_count, overdue = result.one()
        return {"total": int(total), "open": int(open_count), "overdue": int(overdue)}


task_service = TaskService()
