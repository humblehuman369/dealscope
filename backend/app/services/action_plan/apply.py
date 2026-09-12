"""Apply a stored action plan to a property's task and contact lists."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action_plan import ActionPlan, ActionPlanSource
from app.models.contact import ContactRole, PropertyContact
from app.models.saved_property import PropertyStatus, SavedProperty
from app.models.task import PropertyTask
from app.schemas.saved_property import SavedPropertyUpdate
from app.services.action_plan.writer import (
    confirm_tasks_from_research,
    contacts_from_research,
)
from app.services.saved_property_service import saved_property_service
from app.services.task_service import is_open_title_duplicate


def _as_uuid(value: uuid.UUID | str) -> uuid.UUID:
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def _apply_source(plan: ActionPlan) -> ActionPlanSource:
    if (plan.plan or {}).get("source") == "ai" or plan.research:
        return ActionPlanSource.AI
    return ActionPlanSource.TEMPLATE


def _tasks_to_write(plan: ActionPlan) -> list[dict[str, Any]]:
    payload = plan.plan or {}
    tasks = [item for item in (payload.get("tasks") or []) if isinstance(item, dict)]
    existing = {str(item.get("title") or "").strip().lower() for item in tasks if item.get("title")}
    for extra in confirm_tasks_from_research(plan.research):
        if extra["title"].lower() not in existing:
            tasks.append(extra)
            existing.add(extra["title"].lower())
    return tasks


def _contacts_to_write(plan: ActionPlan) -> list[dict[str, Any]]:
    payload = plan.plan or {}
    contacts: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    def add(item: dict[str, Any]) -> None:
        name = str(item.get("name") or "").strip()
        if not name:
            return
        role = str(item.get("role") or ContactRole.OTHER.value)
        key = (name.lower(), role)
        if key in seen:
            return
        seen.add(key)
        contacts.append({**item, "name": name, "role": role})

    for item in contacts_from_research(plan.research):
        add(item)
    for item in payload.get("contacts") or []:
        if isinstance(item, dict):
            add(item)
    return contacts


async def apply_action_plan(
    db: AsyncSession,
    plan: ActionPlan,
    user_id: str,
    *,
    move_to_pursuing: bool = False,
) -> dict[str, Any]:
    """Write the plan's tasks and contacts onto the property.

    Skip a task if an *open* task with the same title already exists
    (case-insensitive). Completed tasks with the same title do not block.
    Contacts skip when the same name + role already exist.

    When the plan has research, tasks and contacts are ``source=ai``.
    UNVERIFIED findings become "Confirm this" tasks. Finding contacts get
    the source URL and VERIFIED/UNVERIFIED in notes.
    """
    property_id = plan.saved_property_id
    source = _apply_source(plan)
    task_items = _tasks_to_write(plan)
    contact_items = _contacts_to_write(plan)

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
            source=source,
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
            source=source,
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

    prop = await db.get(SavedProperty, property_id)
    property_status = prop.status.value if prop is not None and hasattr(prop.status, "value") else (
        str(prop.status) if prop is not None else None
    )
    can_move = prop is not None and prop.status == PropertyStatus.PROSPECTING
    moved = False
    if move_to_pursuing and can_move:
        updated = await saved_property_service.update_property(
            db,
            str(property_id),
            user_id,
            SavedPropertyUpdate(status=PropertyStatus.PURSUING),
        )
        moved = updated is not None
        if moved:
            property_status = PropertyStatus.PURSUING.value
            can_move = False

    return {
        "tasks_created": created_tasks,
        "tasks_skipped": skipped_tasks,
        "contacts_created": created_contacts,
        "contacts_skipped": skipped_contacts,
        "property_status": property_status,
        "can_move_to_pursuing": can_move and not moved,
        "moved_to_pursuing": moved,
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
