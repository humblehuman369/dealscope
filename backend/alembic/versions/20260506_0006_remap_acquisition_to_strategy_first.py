"""Remap Acquisition lifecycle stage to strategy-specific first stage

Revision ID: 20260506_0006
Revises: 20260506_0005
Create Date: 2026-05-06 02:30:00.000000

Phase 10A — collapses the redundant "Acquisition" stage into the strategy's
first real post-purchase phase. Before: every owned property started in
Acquisition regardless of strategy, and the user had to navigate to a
separate /pipeline page to make progress. After: an owned LTR lands in
Make Ready, an owned STR lands in Setup, an owned flip/BRRRR lands in
Rehab — directly inside the dashboard funnel.

Note on the FlipStage enum: ``saved_properties.flip_stage`` is stored as
``VARCHAR(20)`` (the SQLEnum is ``native_enum=False``), so removing the
ACQUISITION value is just a code change in app/models/saved_property.py
— there's no Postgres ENUM type to mutate. We intentionally keep the
ACQUISITION literal in the Python enum as a dormant constant so any
in-flight serialization round-trips safely.
"""

from alembic import op

revision = "20260506_0006"
down_revision = "20260506_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # LTR → Make Ready
    op.execute(
        "UPDATE saved_properties "
        "SET flip_stage = 'MakeReady' "
        "WHERE flip_stage = 'Acquisition' AND best_strategy = 'ltr'"
    )
    # STR → Setup
    op.execute(
        "UPDATE saved_properties "
        "SET flip_stage = 'Setup' "
        "WHERE flip_stage = 'Acquisition' AND best_strategy = 'str'"
    )
    # Everyone else (flip, brrrr, subject_to, wholesale, null/unknown) → Rehab
    op.execute(
        "UPDATE saved_properties "
        "SET flip_stage = 'Rehab' "
        "WHERE flip_stage = 'Acquisition'"
    )


def downgrade() -> None:
    # Best-effort reverse: only properties currently sitting at the entry
    # stage that *could* have come from Acquisition. We can't perfectly
    # distinguish "started here naturally" from "remapped from Acquisition",
    # so the downgrade is conservative — it walks back exactly the rows the
    # upgrade would touch on a fresh run, reading strategy to decide.
    op.execute(
        "UPDATE saved_properties "
        "SET flip_stage = 'Acquisition' "
        "WHERE flip_stage = 'MakeReady' AND best_strategy = 'ltr' "
        "  AND acquired_at = flip_stage_entered_at"
    )
    op.execute(
        "UPDATE saved_properties "
        "SET flip_stage = 'Acquisition' "
        "WHERE flip_stage = 'Setup' AND best_strategy = 'str' "
        "  AND acquired_at = flip_stage_entered_at"
    )
    op.execute(
        "UPDATE saved_properties "
        "SET flip_stage = 'Acquisition' "
        "WHERE flip_stage = 'Rehab' "
        "  AND acquired_at = flip_stage_entered_at "
        "  AND rehab_started_at IS NULL"
    )
