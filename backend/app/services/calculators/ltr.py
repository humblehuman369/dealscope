"""Long-Term Rental strategy calculator.

Pure calculation module — accepts only explicit, fully-resolved parameters.
All default values are resolved by the assumption_resolver BEFORE calling
these functions. No imports from app.core.defaults allowed.
"""
from typing import Dict, Any

from .common import (
    validate_financial_inputs,
    calculate_monthly_mortgage,
    calculate_cap_rate,
    calculate_cash_on_cash,
    calculate_dscr,
    calculate_grm,
)


def calculate_ltr(
    purchase_price: float,
    monthly_rent: float,
    property_taxes_annual: float,
    down_payment_pct: float,
    interest_rate: float,
    loan_term_years: int,
    closing_costs_pct: float,
    vacancy_rate: float,
    property_management_pct: float,
    maintenance_pct: float,
    insurance_annual: float,
    utilities_monthly: float,
    landscaping_annual: float,
    pest_control_annual: float,
    appreciation_rate: float,
    rent_growth_rate: float,
    expense_growth_rate: float,
    hoa_monthly: float = 0,
) -> Dict[str, Any]:
    """Calculate Long-Term Rental metrics.

    Every financial assumption is a required parameter — the caller
    (assumption_resolver) is responsible for merging user overrides
    with admin-dashboard defaults before invoking this function.
    """
    validate_financial_inputs(
        purchase_price=purchase_price,
        monthly_rent=monthly_rent,
        interest_rate=interest_rate,
        down_payment_pct=down_payment_pct,
        loan_term_years=loan_term_years,
    )

    # Acquisition
    down_payment = purchase_price * down_payment_pct
    closing_costs = purchase_price * closing_costs_pct
    total_cash_required = down_payment + closing_costs
    loan_amount = purchase_price - down_payment

    # Financing
    monthly_pi = calculate_monthly_mortgage(loan_amount, interest_rate, loan_term_years)
    annual_debt_service = monthly_pi * 12

    # Income
    annual_gross_rent = monthly_rent * 12
    vacancy_loss = annual_gross_rent * vacancy_rate
    effective_gross_income = annual_gross_rent - vacancy_loss

    # Operating Expenses
    property_management = annual_gross_rent * property_management_pct
    maintenance = annual_gross_rent * maintenance_pct
    utilities_annual = utilities_monthly * 12
    hoa_annual = hoa_monthly * 12

    total_operating_expenses = (
        property_taxes_annual
        + insurance_annual
        + property_management
        + maintenance
        + utilities_annual
        + landscaping_annual
        + pest_control_annual
        + hoa_annual
    )

    # Key Metrics
    noi = effective_gross_income - total_operating_expenses
    annual_cash_flow = noi - annual_debt_service
    monthly_cash_flow = annual_cash_flow / 12

    cap_rate = calculate_cap_rate(noi, purchase_price)
    cash_on_cash = calculate_cash_on_cash(annual_cash_flow, total_cash_required)
    dscr = calculate_dscr(noi, annual_debt_service)
    grm = calculate_grm(purchase_price, annual_gross_rent)
    one_percent_rule = monthly_rent / purchase_price

    # 10-Year Projection
    ten_year_projection = []
    monthly_rate = interest_rate / 12
    total_payments = loan_term_years * 12

    for year in range(1, 11):
        year_gross_rent = annual_gross_rent * ((1 + rent_growth_rate) ** (year - 1))
        year_expenses = total_operating_expenses * ((1 + expense_growth_rate) ** (year - 1))
        year_noi = year_gross_rent * (1 - vacancy_rate) - year_expenses
        year_cash_flow = year_noi - annual_debt_service
        property_value = purchase_price * ((1 + appreciation_rate) ** year)

        payments_made = year * 12
        if interest_rate == 0:
            remaining_balance = loan_amount * (1 - payments_made / total_payments)
        else:
            remaining_balance = loan_amount * (
                ((1 + monthly_rate) ** total_payments - (1 + monthly_rate) ** payments_made)
                / ((1 + monthly_rate) ** total_payments - 1)
            )
        equity = property_value - remaining_balance

        ten_year_projection.append({
            "year": year,
            "gross_rent": year_gross_rent,
            "operating_expenses": year_expenses,
            "noi": year_noi,
            "debt_service": annual_debt_service,
            "cash_flow": year_cash_flow,
            "property_value": property_value,
            "equity": equity,
        })

    return {
        "monthly_rent": monthly_rent,
        "annual_gross_rent": annual_gross_rent,
        "vacancy_loss": vacancy_loss,
        "effective_gross_income": effective_gross_income,
        "property_taxes": property_taxes_annual,
        "insurance": insurance_annual,
        "property_management": property_management,
        "maintenance": maintenance,
        "utilities": utilities_annual,
        "landscaping": landscaping_annual,
        "pest_control": pest_control_annual,
        "hoa_fees": hoa_annual,
        "total_operating_expenses": total_operating_expenses,
        "loan_amount": loan_amount,
        "monthly_pi": monthly_pi,
        "annual_debt_service": annual_debt_service,
        "noi": noi,
        "monthly_cash_flow": monthly_cash_flow,
        "annual_cash_flow": annual_cash_flow,
        "cap_rate": cap_rate,
        "cash_on_cash_return": cash_on_cash,
        "dscr": dscr,
        "grm": grm,
        "one_percent_rule": one_percent_rule,
        "total_cash_required": total_cash_required,
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        "ten_year_projection": ten_year_projection,
    }


def calculate_ltr_breakeven(
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    vacancy_rate: float,
    maintenance_pct: float,
    management_pct: float,
    down_payment_pct: float,
    interest_rate: float,
    loan_term_years: int,
    capex_pct: float = 0.0,
    utilities_annual: float = 0.0,
    other_annual_expenses: float = 0.0,
) -> float:
    """Breakeven purchase price where monthly cash flow = $0.

    At breakeven: NOI = Annual Debt Service.
    Percentage-based expenses use annual_gross_rent (before vacancy)
    to match the LTR strategy calculator.
    All parameters are required — resolved by the caller.
    """
    annual_gross_rent = monthly_rent * 12
    effective_gross_income = annual_gross_rent * (1 - vacancy_rate)

    annual_maintenance = annual_gross_rent * maintenance_pct
    annual_management = annual_gross_rent * management_pct
    annual_capex = annual_gross_rent * capex_pct
    operating_expenses = (
        property_taxes + insurance
        + annual_maintenance + annual_management + annual_capex
        + utilities_annual + other_annual_expenses
    )

    noi = effective_gross_income - operating_expenses

    if noi <= 0:
        return 0

    monthly_rate = interest_rate / 12
    num_payments = loan_term_years * 12
    ltv_ratio = 1 - down_payment_pct

    if monthly_rate > 0:
        compounded = (1 + monthly_rate) ** num_payments
        if compounded <= 1:
            return 0
        mortgage_constant = (monthly_rate * compounded) / (compounded - 1) * 12
    else:
        mortgage_constant = 1 / loan_term_years if loan_term_years > 0 else 0

    denominator = ltv_ratio * mortgage_constant
    if denominator <= 0:
        return round(noi / 0.05)

    return round(noi / denominator)
