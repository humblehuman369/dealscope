"""Action Plan endpoints — template immediately, OpenAI research in the background."""

from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.models.action_plan import ActionPlan, ActionPlanStatus
from app.schemas.action_plan import (
    ActionPlanApplyIn,
    ActionPlanApplyOut,
    ActionPlanContactItem,
    ActionPlanFact,
    ActionPlanOut,
    ActionPlanTaskItem,
    ResearchBestFirstCallOut,
    ResearchConflictOut,
    ResearchFindingOut,
    ResearchOut,
)
from app.schemas.contact import ContactOut, ContactRole
from app.schemas.task import TaskOut
from app.services.action_plan.apply import apply_action_plan, get_owned_plan
from app.services.action_plan.cases import CASE_LABELS, sort_case
from app.services.action_plan.research import kickoff_research, refresh_research
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


def _research_to_out(raw: dict[str, Any] | None) -> ResearchOut | None:
    if not isinstance(raw, dict):
        return None
    findings: list[ResearchFindingOut] = []
    for item in raw.get("findings") or []:
        if not isinstance(item, dict) or not item.get("field"):
            continue
        status_raw = str(item.get("status") or "").upper()
        if status_raw not in {"VERIFIED", "UNVERIFIED"}:
            continue
        if status_raw == "VERIFIED":
            finding_status: Literal["VERIFIED", "UNVERIFIED"] = "VERIFIED"
        else:
            finding_status = "UNVERIFIED"
        findings.append(
            ResearchFindingOut(
                field=str(item["field"]),
                value=str(item.get("value") or ""),
                status=finding_status,
                source_url=item.get("source_url"),
                note=str(item.get("note") or ""),
            )
        )
    conflicts = [
        ResearchConflictOut(
            field=str(item.get("field") or ""),
            what_disagrees=str(item.get("what_disagrees") or ""),
            which_i_trust=str(item.get("which_i_trust") or ""),
            why=str(item.get("why") or ""),
        )
        for item in (raw.get("conflicts") or [])
        if isinstance(item, dict) and item.get("field")
    ]
    best_raw = raw.get("best_first_call")
    best = None
    if isinstance(best_raw, dict) and best_raw.get("who"):
        phone = best_raw.get("phone")
        best = ResearchBestFirstCallOut(
            who=str(best_raw["who"]),
            role=str(best_raw.get("role") or ""),
            phone=str(phone).strip() if isinstance(phone, str) and phone.strip() else None,
            why=str(best_raw.get("why") or ""),
        )
    not_found = [str(item) for item in (raw.get("not_found") or []) if str(item).strip()]
    if not findings and not conflicts and best is None and not not_found:
        return None
    return ResearchOut(
        findings=findings,
        not_found=not_found,
        conflicts=conflicts,
        best_first_call=best,
    )


def _plan_to_out(row: ActionPlan, *, property_status: str | None = None) -> ActionPlanOut:
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
        research=_research_to_out(row.research),
        property_status=property_status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _research_args(prop) -> dict[str, str | None]:
    snapshot = prop.property_data_snapshot or {}
    addr = snapshot.get("address") if isinstance(snapshot.get("address"), dict) else {}
    details = snapshot.get("details") if isinstance(snapshot.get("details"), dict) else {}
    parcel = str(details.get("parcel_id") or snapshot.get("parcel_id") or "").strip() or None
    return {
        "address": prop.full_address or prop.address_street,
        "county": str(addr.get("county") or "").strip() or None,
        "state": prop.address_state or str(addr.get("state") or "").strip() or None,
        "parcel": parcel,
    }


@router.post(
    "/properties/saved/{property_id}/action-plan",
    response_model=ActionPlanOut,
    status_code=status.HTTP_201_CREATED,
    summary="Build an action plan for a saved property",
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
        status=ActionPlanStatus.QUEUED,
        research=None,
        plan=plan_json,
        cost_cents=0,
    )
    await kickoff_research(row, snapshot, **_research_args(prop))
    db.add(row)
    await db.commit()
    await db.refresh(row)
    status_value = prop.status.value if hasattr(prop.status, "value") else str(prop.status)
    return _plan_to_out(row, property_status=status_value)


@router.get(
    "/action-plans/{plan_id}",
    response_model=ActionPlanOut,
    summary="Poll an action plan, including in-flight research",
)
async def get_action_plan(
    plan_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    plan = await get_owned_plan(db, plan_id, str(current_user.id))
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action plan not found")
    prop = await saved_property_service.get_by_id(db, str(plan.saved_property_id), str(current_user.id))
    args = _research_args(prop) if prop is not None else {}
    await refresh_research(plan, parcel=args.get("parcel"), address=args.get("address"))
    await db.commit()
    await db.refresh(plan)
    status_value = None
    if prop is not None:
        status_value = prop.status.value if hasattr(prop.status, "value") else str(prop.status)
    return _plan_to_out(plan, property_status=status_value)


@router.post(
    "/action-plans/{plan_id}/apply",
    response_model=ActionPlanApplyOut,
    summary="Write the plan's tasks and contacts onto the deal",
)
@router.post(
    "/action-plan/{plan_id}/apply",
    response_model=ActionPlanApplyOut,
    include_in_schema=False,
)
async def apply_plan(
    plan_id: str,
    current_user: CurrentUser,
    db: DbSession,
    body: ActionPlanApplyIn = ActionPlanApplyIn(),
):
    plan = await get_owned_plan(db, plan_id, str(current_user.id))
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action plan not found")
    result = await apply_action_plan(
        db, plan, str(current_user.id), move_to_pursuing=body.move_to_pursuing
    )
    return ActionPlanApplyOut(
        plan_id=str(plan.id),
        tasks_created=[_task_to_out(t) for t in result["tasks_created"]],
        tasks_skipped=result["tasks_skipped"],
        contacts_created=[_contact_to_out(c) for c in result["contacts_created"]],
        contacts_skipped=result["contacts_skipped"],
        property_status=result.get("property_status"),
        can_move_to_pursuing=bool(result.get("can_move_to_pursuing")),
        moved_to_pursuing=bool(result.get("moved_to_pursuing")),
    )
