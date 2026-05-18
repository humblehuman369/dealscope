"""Net operating income — single expense rule set for all valuation paths."""

from dataclasses import dataclass
from typing import Literal

NOI_EXPENSE_BASIS: Literal["gross"] = "gross"


@dataclass(frozen=True)
class NOIInputs:
    monthly_rent: float
    property_taxes: float
    insurance: float
    vacancy_rate: float
    maintenance_pct: float
    management_pct: float
    capex_pct: float = 0.0
    utilities_annual: float = 0.0
    other_annual_expenses: float = 0.0
    other_income_annual: float = 0.0


@dataclass(frozen=True)
class NOIResult:
    noi: float
    annual_gross_rent: float
    effective_gross_income: float
    operating_expenses: float
    vacancy_loss: float
    expense_basis: Literal["gross"] = NOI_EXPENSE_BASIS


def compute_noi(inputs: NOIInputs) -> NOIResult:
    """Compute NOI using gross-rent basis for % expenses (LTR / Income Value standard).

    Maintenance, management, and capex apply to annual gross rent (before vacancy),
    matching ``iq_verdict_service._calculate_ltr_strategy`` and legacy
    ``formulas.estimate_income_value``.
    """
    monthly_rent = inputs.monthly_rent if inputs.monthly_rent is not None else 0
    if monthly_rent < 0:
        monthly_rent = 0

    property_taxes = max(0.0, inputs.property_taxes or 0)
    insurance = max(0.0, inputs.insurance or 0)
    vacancy = max(0.0, min(1.0, inputs.vacancy_rate))
    maint_pct = max(0.0, min(1.0, inputs.maintenance_pct))
    mgmt_pct = max(0.0, min(1.0, inputs.management_pct))
    cap_pct = max(0.0, min(1.0, inputs.capex_pct))

    annual_gross_rent = monthly_rent * 12 + max(0.0, inputs.other_income_annual)
    vacancy_loss = annual_gross_rent * vacancy
    effective_gross_income = annual_gross_rent - vacancy_loss

    annual_maintenance = annual_gross_rent * maint_pct
    annual_management = annual_gross_rent * mgmt_pct
    annual_capex = annual_gross_rent * cap_pct
    operating_expenses = (
        property_taxes
        + insurance
        + annual_maintenance
        + annual_management
        + annual_capex
        + max(0.0, inputs.utilities_annual)
        + max(0.0, inputs.other_annual_expenses)
    )

    noi = effective_gross_income - operating_expenses
    return NOIResult(
        noi=noi,
        annual_gross_rent=annual_gross_rent,
        effective_gross_income=effective_gross_income,
        operating_expenses=operating_expenses,
        vacancy_loss=vacancy_loss,
    )
