"""CRUD and rollups for rehab budgets and expenses."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.budget import BudgetExpense, BudgetLine, RehabBudget
from app.models.saved_property import SavedProperty
from app.services.rehab_budget_math import compute_lines_from_selections, grand_total


class BudgetService:
    async def get_budget_for_property(
        self, db: AsyncSession, property_id: str, user_id: str
    ) -> RehabBudget | None:
        result = await db.execute(
            select(RehabBudget)
            .join(SavedProperty, SavedProperty.id == RehabBudget.saved_property_id)
            .options(selectinload(RehabBudget.lines), selectinload(RehabBudget.expenses))
            .where(
                RehabBudget.saved_property_id == uuid.UUID(property_id),
                SavedProperty.user_id == uuid.UUID(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def seed_budget(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: uuid.UUID,
        selections: list[dict[str, Any]],
        contingency_pct: Decimal,
        notes: str | None = None,
    ) -> RehabBudget:
        prop_result = await db.execute(
            select(SavedProperty).where(
                SavedProperty.id == uuid.UUID(property_id),
                SavedProperty.user_id == user_id,
            )
        )
        saved = prop_result.scalar_one_or_none()
        if not saved:
            raise LookupError("Property not found")

        existing = await self.get_budget_for_property(db, property_id, str(user_id))
        if existing and existing.baseline_locked_at is not None:
            raise PermissionError("Budget baseline is locked")

        lines_data, subtotal = compute_lines_from_selections(selections)
        baseline = grand_total(subtotal, contingency_pct)

        if existing:
            await db.delete(existing)
            await db.flush()

        budget = RehabBudget(
            saved_property_id=saved.id,
            contingency_pct=contingency_pct,
            baseline_total=baseline,
            notes=notes,
        )
        db.add(budget)
        await db.flush()

        for row in lines_data:
            db.add(
                BudgetLine(
                    budget_id=budget.id,
                    category_id=row["category_id"],
                    item_id=row["item_id"],
                    label=row["label"],
                    tier=row["tier"],
                    quantity=row["quantity"],
                    unit_cost=row["unit_cost"],
                    estimate_amount=row["estimate_amount"],
                    sort_order=row["sort_order"],
                )
            )

        await db.commit()
        out = await self.get_budget_for_property(db, property_id, str(user_id))
        if not out:
            raise RuntimeError("Budget persist failed")
        return out

    async def lock_baseline(self, db: AsyncSession, property_id: str, user_id: str) -> RehabBudget | None:
        b = await self.get_budget_for_property(db, property_id, user_id)
        if not b:
            return None
        b.baseline_locked_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(b)
        return b

    async def build_summary(self, db: AsyncSession, budget: RehabBudget) -> dict[str, Any]:
        await db.refresh(budget, attribute_names=["lines", "expenses"])
        lines = list(budget.lines)
        expenses = list(budget.expenses)

        line_spent: dict[uuid.UUID, Decimal] = {}
        unallocated = Decimal("0")
        for ex in expenses:
            if ex.budget_line_id:
                line_spent[ex.budget_line_id] = line_spent.get(ex.budget_line_id, Decimal("0")) + ex.amount
            else:
                unallocated += ex.amount

        lines_subtotal = sum((ln.estimate_amount for ln in lines), Decimal("0"))
        contingency_amt = (lines_subtotal * budget.contingency_pct).quantize(Decimal("0.01"))
        baseline = budget.baseline_total

        actual_total = sum((ex.amount for ex in expenses), Decimal("0"))

        # Per-line breakdown — Analysis/Budgeted/To Date/% Complete/Projected/Variance.
        # Projection: if pct_complete > 0 we extrapolate (to_date / pct), else
        # we fall back to the line's own budgeted estimate. This is the
        # FlipperForce pattern — % complete is the user-controlled lever that
        # turns "what's spent" into "what we'll end up at".
        projected_lines_total = Decimal("0")
        line_rows: list[dict[str, Any]] = []
        for ln in sorted(lines, key=lambda x: x.sort_order):
            spent = line_spent.get(ln.id, Decimal("0"))
            est = ln.estimate_amount
            pct = Decimal(ln.pct_complete or 0)
            if pct > 0 and spent > 0:
                projected = (spent / pct * Decimal("100")).quantize(Decimal("0.01"))
            else:
                # No completion signal — best estimate is still the budget.
                # Using max() keeps us honest if spend already overran.
                projected = max(est, spent)
            v = projected - est
            v_pct = (v / est * Decimal("100")).quantize(Decimal("0.01")) if est > 0 else Decimal("0")
            ratio = (spent / est) if est > 0 else Decimal("0")
            if ratio <= Decimal("0.95"):
                status = "good"
            elif ratio <= Decimal("1.10"):
                status = "warn"
            else:
                status = "bad"
            projected_lines_total += projected
            line_rows.append(
                {
                    "id": str(ln.id),
                    "category_id": ln.category_id,
                    "item_id": ln.item_id,
                    "label": ln.label,
                    "tier": ln.tier,
                    "quantity": str(ln.quantity),
                    "unit_cost": str(ln.unit_cost),
                    "estimate_amount": str(ln.estimate_amount),
                    "actual_amount": str(spent),
                    "pct_complete": str(pct),
                    "projected_amount": str(projected),
                    "variance": str(v),
                    "variance_pct": str(v_pct),
                    "status": status,
                }
            )

        # Project total = sum of line projections + contingency + unallocated
        # (an expense booked outside any line is a real cost that still hits
        # the bottom line).
        projected_total = (projected_lines_total + contingency_amt + unallocated).quantize(Decimal("0.01"))

        # Variance against the locked baseline (Analysis snapshot) — what the
        # comparison-table totals row uses.
        variance = projected_total - baseline
        variance_pct = (
            (variance / baseline * Decimal("100")).quantize(Decimal("0.01"))
            if baseline and baseline > 0
            else Decimal("0")
        )

        cat_rollups: dict[str, dict[str, Decimal]] = {}
        for ln in lines:
            spent = line_spent.get(ln.id, Decimal("0"))
            cat = ln.category_id
            if cat not in cat_rollups:
                cat_rollups[cat] = {"estimate": Decimal("0"), "actual": Decimal("0")}
            cat_rollups[cat]["estimate"] += ln.estimate_amount
            cat_rollups[cat]["actual"] += spent

        return {
            "budget_id": str(budget.id),
            "saved_property_id": str(budget.saved_property_id),
            "contingency_pct": str(budget.contingency_pct),
            "lines_subtotal": str(lines_subtotal),
            "contingency_amount": str(contingency_amt),
            "baseline_total": str(baseline),
            "baseline_locked_at": budget.baseline_locked_at.isoformat() if budget.baseline_locked_at else None,
            "actual_total": str(actual_total),
            "unallocated_actual": str(unallocated),
            "projected_total": str(projected_total),
            "variance": str(variance),
            "variance_pct": str(variance_pct),
            "lines": line_rows,
            "categories": {
                k: {"estimate": str(v["estimate"]), "actual": str(v["actual"])}
                for k, v in cat_rollups.items()
            },
        }

    async def update_line_pct_complete(
        self,
        db: AsyncSession,
        property_id: str,
        user_id: str,
        line_id: str,
        pct_complete: Decimal,
    ) -> BudgetLine | None:
        """Set ``pct_complete`` on a single line (0-100). Property ownership
        is verified through the budget → property join."""
        result = await db.execute(
            select(BudgetLine)
            .join(RehabBudget, RehabBudget.id == BudgetLine.budget_id)
            .join(SavedProperty, SavedProperty.id == RehabBudget.saved_property_id)
            .where(
                BudgetLine.id == uuid.UUID(line_id),
                RehabBudget.saved_property_id == uuid.UUID(property_id),
                SavedProperty.user_id == uuid.UUID(user_id),
            )
        )
        line = result.scalar_one_or_none()
        if line is None:
            return None
        # Clamp into [0, 100] — the schema enforces this too but defending here
        # keeps the database consistent regardless of the caller.
        if pct_complete < 0:
            pct_complete = Decimal("0")
        if pct_complete > 100:
            pct_complete = Decimal("100")
        line.pct_complete = pct_complete
        await db.commit()
        await db.refresh(line)
        return line

    async def add_expense(
        self,
        db: AsyncSession,
        budget: RehabBudget,
        *,
        user_id: uuid.UUID,
        amount: Decimal,
        spent_on: date,
        budget_line_id: uuid.UUID | None,
        vendor: str | None,
        description: str | None,
        receipt_document_id: uuid.UUID | None,
    ) -> BudgetExpense:
        ex = BudgetExpense(
            budget_id=budget.id,
            budget_line_id=budget_line_id,
            amount=amount,
            spent_on=spent_on,
            vendor=vendor,
            description=description,
            receipt_document_id=receipt_document_id,
            created_by_id=user_id,
        )
        db.add(ex)
        await db.commit()
        await db.refresh(ex)
        return ex

    async def delete_expense(
        self,
        db: AsyncSession,
        expense_id: str,
        user_id: str,
        *,
        property_id: str | None = None,
    ) -> bool:
        q = (
            select(BudgetExpense)
            .join(RehabBudget, BudgetExpense.budget_id == RehabBudget.id)
            .join(SavedProperty, RehabBudget.saved_property_id == SavedProperty.id)
            .where(
                BudgetExpense.id == uuid.UUID(expense_id),
                SavedProperty.user_id == uuid.UUID(user_id),
            )
        )
        if property_id:
            q = q.where(SavedProperty.id == uuid.UUID(property_id))
        result = await db.execute(q)
        ex = result.scalar_one_or_none()
        if not ex:
            return False
        await db.delete(ex)
        await db.commit()
        return True


budget_service = BudgetService()
