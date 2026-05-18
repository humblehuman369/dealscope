"""Valuation snapshot schema — single API bundle for hero metrics."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class ValuationSnapshot(BaseModel):
    """Authoritative NOI / Income Value / cash flow at a purchase price."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    noi: float
    income_value: float | None = None
    target_buy_price: float | None = None
    purchase_price: float
    annual_debt_service: float
    monthly_cash_flow: float
    annual_cash_flow: float | None = None
    cap_rate_implied: float | None = None
    price_gap_to_income_pct: float | None = Field(
        None,
        description="(income_value - list_price) / list_price — Strategy Price Gap",
    )
    target_vs_income_pct: float | None = Field(
        None,
        description="(target_buy - income_value) / income_value",
    )
    list_vs_target_pct: float | None = Field(
        None,
        description="(list_price - target_buy) / list_price — Deal Gap",
    )
    formula_version: int = 5
    noi_expense_basis: Literal["gross"] = "gross"
    annual_gross_rent: float | None = None
    effective_gross_income: float | None = None
    operating_expenses: float | None = None
