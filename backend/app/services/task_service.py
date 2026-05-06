"""CRUD for property tasks."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_property import SavedProperty
from app.models.task import PropertyTask
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.task_templates import template_for, template_label_for


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

    async def seed_for_property(
        self, db: AsyncSession, property_id: str, user_id: str
    ) -> list[PropertyTask] | None:
        """Create stage-templated tasks for the property's current state.

        Idempotent in spirit: skips template items whose title already exists
        (case-insensitive) on this property, so clicking the button twice
        doesn't create duplicates. Sets ``due_date`` from the template's
        ``due_offset_days`` (offset from now) when one is provided.
        """
        property_ = await self._ensure_owns_property(db, property_id, user_id)
        if property_ is None:
            return None

        items = template_for(property_)
        if not items:
            return []

        # Pull existing titles to dedupe — single round-trip.
        existing = await db.execute(
            select(PropertyTask.title).where(
                PropertyTask.saved_property_id == uuid.UUID(property_id)
            )
        )
        existing_titles_lower = {t.strip().lower() for (t,) in existing.all()}

        # Pick a starting sort_order beyond any existing tasks.
        current_max = await db.scalar(
            select(func.max(PropertyTask.sort_order)).where(
                PropertyTask.saved_property_id == uuid.UUID(property_id)
            )
        )
        next_order = (current_max or 0) + 1

        from datetime import timedelta as _timedelta

        now = datetime.now(UTC)
        created: list[PropertyTask] = []
        for title, notes, due_offset in items:
            if title.strip().lower() in existing_titles_lower:
                continue
            due_date = now + _timedelta(days=due_offset) if due_offset is not None else None
            task = PropertyTask(
                saved_property_id=uuid.UUID(property_id),
                created_by_id=uuid.UUID(user_id),
                title=title,
                notes=notes,
                due_date=due_date,
                sort_order=next_order,
            )
            db.add(task)
            created.append(task)
            next_order += 1

        if created:
            await db.commit()
            for t in created:
                await db.refresh(t)
        return created

    def template_label(self, property_: SavedProperty) -> str:
        """Pass-through to ``task_templates.template_label_for``.

        Exposed via the service so callers don't need to import the helper.
        """
        return template_label_for(property_)

    async def list_upcoming_for_user(
        self,
        db: AsyncSession,
        user_id: str,
        *,
        days_ahead: int = 7,
        include_overdue: bool = True,
        limit: int = 50,
    ) -> list[dict]:
        """Tasks due in the next ``days_ahead`` days, optionally including
        overdue. Returns enriched dicts with property context — single JOIN.
        """
        from datetime import timedelta as _timedelta

        now = datetime.now(UTC)
        horizon = now + _timedelta(days=days_ahead)
        # Open tasks only (completed_at IS NULL).
        # Either due in [now, horizon] OR overdue (due < now) when included.
        if include_overdue:
            due_filter = and_(
                PropertyTask.due_date.is_not(None),
                PropertyTask.due_date <= horizon,
            )
        else:
            due_filter = and_(
                PropertyTask.due_date.is_not(None),
                PropertyTask.due_date >= now,
                PropertyTask.due_date <= horizon,
            )

        result = await db.execute(
            select(PropertyTask, SavedProperty)
            .join(SavedProperty, SavedProperty.id == PropertyTask.saved_property_id)
            .where(
                SavedProperty.user_id == uuid.UUID(user_id),
                PropertyTask.completed_at.is_(None),
                due_filter,
            )
            .order_by(PropertyTask.due_date.asc())
            .limit(limit)
        )
        out: list[dict] = []
        for task, prop in result.all():
            out.append(
                {
                    "id": str(task.id),
                    "saved_property_id": str(prop.id),
                    "property_nickname": prop.nickname,
                    "property_address_street": prop.address_street,
                    "property_address_city": prop.address_city,
                    "property_address_state": prop.address_state,
                    "property_status": prop.status.value if prop.status else "",
                    "title": task.title,
                    "due_date": task.due_date,
                    "is_overdue": task.due_date < now if task.due_date else False,
                }
            )
        return out

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
