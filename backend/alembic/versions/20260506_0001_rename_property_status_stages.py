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

Defensive design: ``saved_properties.status`` was originally created as
``VARCHAR(20)`` in the initial migration (20241228_0001) and was *never*
explicitly converted to a Postgres ENUM. The Python model later switched to
``SQLEnum(PropertyStatus)``, which works fine over a VARCHAR at runtime but
means that production databases (built strictly from migrations) have no
``propertystatus`` enum type, while local dev databases recreated from the
model may. This migration therefore introspects the live schema and only
issues ``ALTER TYPE`` statements when the enum actually exists; otherwise it
falls through to plain UPDATE statements on the VARCHAR column.

Postgres enum constraints worth knowing:
- RENAME VALUE works inside a transaction.
- ADD VALUE works inside a transaction in Postgres 12+ as long as the new
  value isn't referenced in the same transaction.
- DROP VALUE is not supported by Postgres — old values 'analyzing' and
  'watching' (post-downgrade) remain in the type as unused orphans, which is
  harmless. Same applies to 'negotiating' on downgrade.
"""

import sqlalchemy as sa
from alembic import op

revision = "20260506_0001"
down_revision = "20260505_0005"
branch_labels = None
depends_on = None


def _enum_labels(bind, type_name: str) -> set[str]:
    """Return the set of enum labels for ``type_name`` in the default schema.

    Returns an empty set if the type does not exist (i.e. the column is a
    plain VARCHAR rather than a native Postgres enum).
    """
    type_exists = bind.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
        {"name": type_name},
    ).scalar()
    if not type_exists:
        return set()
    return {
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT enumlabel FROM pg_enum "
                "WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = :name) "
                "ORDER BY enumsortorder"
            ),
            {"name": type_name},
        )
    }


def upgrade() -> None:
    bind = op.get_bind()
    labels = _enum_labels(bind, "propertystatus")
    is_native_enum = bool(labels)

    if is_native_enum:
        # All enum DDL runs inside an autocommit block so each ALTER TYPE is
        # committed before the next runs. This is required for the final
        # ``ADD VALUE … AFTER 'pursuing'`` step: Postgres resolves the AFTER
        # reference through the syscache, which only sees committed data, so
        # an in-transaction RENAME of 'contacted' → 'pursuing' is invisible
        # to a subsequent ADD VALUE in the same transaction. Statements in
        # this block are individually durable, which is fine — the migration
        # is idempotent (each step guards on the live label set), so a
        # partial run is safely picked up on the next deploy.
        with op.get_context().autocommit_block():
            # 1. Rename 'watching' → 'prospecting' if needed.
            if "watching" in labels and "prospecting" not in labels:
                op.execute("ALTER TYPE propertystatus RENAME VALUE 'watching' TO 'prospecting'")
                labels.discard("watching")
                labels.add("prospecting")
            elif "watching" in labels and "prospecting" in labels:
                # Both labels coexist (partial prior migration) — migrate the
                # rows to the new label. Old label survives as an orphan.
                op.execute(
                    "UPDATE saved_properties SET status = 'prospecting' WHERE status = 'watching'"
                )

            # 2. Collapse 'analyzing' rows into 'prospecting'. Label survives.
            if "analyzing" in labels:
                op.execute(
                    "UPDATE saved_properties SET status = 'prospecting' WHERE status = 'analyzing'"
                )

            # 3. Rename 'contacted' → 'pursuing' if needed.
            if "contacted" in labels and "pursuing" not in labels:
                op.execute("ALTER TYPE propertystatus RENAME VALUE 'contacted' TO 'pursuing'")
            elif "contacted" in labels and "pursuing" in labels:
                op.execute(
                    "UPDATE saved_properties SET status = 'pursuing' WHERE status = 'contacted'"
                )

            # 4. Ensure 'pursuing' exists — it may not if the enum was created
            #    from the model (without 'contacted' to rename) or if the
            #    database never had the old labels.
            #    Re-read labels from the database to see the committed state.
            live_labels = _enum_labels(bind, "propertystatus")

            if "pursuing" not in live_labels:
                op.execute(
                    "ALTER TYPE propertystatus ADD VALUE IF NOT EXISTS 'pursuing'"
                )

            # 5. Add the new 'negotiating' value. Re-read labels again since
            #    we may have just added 'pursuing' above.
            live_labels = _enum_labels(bind, "propertystatus")

            if "negotiating" not in live_labels:
                if "pursuing" in live_labels:
                    op.execute(
                        "ALTER TYPE propertystatus ADD VALUE IF NOT EXISTS 'negotiating' AFTER 'pursuing'"
                    )
                else:
                    # Fallback: add without positional hint
                    op.execute(
                        "ALTER TYPE propertystatus ADD VALUE IF NOT EXISTS 'negotiating'"
                    )
    else:
        # Plain VARCHAR column — no enum schema to mutate. Just rewrite the
        # row values; 'negotiating' needs no schema change because any string
        # of length ≤ 20 is allowed.
        op.execute(
            "UPDATE saved_properties SET status = 'prospecting' "
            "WHERE status IN ('watching', 'analyzing')"
        )
        op.execute("UPDATE saved_properties SET status = 'pursuing' WHERE status = 'contacted'")


def downgrade() -> None:
    bind = op.get_bind()
    labels = _enum_labels(bind, "propertystatus")
    is_native_enum = bool(labels)

    # Move any 'negotiating' rows back into 'pursuing' before renaming so the
    # rename does not leave orphan rows pointing at a not-yet-existing label.
    # Guard the comparison: if the column is a native enum and 'negotiating'
    # was never added (e.g. partial upgrade rollback), `status = 'negotiating'`
    # itself errors with "invalid enum label".
    if not is_native_enum or "negotiating" in labels:
        op.execute("UPDATE saved_properties SET status = 'pursuing' WHERE status = 'negotiating'")

    if is_native_enum:
        # Wrap the rename DDL in autocommit for symmetry with upgrade(); a
        # downgrade followed by re-upgrade would otherwise hit the same
        # syscache visibility quirk on the AFTER clause.
        with op.get_context().autocommit_block():
            if "pursuing" in labels and "contacted" not in labels:
                op.execute("ALTER TYPE propertystatus RENAME VALUE 'pursuing' TO 'contacted'")
            elif "pursuing" in labels and "contacted" in labels:
                op.execute(
                    "UPDATE saved_properties SET status = 'contacted' WHERE status = 'pursuing'"
                )

            if "prospecting" in labels and "watching" not in labels:
                op.execute("ALTER TYPE propertystatus RENAME VALUE 'prospecting' TO 'watching'")
            elif "prospecting" in labels and "watching" in labels:
                op.execute(
                    "UPDATE saved_properties SET status = 'watching' WHERE status = 'prospecting'"
                )
    else:
        op.execute("UPDATE saved_properties SET status = 'contacted' WHERE status = 'pursuing'")
        op.execute("UPDATE saved_properties SET status = 'watching' WHERE status = 'prospecting'")

    # 'analyzing' label (if it ever existed) and 'negotiating' label remain as
    # orphans — Postgres has no DROP VALUE.
