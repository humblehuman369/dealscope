"""Apply a stored action plan to a property's task and contact lists."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action_plan import ActionPlan, ActionPlanSource
from app.models.contact import ContactRole, PropertyContact
from app.models.saved_property import SavedProperty
from app.models.task import PropertyTask
from app.services.task_service import is_open_title_duplicate


def _as_uuid(value: uuid.UUID | str) -> uuid.UUID:
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


async def apply_action_plan(
    db: AsyncSession,
    plan: ActionPlan,
    user_id: str,
) -> dict[str, Any]:
    """Write the plan's tasks and contacts onto the property.

    Merge rule (problem 6): skip a task if an *open* task with the same title
    already exists on the property (case-insensitive). Completed tasks with
    the same title do not block. Contacts skip when the same name + role
    already exist.
    """
    property_id = plan.saved_property_id
    payload = plan.plan or {}
    task_items = payload.get("tasks") or []
    contact_items = payload.get("contacts") or []

    existing_open = await db.execute(
        select(PropertyTask.title).where(
            PropertyTask.saved_property_id == property_id,
            PropertyTask.completed_at.is_(None),
        )
    )
    open_titles = {t.strip().lower() for (t,) in existing_open.all() if t}

    current_max = await db.scalar(
        select(func.max(PropertyTask.sort_order)).where(PropertyTask.saved_property_id == property_id)
    )
    next_order = (current_max or 0) + 1
    now = datetime.now(UTC)

    created_tasks: list[PropertyTask] = []
    skipped_tasks = 0
    for item in task_items:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        if is_open_title_duplicate(title, open_titles):
            skipped_tasks += 1
            continue
        due_offset = item.get("due_offset_days")
        due_date = None
        if due_offset is not None:
            try:
                due_date = now + timedelta(days=int(due_offset))
            except (TypeError, ValueError):
                due_date = None
        notes = item.get("notes")
        notes_text = str(notes).strip() if notes else None
        task = PropertyTask(
            saved_property_id=property_id,
            created_by_id=_as_uuid(user_id),
            title=title,
            notes=notes_text,
            due_date=due_date,
            sort_order=next_order,
            source=ActionPlanSource.TEMPLATE,
            action_plan_id=plan.id,
        )
        db.add(task)
        created_tasks.append(task)
        open_titles.add(title.lower())
        next_order += 1

    existing_contacts = await db.execute(
        select(PropertyContact.name, PropertyContact.role).where(
            PropertyContact.saved_property_id == property_id
        )
    )
    existing_keys = {
        (name.strip().lower(), role.value if hasattr(role, "value") else str(role))
        for name, role in existing_contacts.all()
        if name
    }

    created_contacts: list[PropertyContact] = []
    skipped_contacts = 0
    for item in contact_items:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        role_raw = item.get("role") or ContactRole.OTHER.value
        try:
            role = ContactRole(role_raw)
        except ValueError:
            role = ContactRole.OTHER
        key = (name.lower(), role.value)
        if key in existing_keys:
            skipped_contacts += 1
            continue
        contact = PropertyContact(
            saved_property_id=property_id,
            created_by_id=_as_uuid(user_id),
            name=name,
            role=role,
            company=(str(item["company"]).strip() if item.get("company") else None),
            phone=(str(item["phone"]).strip() if item.get("phone") else None),
            email=(str(item["email"]).strip().lower() if item.get("email") else None),
            notes=(str(item["notes"]).strip() if item.get("notes") else None),
            source=ActionPlanSource.TEMPLATE,
            action_plan_id=plan.id,
        )
        db.add(contact)
        created_contacts.append(contact)
        existing_keys.add(key)

    await db.commit()
    for row in created_tasks:
        await db.refresh(row)
    for row in created_contacts:
        await db.refresh(row)

    return {
        "tasks_created": created_tasks,
        "tasks_skipped": skipped_tasks,
        "contacts_created": created_contacts,
        "contacts_skipped": skipped_contacts,
    }


async def get_owned_plan(
    db: AsyncSession, plan_id: str, user_id: str
) -> ActionPlan | None:
    result = await db.execute(
        select(ActionPlan)
        .join(SavedProperty, SavedProperty.id == ActionPlan.saved_property_id)
        .where(
            ActionPlan.id == uuid.UUID(plan_id),
            SavedProperty.user_id == uuid.UUID(user_id),
        )
    )
    return result.scalar_one_or_none()
