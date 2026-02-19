"""
Shared utilities for investment calculators.

Validation, mortgage math, and common financial formulas used
across all strategy calculators.
"""
from typing import Optional


class CalculationInputError(ValueError):
    """Raised when calculator inputs are outside acceptable bounds."""
    pass


def validate_financial_inputs(
    purchase_price: Optional[float] = None,
    monthly_rent: Optional[float] = None,
    interest_rate: Optional[float] = None,
    down_payment_pct: Optional[float] = None,
    loan_term_years: Optional[int] = None,
    arv: Optional[float] = None,
    rehab_cost: Optional[float] = None,
    holding_period_months: Optional[int] = None,
    assignment_fee: Optional[float] = None,
) -> None:
    """Validate financial inputs are within reasonable bounds."""
    errors = []

    if purchase_price is not None:
        if purchase_price <= 0:
            errors.append("Purchase price must be greater than $0")
        elif purchase_price > 100_000_000:
            errors.append("Purchase price exceeds maximum of $100,000,000")

    if monthly_rent is not None:
        if monthly_rent < 0:
            errors.append("Monthly rent cannot be negative")
        elif monthly_rent > 1_000_000:
            errors.append("Monthly rent exceeds maximum of $1,000,000")

    if interest_rate is not None:
        if interest_rate < 0:
            errors.append("Interest rate cannot be negative")
        elif interest_rate > 0.30:
            errors.append("Interest rate exceeds maximum of 30%")

    if down_payment_pct is not None:
        if down_payment_pct < 0:
            errors.append("Down payment percentage cannot be negative")
        elif down_payment_pct > 1.0:
            errors.append("Down payment percentage cannot exceed 100%")

    if loan_term_years is not None:
        if loan_term_years < 1:
            errors.append("Loan term must be at least 1 year")
        elif loan_term_years > 50:
            errors.append("Loan term exceeds maximum of 50 years")

    if arv is not None:
        if arv <= 0:
            errors.append("After Repair Value (ARV) must be greater than $0")
        elif arv > 100_000_000:
            errors.append("ARV exceeds maximum of $100,000,000")

    if rehab_cost is not None:
        if rehab_cost < 0:
            errors.append("Rehab cost cannot be negative")
        elif rehab_cost > 10_000_000:
            errors.append("Rehab cost exceeds maximum of $10,000,000")

    if holding_period_months is not None:
        if holding_period_months < 1:
            errors.append("Holding period must be at least 1 month")
        elif holding_period_months > 120:
            errors.append("Holding period exceeds maximum of 120 months (10 years)")

    if assignment_fee is not None:
        if assignment_fee < 0:
            errors.append("Assignment fee cannot be negative")
        elif assignment_fee > 1_000_000:
            errors.append("Assignment fee exceeds maximum of $1,000,000")

    if errors:
        raise CalculationInputError("; ".join(errors))


def calculate_monthly_mortgage(principal: float, annual_rate: float, years: int) -> float:
    """Calculate monthly mortgage payment (P&I)."""
    if annual_rate == 0:
        return principal / (years * 12)

    monthly_rate = annual_rate / 12
    num_payments = years * 12

    payment = principal * (monthly_rate * (1 + monthly_rate) ** num_payments) / \
              ((1 + monthly_rate) ** num_payments - 1)

    return payment


def calculate_noi(gross_income: float, operating_expenses: float) -> float:
    """Calculate Net Operating Income."""
    return gross_income - operating_expenses


def calculate_cap_rate(noi: float, property_value: float) -> float:
    """Calculate Capitalization Rate."""
    if property_value == 0:
        return 0
    return noi / property_value


def calculate_cash_on_cash(annual_cash_flow: float, total_cash_invested: float) -> float:
    """Calculate Cash-on-Cash Return."""
    if total_cash_invested == 0:
        return float('inf') if annual_cash_flow > 0 else 0
    return annual_cash_flow / total_cash_invested


def calculate_dscr(noi: float, annual_debt_service: float) -> float:
    """Calculate Debt Service Coverage Ratio."""
    if annual_debt_service == 0:
        return float('inf')
    return noi / annual_debt_service


def calculate_grm(property_price: float, annual_gross_rent: float) -> float:
    """Calculate Gross Rent Multiplier."""
    if annual_gross_rent == 0:
        return float('inf')
    return property_price / annual_gross_rent


def run_sensitivity_analysis(
    base_calculation_func,
    base_params: dict,
    variable_name: str,
    variations: list,
    output_metrics: list,
) -> list:
    """Run sensitivity analysis on a single variable."""
    results = []
    base_value = base_params.get(variable_name, 0)

    for variation in variations:
        modified_params = base_params.copy()
        modified_value = base_value * (1 + variation)
        modified_params[variable_name] = modified_value

        calc_result = base_calculation_func(**modified_params)

        result_row = {
            "variation": variation,
            "variable_value": modified_value,
        }
        for metric in output_metrics:
            result_row[metric] = calc_result.get(metric, None)

        results.append(result_row)

    return results
