"""Rename PropertyStatus stages: watching/analyzing → prospecting,
contacted → pursuing, add negotiating

Revision ID: 20260506_0001
Revises: 20260505_0005
Create Date: 2026-05-06 00:00:00.000000

Pipeline funnel was reshaped to reflect the actual deal lifecycle. The old
'analyzing' value is merged into 'prospecting' (research and underwriting are
the same mental phase). The old 'contacted' is renamed to 'pursuing' (more
accurate framing). A brand-new 'negotiating' stage is inserted between
pursuing and under_contract — the phase where most deals actually die.

Postgres enum constraints worth knowing:
- RENAME VALUE works inside a transaction.
- ADD VALUE works inside a transaction in Postgres 12+ as long as the new
  value isn't referenced in the same transaction.
- DROP VALUE is not supported by Postgres — old values 'analyzing' and
  'watching' (post-downgrade) remain in the type as unused orphans, which is
  harmless. Same applies to 'negotiating' on downgrade.
"""

from alembic import op

revision = "20260506_0001"
down_revision = "20260505_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Rename 'watching' → 'prospecting'.
    op.execute("ALTER TYPE propertystatus RENAME VALUE 'watching' TO 'prospecting'")

    # 2. Collapse 'analyzing' rows into 'prospecting'. The 'analyzing' enum
    #    label survives in the type (Postgres can't drop enum values) but no
    #    rows reference it after this UPDATE.
    op.execute("UPDATE saved_properties SET status = 'prospecting' WHERE status = 'analyzing'")

    # 3. Rename 'contacted' → 'pursuing'.
    op.execute("ALTER TYPE propertystatus RENAME VALUE 'contacted' TO 'pursuing'")

    # 4. Add the new 'negotiating' value, positioned between 'pursuing' and
    #    'under_contract' so kanban ordering is preserved when callers iterate
    #    enum values in order.
    op.execute("ALTER TYPE propertystatus ADD VALUE IF NOT EXISTS 'negotiating' AFTER 'pursuing'")


def downgrade() -> None:
    # Move any 'negotiating' rows back into 'pursuing' before renaming.
    op.execute("UPDATE saved_properties SET status = 'pursuing' WHERE status = 'negotiating'")

    op.execute("ALTER TYPE propertystatus RENAME VALUE 'pursuing' TO 'contacted'")
    op.execute("ALTER TYPE propertystatus RENAME VALUE 'prospecting' TO 'watching'")

    # 'analyzing' label is still present from the original type definition;
    # nothing to do there. 'negotiating' label remains as an orphan — Postgres
    # has no DROP VALUE.
