"""Shared StructureContext factory for deal-structures unit tests.

Kept out of ``conftest.py`` so it doesn't drag the DB-fixture machinery into
pure-function template tests.
"""

from __future__ import annotations

from typing import Any

from app.services.deal_structures.context import StructureContext


def base_ctx(**overrides: Any) -> StructureContext:
    """Build a StructureContext with realistic defaults; pass overrides per test."""
    defaults: dict[str, Any] = dict(
        list_price=400_000,
        target_buy_price=360_000,
        income_value=380_000,
        deal_gap_pct=10.0,
        monthly_rent=2800,
        property_taxes_annual=4800,
        insurance_annual=4000,
        down_payment_pct=0.20,
        interest_rate=0.065,
        loan_term_years=30,
        closing_costs_pct=0.03,
        vacancy_rate=0.05,
        maintenance_pct=0.05,
        management_pct=0.08,
        capex_pct=0.05,
        utilities_annual=0,
        other_annual_expenses=0,
        is_listed=True,
        days_on_market=45,
        is_fsbo=False,
        is_foreclosure=False,
        is_bank_owned=False,
        market_temperature="cold",
        template_flags={},
        state=None,
    )
    defaults.update(overrides)
    return StructureContext(**defaults)
