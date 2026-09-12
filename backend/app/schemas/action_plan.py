"""Schemas for the AI Action Plan feature."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.action_plan import ActionPlanCase, ActionPlanStatus
from app.schemas.contact import ContactOut, ContactRole
from app.schemas.task import TaskOut


class ActionPlanFact(BaseModel):
    label: str
    value: str


class ActionPlanTaskItem(BaseModel):
    title: str
    notes: str | None = None
    due_offset_days: int | None = None


class ActionPlanContactItem(BaseModel):
    name: str
    role: ContactRole = ContactRole.OTHER
    company: str | None = None
    phone: str | None = None
    email: str | None = None
    notes: str | None = None


class ResearchFindingOut(BaseModel):
    field: str
    value: str
    status: Literal["VERIFIED", "UNVERIFIED"]
    source_url: str | None = None
    note: str = ""


class ResearchConflictOut(BaseModel):
    field: str
    what_disagrees: str
    which_i_trust: str
    why: str


class ResearchBestFirstCallOut(BaseModel):
    who: str
    role: str
    phone: str | None = None
    why: str


class ResearchOut(BaseModel):
    findings: list[ResearchFindingOut] = Field(default_factory=list)
    not_found: list[str] = Field(default_factory=list)
    conflicts: list[ResearchConflictOut] = Field(default_factory=list)
    best_first_call: ResearchBestFirstCallOut | None = None


class ActionPlanOut(BaseModel):
    id: str
    saved_property_id: str
    case: ActionPlanCase
    case_label: str
    status: ActionPlanStatus
    summary: str
    facts: list[ActionPlanFact] = Field(default_factory=list)
    tasks: list[ActionPlanTaskItem] = Field(default_factory=list)
    contacts: list[ActionPlanContactItem] = Field(default_factory=list)
    source: str = "template"
    research: ResearchOut | None = None
    created_at: datetime
    updated_at: datetime


class ActionPlanApplyOut(BaseModel):
    plan_id: str
    tasks_created: list[TaskOut]
    tasks_skipped: int
    contacts_created: list[ContactOut]
    contacts_skipped: int
