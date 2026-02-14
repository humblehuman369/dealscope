"""Phase 3 — Security & Data Hardening migration.

1. ALTER naive DateTime columns → TIMESTAMP WITH TIME ZONE
2. ALTER Float financial columns → NUMERIC for dollar/percentage precision
3. Add CHECK constraints on enum and financial columns

Revision ID: 20260214_0002
Revises: 20260214_0001
Create Date: 2026-02-14 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "20260214_0002"
down_revision = "20260214_0001"
branch_labels = None
depends_on = None


# ──────────────────────────────────────────────
# All naive-DateTime columns that need TIMESTAMPTZ
# (table, column)
# ──────────────────────────────────────────────
_TZ_COLUMNS = [
    # saved_properties
    ("saved_properties", "analytics_calculated_at"),
    ("saved_properties", "saved_at"),
    ("saved_properties", "last_viewed_at"),
    ("saved_properties", "updated_at"),
    ("saved_properties", "data_refreshed_at"),
    # property_adjustments
    ("property_adjustments", "created_at"),
    # documents
    ("documents", "document_date"),
    ("documents", "uploaded_at"),
    ("documents", "updated_at"),
    # search_history
    ("search_history", "searched_at"),
    # admin_assumption_defaults
    ("admin_assumption_defaults", "created_at"),
    ("admin_assumption_defaults", "updated_at"),
    # shared_links
    ("shared_links", "expires_at"),
    ("shared_links", "created_at"),
    ("shared_links", "last_accessed_at"),
    # users (legacy token columns)
    ("users", "verification_token_expires"),
    ("users", "reset_token_expires"),
]

# ──────────────────────────────────────────────
# Float → Numeric conversions
# (table, column, precision, scale)
# ──────────────────────────────────────────────
_NUMERIC_COLUMNS = [
    # saved_properties — dollar amounts
    ("saved_properties", "custom_purchase_price", 12, 2),
    ("saved_properties", "custom_rent_estimate", 12, 2),
    ("saved_properties", "custom_arv", 12, 2),
    ("saved_properties", "custom_rehab_budget", 12, 2),
    ("saved_properties", "custom_daily_rate", 12, 2),
    ("saved_properties", "best_cash_flow", 12, 2),
    # saved_properties — percentages
    ("saved_properties", "custom_occupancy_rate", 5, 4),
    ("saved_properties", "best_coc_return", 5, 4),
    # user_profiles — dollar amounts
    ("user_profiles", "investment_budget_min", 12, 2),
    ("user_profiles", "investment_budget_max", 12, 2),
    # user_profiles — percentages
    ("user_profiles", "target_cash_on_cash", 5, 4),
    ("user_profiles", "target_cap_rate", 5, 4),
]


def upgrade() -> None:
    # ── 1. DateTime → TIMESTAMPTZ ──────────────────────────────
    for table, column in _TZ_COLUMNS:
        op.execute(
            f'ALTER TABLE {table} '
            f'ALTER COLUMN {column} TYPE TIMESTAMPTZ '
            f'USING {column} AT TIME ZONE \'UTC\''
        )

    # ── 2. Float → Numeric ─────────────────────────────────────
    for table, column, prec, scale in _NUMERIC_COLUMNS:
        op.execute(
            f'ALTER TABLE {table} '
            f'ALTER COLUMN {column} TYPE NUMERIC({prec},{scale}) '
            f'USING {column}::NUMERIC({prec},{scale})'
        )

    # ── 3. CHECK constraints ───────────────────────────────────
    # payment_history.amount must be non-negative (cents)
    op.create_check_constraint(
        "ck_payment_history_amount_nonneg",
        "payment_history",
        sa.text("amount >= 0"),
    )

    # saved_properties.priority must be 1-10 (or NULL)
    op.create_check_constraint(
        "ck_saved_properties_priority_range",
        "saved_properties",
        sa.text("priority IS NULL OR (priority >= 1 AND priority <= 10)"),
    )

    # saved_properties financial columns must be non-negative (or NULL)
    for col in (
        "custom_purchase_price", "custom_rent_estimate", "custom_arv",
        "custom_rehab_budget", "custom_daily_rate",
    ):
        op.create_check_constraint(
            f"ck_saved_properties_{col}_nonneg",
            "saved_properties",
            sa.text(f"{col} IS NULL OR {col} >= 0"),
        )

    # saved_properties.custom_occupancy_rate must be 0-1 (or NULL)
    op.create_check_constraint(
        "ck_saved_properties_occupancy_range",
        "saved_properties",
        sa.text("custom_occupancy_rate IS NULL OR (custom_occupancy_rate >= 0 AND custom_occupancy_rate <= 1)"),
    )

    # user_profiles financial columns must be non-negative (or NULL)
    for col in ("investment_budget_min", "investment_budget_max"):
        op.create_check_constraint(
            f"ck_user_profiles_{col}_nonneg",
            "user_profiles",
            sa.text(f"{col} IS NULL OR {col} >= 0"),
        )

    # user_profiles percentage columns must be 0-1 (or NULL)
    for col in ("target_cash_on_cash", "target_cap_rate"):
        op.create_check_constraint(
            f"ck_user_profiles_{col}_range",
            "user_profiles",
            sa.text(f"{col} IS NULL OR ({col} >= 0 AND {col} <= 1)"),
        )


def downgrade() -> None:
    # ── Drop CHECK constraints ─────────────────────────────────
    for col in ("target_cap_rate", "target_cash_on_cash"):
        op.drop_constraint(f"ck_user_profiles_{col}_range", "user_profiles", type_="check")
    for col in ("investment_budget_max", "investment_budget_min"):
        op.drop_constraint(f"ck_user_profiles_{col}_nonneg", "user_profiles", type_="check")

    op.drop_constraint("ck_saved_properties_occupancy_range", "saved_properties", type_="check")
    for col in (
        "custom_daily_rate", "custom_rehab_budget", "custom_arv",
        "custom_rent_estimate", "custom_purchase_price",
    ):
        op.drop_constraint(f"ck_saved_properties_{col}_nonneg", "saved_properties", type_="check")
    op.drop_constraint("ck_saved_properties_priority_range", "saved_properties", type_="check")
    op.drop_constraint("ck_payment_history_amount_nonneg", "payment_history", type_="check")

    # ── Numeric → Float ────────────────────────────────────────
    for table, column, _prec, _scale in reversed(_NUMERIC_COLUMNS):
        op.execute(
            f'ALTER TABLE {table} '
            f'ALTER COLUMN {column} TYPE DOUBLE PRECISION '
            f'USING {column}::DOUBLE PRECISION'
        )

    # ── TIMESTAMPTZ → TIMESTAMP ────────────────────────────────
    for table, column in reversed(_TZ_COLUMNS):
        op.execute(
            f'ALTER TABLE {table} '
            f'ALTER COLUMN {column} TYPE TIMESTAMP WITHOUT TIME ZONE'
        )
