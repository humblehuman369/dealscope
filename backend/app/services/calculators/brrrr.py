"""BRRRR (Buy, Rehab, Rent, Refinance, Repeat) strategy calculator.

Pure calculation module — accepts only explicit, fully-resolved parameters.
No imports from app.core.defaults allowed.
"""

from typing import Any

from .common import calculate_monthly_mortgage, validate_financial_inputs


def calculate_brrrr(
    market_value: float,
    arv: float,
    monthly_rent_post_rehab: float,
    property_taxes_annual: float,
    purchase_discount_pct: float,
    down_payment_pct: float,
    interest_rate: float,
    loan_term_years: int,
    closing_costs_pct: float,
    renovation_budget: float,
    contingency_pct: float,
    holding_period_months: int,
    monthly_holding_costs: float,
    refinance_ltv: float,
    refinance_interest_rate: float,
    refinance_term_years: int,
    refinance_closing_costs: float,
    vacancy_rate: float,
    operating_expense_pct: float,
    insurance_annual: float,
) -> dict[str, Any]:
    """Calculate BRRRR metrics.

    Every financial assumption is a required parameter — the caller
    (assumption_resolver) is responsible for merging user overrides
    with admin-dashboard defaults before invoking this function.
    """
    validate_financial_inputs(
        purchase_price=market_value,
        arv=arv,
        monthly_rent=monthly_rent_post_rehab,
        interest_rate=interest_rate,
        down_payment_pct=down_payment_pct,
        loan_term_years=loan_term_years,
        rehab_cost=renovation_budget,
        holding_period_months=holding_period_months,
    )

    # Phase 1: Buy (at discount)
    purchase_price = market_value * (1 - purchase_discount_pct)
    down_payment = purchase_price * down_payment_pct
    closing_costs = purchase_price * closing_costs_pct
    initial_loan_amount = purchase_price - down_payment
    cash_required_phase1 = down_payment + closing_costs

    # Phase 2: Rehab
    contingency = renovation_budget * contingency_pct
    total_rehab = renovation_budget + contingency
    holding_costs = monthly_holding_costs * holding_period_months
    cash_required_phase2 = total_rehab + holding_costs

    # Total Cash Invested
    total_cash_invested = cash_required_phase1 + cash_required_phase2

    # Phase 3: Rent
    annual_gross_rent = monthly_rent_post_rehab * 12
    effective_gross_income = annual_gross_rent * (1 - vacancy_rate)
    operating_expenses = annual_gross_rent * operating_expense_pct + property_taxes_annual + insurance_annual
    noi = effective_gross_income - operating_expenses
    estimated_cap_rate = noi / arv if arv > 0 else 0

    # Phase 4: Refinance
    refinance_loan_amount = arv * refinance_ltv
    cash_out = refinance_loan_amount - initial_loan_amount - refinance_closing_costs
    new_monthly_pi = calculate_monthly_mortgage(refinance_loan_amount, refinance_interest_rate, refinance_term_years)
    new_annual_debt_service = new_monthly_pi * 12

    # Phase 5: Repeat Analysis
    capital_recycled_pct = cash_out / total_cash_invested if total_cash_invested > 0 else 0
    cash_left_in_deal = total_cash_invested - cash_out
    equity_position = arv - refinance_loan_amount
    equity_pct = equity_position / arv if arv > 0 else 0

    # Post-Refinance Cash Flow
    post_refi_annual_cash_flow = noi - new_annual_debt_service
    post_refi_monthly_cash_flow = post_refi_annual_cash_flow / 12
    post_refi_cash_on_cash = post_refi_annual_cash_flow / cash_left_in_deal if cash_left_in_deal > 0 else float("inf")
    infinite_roi = cash_left_in_deal <= 0

    total_months = holding_period_months + 2 + 1

    return {
        "purchase_price": purchase_price,
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        "initial_loan_amount": initial_loan_amount,
        "cash_required_phase1": cash_required_phase1,
        "renovation_budget": renovation_budget,
        "contingency": contingency,
        "holding_costs": holding_costs,
        "cash_required_phase2": cash_required_phase2,
        "arv": arv,
        "post_rehab_monthly_rent": monthly_rent_post_rehab,
        "annual_gross_rent": annual_gross_rent,
        "estimated_cap_rate": estimated_cap_rate,
        "refinance_loan_amount": refinance_loan_amount,
        "refinance_costs": refinance_closing_costs,
        "original_loan_payoff": initial_loan_amount,
        "cash_out_at_refinance": cash_out,
        "new_monthly_pi": new_monthly_pi,
        "total_cash_invested": total_cash_invested,
        "capital_recycled_pct": capital_recycled_pct,
        "cash_left_in_deal": cash_left_in_deal,
        "equity_position": equity_position,
        "equity_pct": equity_pct,
        "post_refi_annual_cash_flow": post_refi_annual_cash_flow,
        "post_refi_monthly_cash_flow": post_refi_monthly_cash_flow,
        "post_refi_cash_on_cash": post_refi_cash_on_cash,
        "infinite_roi_achieved": infinite_roi,
        "total_months_to_repeat": total_months,
    }
