"""Add CHECK constraints for financial columns

Enforces data integrity at the database level:
- Dollar amounts must be non-negative
- Percentage/rate columns must be in valid range [0, 1]
- Counter columns must be non-negative

Revision ID: 20260219_0002
Revises: 20260219_0001
Create Date: 2026-02-19 06:00:00.000000

"""
from alembic import op

revision = "20260219_0002"
down_revision = "20260219_0001"
branch_labels = None
depends_on = None

CONSTRAINTS = [
    # saved_properties: dollar amounts >= 0
    ("saved_properties", "ck_sp_purchase_price_non_neg", "custom_purchase_price >= 0"),
    ("saved_properties", "ck_sp_rent_estimate_non_neg", "custom_rent_estimate >= 0"),
    ("saved_properties", "ck_sp_arv_non_neg", "custom_arv >= 0"),
    ("saved_properties", "ck_sp_rehab_budget_non_neg", "custom_rehab_budget >= 0"),
    ("saved_properties", "ck_sp_daily_rate_non_neg", "custom_daily_rate >= 0"),
    ("saved_properties", "ck_sp_cash_flow_valid", "best_cash_flow IS NULL OR best_cash_flow = best_cash_flow"),
    # saved_properties: rates in [0, 1]
    ("saved_properties", "ck_sp_occupancy_rate_range", "custom_occupancy_rate IS NULL OR (custom_occupancy_rate >= 0 AND custom_occupancy_rate <= 1)"),
    ("saved_properties", "ck_sp_coc_return_range", "best_coc_return IS NULL OR (best_coc_return >= -10 AND best_coc_return <= 100)"),
    # user_profiles: dollar amounts >= 0
    ("user_profiles", "ck_up_budget_min_non_neg", "investment_budget_min IS NULL OR investment_budget_min >= 0"),
    ("user_profiles", "ck_up_budget_max_non_neg", "investment_budget_max IS NULL OR investment_budget_max >= 0"),
    # user_profiles: rates in [0, 1]
    ("user_profiles", "ck_up_target_coc_range", "target_cash_on_cash IS NULL OR (target_cash_on_cash >= 0 AND target_cash_on_cash <= 1)"),
    ("user_profiles", "ck_up_target_cap_range", "target_cap_rate IS NULL OR (target_cap_rate >= 0 AND target_cap_rate <= 1)"),
    # shared_links: non-negative counters
    ("shared_links", "ck_sl_view_count_non_neg", "view_count >= 0"),
    ("shared_links", "ck_sl_max_views_positive", "max_views IS NULL OR max_views > 0"),
    # subscriptions: non-negative counters
    ("subscriptions", "ck_sub_searches_used_non_neg", "searches_used >= 0"),
    ("subscriptions", "ck_sub_api_calls_used_non_neg", "api_calls_used >= 0"),
]


def upgrade() -> None:
    for table, name, expr in CONSTRAINTS:
        op.create_check_constraint(name, table, expr)


def downgrade() -> None:
    for table, name, _expr in reversed(CONSTRAINTS):
        op.drop_constraint(name, table, type_="check")
