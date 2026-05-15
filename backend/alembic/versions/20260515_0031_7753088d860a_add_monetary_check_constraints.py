"""add_monetary_check_constraints

Revision ID: 7753088d860a
Revises: 20260506_0006
Create Date: 2026-05-15 00:31:57.029939

Adds CHECK constraints ensuring monetary columns cannot be negative.
This version is idempotent to handle partial deployments.
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7753088d860a'
down_revision: Union[str, None] = '20260506_0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _create_check_if_not_exists(constraint_name: str, table: str, condition: str) -> None:
    """Create a CHECK constraint only if it does not already exist."""
    op.execute(f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = '{constraint_name}'
                  AND conrelid = '{table}'::regclass
            ) THEN
                ALTER TABLE {table}
                ADD CONSTRAINT {constraint_name} CHECK ({condition});
            END IF;
        END
        $$;
    """)


def upgrade() -> None:
    # budget_lines
    _create_check_if_not_exists(
        "ck_budget_lines_estimate_amount_nonneg",
        "budget_lines",
        "estimate_amount >= 0",
    )
    _create_check_if_not_exists(
        "ck_budget_lines_unit_cost_nonneg",
        "budget_lines",
        "unit_cost >= 0",
    )

    # budget_expenses
    _create_check_if_not_exists(
        "ck_budget_expenses_amount_nonneg",
        "budget_expenses",
        "amount >= 0",
    )

    # payment_history
    _create_check_if_not_exists(
        "ck_payment_history_amount_nonneg",
        "payment_history",
        "amount >= 0",
    )

    # saved_properties
    _create_check_if_not_exists(
        "ck_saved_property_sold_price_nonneg",
        "saved_properties",
        "sold_price IS NULL OR sold_price >= 0",
    )
    _create_check_if_not_exists(
        "ck_saved_property_custom_purchase_price_nonneg",
        "saved_properties",
        "custom_purchase_price IS NULL OR custom_purchase_price >= 0",
    )
    _create_check_if_not_exists(
        "ck_saved_property_custom_rent_estimate_nonneg",
        "saved_properties",
        "custom_rent_estimate IS NULL OR custom_rent_estimate >= 0",
    )
    _create_check_if_not_exists(
        "ck_saved_property_custom_arv_nonneg",
        "saved_properties",
        "custom_arv IS NULL OR custom_arv >= 0",
    )
    _create_check_if_not_exists(
        "ck_saved_property_custom_rehab_budget_nonneg",
        "saved_properties",
        "custom_rehab_budget IS NULL OR custom_rehab_budget >= 0",
    )
    _create_check_if_not_exists(
        "ck_saved_property_custom_daily_rate_nonneg",
        "saved_properties",
        "custom_daily_rate IS NULL OR custom_daily_rate >= 0",
    )
    _create_check_if_not_exists(
        "ck_saved_property_best_cash_flow_nonneg",
        "saved_properties",
        "best_cash_flow IS NULL OR best_cash_flow >= 0",
    )


def downgrade() -> None:
    # We intentionally do not drop constraints in downgrade to avoid
    # accidentally removing constraints that were created outside this migration.
    # If a full rollback is needed, it should be done manually.
    pass
