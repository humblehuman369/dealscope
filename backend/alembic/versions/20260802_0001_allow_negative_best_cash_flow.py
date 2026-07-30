"""Allow negative best_cash_flow on saved_properties.

Revision ID: 20260802_0001
Revises: 20260801_0001
Create Date: 2026-07-30

``best_cash_flow`` is annual cash flow — a P&L figure that is legitimately
negative whenever a deal loses money at the analyzed price. The
``20260515_0031`` migration treated it like a price column and added a
``>= 0`` CHECK constraint, so PATCH /deal-maker (Comp Appraisal "Apply to
Deal", worksheet saves) crashed with an unhandled CheckViolation — surfacing
as the generic "An unexpected error occurred" toast — for any property whose
metrics compute to negative cash flow.
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260802_0001"
down_revision: Union[str, None] = "20260801_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE saved_properties "
        "DROP CONSTRAINT IF EXISTS ck_saved_property_best_cash_flow_nonneg;"
    )


def downgrade() -> None:
    # Intentionally not re-added: rows with negative cash flow will exist
    # after upgrade, so re-adding the constraint would fail validation.
    pass
