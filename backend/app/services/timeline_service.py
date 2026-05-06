"""Per-property timeline aggregator.

Merges events from four existing tables into one chronological stream so the
slide-over Activity tab can answer "what's happened on this deal?":

  - PropertyAdjustment  → status changes + flip-stage transitions + user notes
  - PropertyTask        → task added / completed / reopened
  - BudgetExpense       → an actual expense was logged
  - RehabBudget         → baseline locked (the moment a budget became official)

User-authored notes are stored as ``PropertyAdjustment`` rows with
``adjustment_type='note'`` — same audit trail, no extra table.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import BudgetExpense, RehabBudget
from app.models.contact import PropertyContact
from app.models.document import Document
from app.models.saved_property import PropertyAdjustment, SavedProperty
from app.models.task import PropertyTask


TimelineEventKind = Literal[
    "status_change",
    "flip_stage_change",
    "task_added",
    "task_completed",
    "task_reopened",
    "expense_added",
    "budget_locked",
    "contact_added",
    "document_added",
    "note",
]


NOTE_ADJUSTMENT_TYPE = "note"


def _coerce(value: Any) -> Any:
    """Strip the {"value": ...} wrapper that PropertyAdjustment uses."""
    if isinstance(value, dict) and "value" in value and len(value) == 1:
        return value["value"]
    return value


def _humanize_status_change(prev: Any, new: Any) -> str:
    prev_label = (str(prev) if prev else "—").replace("_", " ").title()
    new_label = (str(new) if new else "—").replace("_", " ").title()
    return f"Status: {prev_label} → {new_label}"


class TimelineService:
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
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str,
        *,
        limit: int = 100,
    ) -> list[dict[str, Any]] | None:
        """Return up to ``limit`` events newest-first. None on missing/unowned."""
        property_ = await self._ensure_owns_property(db, property_id, user_id)
        if property_ is None:
            return None

        events: list[dict[str, Any]] = []
        prop_uuid = uuid.UUID(property_id)

        # 1) PropertyAdjustment — status / flip_stage / generic notes.
        adj_rows = (
            await db.execute(
                select(PropertyAdjustment)
                .where(PropertyAdjustment.property_id == prop_uuid)
                .order_by(PropertyAdjustment.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()
        for a in adj_rows:
            kind, title, body = self._classify_adjustment(a)
            if kind is None:
                continue
            events.append(
                {
                    "id": f"adj:{a.id}",
                    "kind": kind,
                    "occurred_at": a.created_at,
                    "title": title,
                    "body": body,
                    "meta": {
                        "previous_value": _coerce(a.previous_value),
                        "new_value": _coerce(a.new_value),
                        "adjustment_id": str(a.id),
                    },
                }
            )

        # 2) PropertyTask — added (creation) and completed/reopened (state).
        task_rows = (
            await db.execute(
                select(PropertyTask)
                .where(PropertyTask.saved_property_id == prop_uuid)
                .order_by(PropertyTask.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()
        for t in task_rows:
            events.append(
                {
                    "id": f"task-add:{t.id}",
                    "kind": "task_added",
                    "occurred_at": t.created_at,
                    "title": f"Task added: {t.title}",
                    "body": None,
                    "meta": {"task_id": str(t.id)},
                }
            )
            if t.completed_at is not None:
                events.append(
                    {
                        "id": f"task-done:{t.id}",
                        "kind": "task_completed",
                        "occurred_at": t.completed_at,
                        "title": f"Task completed: {t.title}",
                        "body": None,
                        "meta": {"task_id": str(t.id)},
                    }
                )

        # 3) BudgetExpense — actual spend logged.
        exp_rows = (
            await db.execute(
                select(BudgetExpense)
                .join(RehabBudget, RehabBudget.id == BudgetExpense.budget_id)
                .where(RehabBudget.saved_property_id == prop_uuid)
                .order_by(BudgetExpense.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()
        for ex in exp_rows:
            vendor = ex.vendor or "no vendor"
            events.append(
                {
                    "id": f"exp:{ex.id}",
                    "kind": "expense_added",
                    "occurred_at": ex.created_at,
                    "title": f"Expense logged: ${ex.amount} · {vendor}",
                    "body": ex.description,
                    "meta": {
                        "amount": str(ex.amount),
                        "vendor": ex.vendor,
                        "spent_on": ex.spent_on.isoformat() if ex.spent_on else None,
                        "expense_id": str(ex.id),
                    },
                }
            )

        # 4) PropertyContact — only "added" surfaces; updates are too noisy.
        contact_rows = (
            await db.execute(
                select(PropertyContact)
                .where(PropertyContact.saved_property_id == prop_uuid)
                .order_by(PropertyContact.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()
        for c in contact_rows:
            role_label = c.role.value.replace("_", " ").title() if c.role else "Contact"
            events.append(
                {
                    "id": f"contact:{c.id}",
                    "kind": "contact_added",
                    "occurred_at": c.created_at,
                    "title": f"Contact added: {c.name} ({role_label})",
                    "body": c.company,
                    "meta": {
                        "contact_id": str(c.id),
                        "role": c.role.value if c.role else None,
                    },
                }
            )

        # 5) Document — uploaded files are deal-level events worth surfacing.
        try:
            doc_rows = (
                await db.execute(
                    select(Document)
                    .where(Document.property_id == prop_uuid)
                    .order_by(Document.uploaded_at.desc())
                    .limit(limit)
                )
            ).scalars().all()
            for d in doc_rows:
                doc_type_label = (
                    d.document_type.value.replace("_", " ").title()
                    if d.document_type
                    else "Document"
                )
                events.append(
                    {
                        "id": f"doc:{d.id}",
                        "kind": "document_added",
                        "occurred_at": d.uploaded_at,
                        "title": f"Document uploaded: {d.original_filename or d.filename} ({doc_type_label})",
                        "body": d.description,
                        "meta": {
                            "document_id": str(d.id),
                            "document_type": d.document_type.value if d.document_type else None,
                            "file_size": d.file_size,
                        },
                    }
                )
        except Exception:
            # Documents table or column drift shouldn't fail the timeline —
            # the rest of the events are still useful on their own.
            pass

        # 6) RehabBudget.baseline_locked_at — single milestone.
        budget_row = (
            await db.execute(
                select(RehabBudget).where(RehabBudget.saved_property_id == prop_uuid)
            )
        ).scalar_one_or_none()
        if budget_row and budget_row.baseline_locked_at:
            events.append(
                {
                    "id": f"budget-lock:{budget_row.id}",
                    "kind": "budget_locked",
                    "occurred_at": budget_row.baseline_locked_at,
                    "title": "Budget baseline locked",
                    "body": None,
                    "meta": {
                        "baseline_total": str(budget_row.baseline_total),
                        "budget_id": str(budget_row.id),
                    },
                }
            )

        # Newest first, then trim to ``limit``.
        events.sort(key=lambda e: e["occurred_at"], reverse=True)
        return events[:limit]

    def _classify_adjustment(
        self, a: PropertyAdjustment
    ) -> tuple[TimelineEventKind | None, str, str | None]:
        """Map a PropertyAdjustment row to (kind, title, body) or (None,...) to skip."""
        kind: TimelineEventKind | None
        if a.adjustment_type == NOTE_ADJUSTMENT_TYPE:
            return ("note", a.reason or "Note", None)
        if a.adjustment_type == "status":
            return (
                "status_change",
                _humanize_status_change(_coerce(a.previous_value), _coerce(a.new_value)),
                a.reason,
            )
        if a.adjustment_type == "flip_stage":
            prev = _coerce(a.previous_value) or "—"
            new = _coerce(a.new_value) or "—"
            return ("flip_stage_change", f"Lifecycle: {prev} → {new}", a.reason)
        # Other adjustment types (purchase_price, rent, arv, assumptions, etc.)
        # exist but are too granular for a deal-level timeline. Skip them — the
        # Adjustment History endpoint can surface them when needed.
        return (None, "", None)

    async def add_note(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str,
        text: str,
    ) -> PropertyAdjustment | None:
        """Persist a user-authored note as a PropertyAdjustment row."""
        if not await self._ensure_owns_property(db, property_id, user_id):
            return None
        text = text.strip()
        if not text:
            return None
        adj = PropertyAdjustment(
            property_id=uuid.UUID(property_id),
            adjustment_type=NOTE_ADJUSTMENT_TYPE,
            reason=text,
        )
        db.add(adj)
        await db.commit()
        await db.refresh(adj)
        return adj

    async def delete_note(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str,
        adjustment_id: str,
    ) -> bool:
        """Delete a note (only PropertyAdjustment rows of type 'note')."""
        if not await self._ensure_owns_property(db, property_id, user_id):
            return False
        result = await db.execute(
            select(PropertyAdjustment).where(
                PropertyAdjustment.id == uuid.UUID(adjustment_id),
                PropertyAdjustment.property_id == uuid.UUID(property_id),
                PropertyAdjustment.adjustment_type == NOTE_ADJUSTMENT_TYPE,
            )
        )
        adj = result.scalar_one_or_none()
        if adj is None:
            return False
        await db.delete(adj)
        await db.commit()
        return True


timeline_service = TimelineService()
