"""Action Plan endpoints — template plans in Phase 0, no AI."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.models.action_plan import ActionPlan, ActionPlanStatus
from app.schemas.action_plan import (
    ActionPlanApplyOut,
    ActionPlanContactItem,
    ActionPlanFact,
    ActionPlanOut,
    ActionPlanTaskItem,
)
from app.schemas.contact import ContactOut, ContactRole
from app.schemas.task import TaskOut
from app.services.action_plan.apply import apply_action_plan, get_owned_plan
from app.services.action_plan.cases import CASE_LABELS, sort_case
from app.services.action_plan.templates import build_template_plan
from app.services.saved_property_service import saved_property_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Action Plans"])


def _task_to_out(task) -> TaskOut:
    source = task.source
    return TaskOut(
        id=str(task.id),
        saved_property_id=str(task.saved_property_id),
        title=task.title,
        notes=task.notes,
        due_date=task.due_date,
        completed_at=task.completed_at,
        sort_order=task.sort_order,
        source=source.value if hasattr(source, "value") else (source or "user"),
        action_plan_id=str(task.action_plan_id) if task.action_plan_id else None,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _contact_to_out(c) -> ContactOut:
    source = c.source
    return ContactOut(
        id=str(c.id),
        saved_property_id=str(c.saved_property_id),
        name=c.name,
        role=c.role,
        company=c.company,
        phone=c.phone,
        email=c.email,
        notes=c.notes,
        source=source.value if hasattr(source, "value") else (source or "user"),
        action_plan_id=str(c.action_plan_id) if c.action_plan_id else None,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


def _plan_to_out(row: ActionPlan) -> ActionPlanOut:
    payload = row.plan or {}
    facts = [
        ActionPlanFact(label=str(f.get("label", "")), value=str(f.get("value", "")))
        for f in (payload.get("facts") or [])
        if isinstance(f, dict) and f.get("label")
    ]
    tasks = [
        ActionPlanTaskItem(
            title=str(t.get("title", "")),
            notes=t.get("notes"),
            due_offset_days=t.get("due_offset_days"),
        )
        for t in (payload.get("tasks") or [])
        if isinstance(t, dict) and t.get("title")
    ]
    contacts: list[ActionPlanContactItem] = []
    for item in payload.get("contacts") or []:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        role_raw = item.get("role") or ContactRole.OTHER.value
        try:
            role = ContactRole(role_raw)
        except ValueError:
            role = ContactRole.OTHER
        contacts.append(
            ActionPlanContactItem(
                name=str(item["name"]),
                role=role,
                company=item.get("company"),
                phone=item.get("phone"),
                email=item.get("email"),
                notes=item.get("notes"),
            )
        )
    return ActionPlanOut(
        id=str(row.id),
        saved_property_id=str(row.saved_property_id),
        case=row.case,
        case_label=payload.get("case_label") or CASE_LABELS.get(row.case, row.case.value),
        status=row.status,
        summary=str(payload.get("summary") or ""),
        facts=facts,
        tasks=tasks,
        contacts=contacts,
        source=str(payload.get("source") or "template"),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post(
    "/properties/saved/{property_id}/action-plan",
    response_model=ActionPlanOut,
    status_code=status.HTTP_201_CREATED,
    summary="Build a template action plan for a saved property",
)
async def create_action_plan(
    property_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    prop = await saved_property_service.get_by_id(db, property_id, str(current_user.id))
    if prop is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    snapshot = prop.property_data_snapshot or {}
    address = prop.full_address or prop.address_street
    case = sort_case(snapshot)
    plan_json = build_template_plan(snapshot, address=address, case=case)

    row = ActionPlan(
        saved_property_id=prop.id,
        user_id=current_user.id,
        case=case,
        status=ActionPlanStatus.READY,
        research=None,
        plan=plan_json,
        cost_cents=0,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _plan_to_out(row)


@router.post(
    "/action-plan/{plan_id}/apply",
    response_model=ActionPlanApplyOut,
    summary="Write the plan's tasks and contacts onto the deal",
)
async def apply_plan(
    plan_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    plan = await get_owned_plan(db, plan_id, str(current_user.id))
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action plan not found")
    result = await apply_action_plan(db, plan, str(current_user.id))
    return ActionPlanApplyOut(
        plan_id=str(plan.id),
        tasks_created=[_task_to_out(t) for t in result["tasks_created"]],
        tasks_skipped=result["tasks_skipped"],
        contacts_created=[_contact_to_out(c) for c in result["contacts_created"]],
        contacts_skipped=result["contacts_skipped"],
    )
