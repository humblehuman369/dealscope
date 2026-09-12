"""Add OpenAI research columns on action_plans.

Revision ID: 20260912_0002
Revises: 20260912_0001
Create Date: 2026-09-12

Research-step columns from docs/AI_ACTION_PLAN_OPENAI_RESEARCH.md:
provider, provider_response_id, searches, input_tokens, output_tokens.
cost_cents already exists from Phase 0.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260912_0002"
down_revision: str | None = "20260912_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("action_plans", sa.Column("provider", sa.String(16), nullable=True))
    op.add_column(
        "action_plans",
        sa.Column("provider_response_id", sa.String(128), nullable=True),
    )
    op.add_column("action_plans", sa.Column("searches", sa.Integer(), nullable=True))
    op.add_column("action_plans", sa.Column("input_tokens", sa.Integer(), nullable=True))
    op.add_column("action_plans", sa.Column("output_tokens", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("action_plans", "output_tokens")
    op.drop_column("action_plans", "input_tokens")
    op.drop_column("action_plans", "searches")
    op.drop_column("action_plans", "provider_response_id")
    op.drop_column("action_plans", "provider")
