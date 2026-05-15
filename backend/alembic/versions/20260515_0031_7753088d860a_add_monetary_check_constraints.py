"""add_monetary_check_constraints

Revision ID: 7753088d860a
Revises: 20260506_0006
Create Date: 2026-05-15 00:31:57.029939

Adds CHECK constraints ensuring monetary columns cannot be negative.
This is a data-integrity hardening measure for Phase 3.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7753088d860a'
down_revision: Union[str, None] = '20260506_0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # budget_lines – core monetary columns
    op.create_check_constraint(
        "ck_budget_lines_estimate_amount_nonneg",
        "budget_lines",
        "estimate_amount >= 0",
    )
    op.create_check_constraint(
        "ck_budget_lines_unit_cost_nonneg",
        "budget_lines",
        "unit_cost >= 0",
    )
    op.create_check_constraint(
        "ck_budget_lines_amount_nonneg",
        "budget_lines",
        "amount >= 0",
    )

    # payment_history – recorded payments
    op.create_check_constraint(
        "ck_payment_history_amount_nonneg",
        "payment_history",
        "amount >= 0",
    )

    # saved_property – user-provided financial assumptions
    op.create_check_constraint(
        "ck_saved_property_sold_price_nonneg",
        "saved_properties",
        "sold_price IS NULL OR sold_price >= 0",
    )
    op.create_check_constraint(
        "ck_saved_property_custom_purchase_price_nonneg",
        "saved_properties",
        "custom_purchase_price IS NULL OR custom_purchase_price >= 0",
    )
    op.create_check_constraint(
        "ck_saved_property_custom_rent_estimate_nonneg",
        "saved_properties",
        "custom_rent_estimate IS NULL OR custom_rent_estimate >= 0",
    )
    op.create_check_constraint(
        "ck_saved_property_custom_arv_nonneg",
        "saved_properties",
        "custom_arv IS NULL OR custom_arv >= 0",
    )
    op.create_check_constraint(
        "ck_saved_property_custom_rehab_budget_nonneg",
        "saved_properties",
        "custom_rehab_budget IS NULL OR custom_rehab_budget >= 0",
    )
    op.create_check_constraint(
        "ck_saved_property_custom_daily_rate_nonneg",
        "saved_properties",
        "custom_daily_rate IS NULL OR custom_daily_rate >= 0",
    )
    op.create_check_constraint(
        "ck_saved_property_best_cash_flow_nonneg",
        "saved_properties",
        "best_cash_flow IS NULL OR best_cash_flow >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_saved_property_best_cash_flow_nonneg", "saved_properties", type_="check")
    op.drop_constraint("ck_saved_property_custom_daily_rate_nonneg", "saved_properties", type_="check")
    op.drop_constraint("ck_saved_property_custom_rehab_budget_nonneg", "saved_properties", type_="check")
    op.drop_constraint("ck_saved_property_custom_arv_nonneg", "saved_properties", type_="check")
    op.drop_constraint("ck_saved_property_custom_rent_estimate_nonneg", "saved_properties", type_="check")
    op.drop_constraint("ck_saved_property_custom_purchase_price_nonneg", "saved_properties", type_="check")
    op.drop_constraint("ck_saved_property_sold_price_nonneg", "saved_properties", type_="check")

    op.drop_constraint("ck_payment_history_amount_nonneg", "payment_history", type_="check")

    op.drop_constraint("ck_budget_lines_amount_nonneg", "budget_lines", type_="check")
    op.drop_constraint("ck_budget_lines_unit_cost_nonneg", "budget_lines", type_="check")
    op.drop_constraint("ck_budget_lines_estimate_amount_nonneg", "budget_lines", type_="check")
