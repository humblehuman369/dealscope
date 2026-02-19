"""Long-Term Rental strategy calculator."""
from typing import Dict, Any, Optional

from .common import (
    validate_financial_inputs,
    calculate_monthly_mortgage,
    calculate_cap_rate,
    calculate_cash_on_cash,
    calculate_dscr,
    calculate_grm,
)
from app.core.defaults import FINANCING, OPERATING, GROWTH


def calculate_ltr(
    purchase_price: float,
    monthly_rent: float,
    property_taxes_annual: float,
    hoa_monthly: float = 0,
    down_payment_pct: float = None,
    interest_rate: float = None,
    loan_term_years: int = None,
    closing_costs_pct: float = None,
    vacancy_rate: float = None,
    property_management_pct: float = None,
    maintenance_pct: float = None,
    insurance_annual: float = None,
    utilities_monthly: float = None,
    landscaping_annual: float = None,
    pest_control_annual: float = None,
    appreciation_rate: float = None,
    rent_growth_rate: float = None,
    expense_growth_rate: float = None,
) -> Dict[str, Any]:
    """
    Calculate Long-Term Rental metrics.
    Based on '1. Long-Term Rental' sheet from Excel.
    """
    # Validate inputs
    validate_financial_inputs(
        purchase_price=purchase_price,
        monthly_rent=monthly_rent,
        interest_rate=interest_rate,
        down_payment_pct=down_payment_pct,
        loan_term_years=loan_term_years,
    )
    
    # Apply centralized defaults for any unspecified values
    down_payment_pct = down_payment_pct if down_payment_pct is not None else FINANCING.down_payment_pct
    interest_rate = interest_rate if interest_rate is not None else FINANCING.interest_rate
    loan_term_years = loan_term_years if loan_term_years is not None else FINANCING.loan_term_years
    closing_costs_pct = closing_costs_pct if closing_costs_pct is not None else FINANCING.closing_costs_pct
    vacancy_rate = vacancy_rate if vacancy_rate is not None else OPERATING.vacancy_rate
    property_management_pct = property_management_pct if property_management_pct is not None else OPERATING.property_management_pct
    maintenance_pct = maintenance_pct if maintenance_pct is not None else OPERATING.maintenance_pct
    insurance_annual = insurance_annual if insurance_annual is not None else purchase_price * OPERATING.insurance_pct
    utilities_monthly = utilities_monthly if utilities_monthly is not None else OPERATING.utilities_monthly
    landscaping_annual = landscaping_annual if landscaping_annual is not None else OPERATING.landscaping_annual
    pest_control_annual = pest_control_annual if pest_control_annual is not None else OPERATING.pest_control_annual
    appreciation_rate = appreciation_rate if appreciation_rate is not None else GROWTH.appreciation_rate
    rent_growth_rate = rent_growth_rate if rent_growth_rate is not None else GROWTH.rent_growth_rate
    expense_growth_rate = expense_growth_rate if expense_growth_rate is not None else GROWTH.expense_growth_rate
    
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
        property_taxes_annual +
        insurance_annual +
        property_management +
        maintenance +
        utilities_annual +
        landscaping_annual +
        pest_control_annual +
        hoa_annual
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
            "equity": equity
        })
    
    return {
        # Income
        "monthly_rent": monthly_rent,
        "annual_gross_rent": annual_gross_rent,
        "vacancy_loss": vacancy_loss,
        "effective_gross_income": effective_gross_income,
        
        # Expenses
        "property_taxes": property_taxes_annual,
        "insurance": insurance_annual,
        "property_management": property_management,
        "maintenance": maintenance,
        "utilities": utilities_annual,
        "landscaping": landscaping_annual,
        "pest_control": pest_control_annual,
        "hoa_fees": hoa_annual,
        "total_operating_expenses": total_operating_expenses,
        
        # Financing
        "loan_amount": loan_amount,
        "monthly_pi": monthly_pi,
        "annual_debt_service": annual_debt_service,
        
        # Key Metrics
        "noi": noi,
        "monthly_cash_flow": monthly_cash_flow,
        "annual_cash_flow": annual_cash_flow,
        "cap_rate": cap_rate,
        "cash_on_cash_return": cash_on_cash,
        "dscr": dscr,
        "grm": grm,
        "one_percent_rule": one_percent_rule,
        
        # Investment Summary
        "total_cash_required": total_cash_required,
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        
        # Projections
        "ten_year_projection": ten_year_projection
    }


def calculate_ltr_breakeven(
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    vacancy_rate: float = None,
    maintenance_pct: float = None,
    management_pct: float = None,
    down_payment_pct: float = None,
    interest_rate: float = None,
    loan_term_years: int = None,
) -> float:
    """
    Estimate breakeven purchase price for LTR based on basic property data.
    
    Breakeven is where monthly cash flow = $0
    At breakeven: NOI = Annual Debt Service
    
    Args:
        monthly_rent: Expected monthly rental income
        property_taxes: Annual property taxes
        insurance: Annual insurance cost
        vacancy_rate: Expected vacancy rate (from centralized defaults)
        maintenance_pct: Maintenance as % of rent (from centralized defaults)
        management_pct: Management as % of rent (from centralized defaults)
        down_payment_pct: Down payment percentage (from centralized defaults)
        interest_rate: Annual interest rate (from centralized defaults)
        loan_term_years: Loan term in years (from centralized defaults)
    
    Returns:
        Breakeven purchase price
    """
    # Apply centralized defaults for any unspecified values
    vacancy_rate = vacancy_rate if vacancy_rate is not None else OPERATING.vacancy_rate
    maintenance_pct = maintenance_pct if maintenance_pct is not None else OPERATING.maintenance_pct
    management_pct = management_pct if management_pct is not None else OPERATING.property_management_pct
    down_payment_pct = down_payment_pct if down_payment_pct is not None else FINANCING.down_payment_pct
    interest_rate = interest_rate if interest_rate is not None else FINANCING.interest_rate
    loan_term_years = loan_term_years if loan_term_years is not None else FINANCING.loan_term_years
    
    # Calculate annual gross income
    annual_gross_rent = monthly_rent * 12
    effective_gross_income = annual_gross_rent * (1 - vacancy_rate)
    
    # Calculate operating expenses (not including debt service)
    annual_maintenance = effective_gross_income * maintenance_pct
    annual_management = effective_gross_income * management_pct
    operating_expenses = property_taxes + insurance + annual_maintenance + annual_management
    
    # NOI = Effective Gross Income - Operating Expenses
    noi = effective_gross_income - operating_expenses
    
    if noi <= 0:
        # Property can't break even at any price (negative NOI)
        return 0
    
    # At breakeven: NOI = Annual Debt Service
    # Monthly Payment = Loan Amount * (r * (1+r)^n) / ((1+r)^n - 1)
    # Loan Amount = Purchase Price * (1 - Down Payment %)
    
    monthly_rate = interest_rate / 12
    num_payments = loan_term_years * 12
    ltv_ratio = 1 - down_payment_pct
    
    # Mortgage constant (annual payment per $ of loan)
    mortgage_constant = (
        (monthly_rate * ((1 + monthly_rate) ** num_payments)) /
        (((1 + monthly_rate) ** num_payments) - 1) * 12
    )
    
    # Solve for purchase price: NOI = PurchasePrice * LTV * MortgageConstant
    # PurchasePrice = NOI / (LTV * MortgageConstant)
    denominator = ltv_ratio * mortgage_constant
    if denominator <= 0:
        # 100% cash purchase (no debt service) — breakeven is NOI / cap rate
        # With no mortgage, any price where NOI > 0 technically works,
        # so return NOI divided by a reasonable cap rate floor (5%)
        return round(noi / 0.05)
    
    breakeven = noi / denominator
    
    return round(breakeven)
