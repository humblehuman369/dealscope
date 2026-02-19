"""BRRRR (Buy, Rehab, Rent, Refinance, Repeat) strategy calculator."""

from typing import Dict, Any

from .common import validate_financial_inputs, calculate_monthly_mortgage
from app.core.defaults import FINANCING, OPERATING, REHAB, BRRRR


def calculate_brrrr(
    market_value: float,
    arv: float,
    monthly_rent_post_rehab: float,
    property_taxes_annual: float,
    purchase_discount_pct: float = None,
    down_payment_pct: float = None,
    interest_rate: float = None,
    loan_term_years: int = None,
    closing_costs_pct: float = None,
    renovation_budget: float = None,
    contingency_pct: float = None,
    holding_period_months: int = None,
    monthly_holding_costs: float = None,
    refinance_ltv: float = None,
    refinance_interest_rate: float = None,
    refinance_term_years: int = None,
    refinance_closing_costs: float = None,
    vacancy_rate: float = None,
    operating_expense_pct: float = None,
    insurance_annual: float = None,
) -> Dict[str, Any]:
    """
    Calculate BRRRR (Buy, Rehab, Rent, Refinance, Repeat) metrics.
    """
    # Validate inputs
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
    
    # Apply centralized defaults for any unspecified values
    purchase_discount_pct = purchase_discount_pct if purchase_discount_pct is not None else BRRRR.buy_discount_pct
    down_payment_pct = down_payment_pct if down_payment_pct is not None else FINANCING.down_payment_pct
    interest_rate = interest_rate if interest_rate is not None else FINANCING.interest_rate
    loan_term_years = loan_term_years if loan_term_years is not None else FINANCING.loan_term_years
    closing_costs_pct = closing_costs_pct if closing_costs_pct is not None else FINANCING.closing_costs_pct
    renovation_budget = renovation_budget if renovation_budget is not None else arv * REHAB.renovation_budget_pct
    contingency_pct = contingency_pct if contingency_pct is not None else REHAB.contingency_pct
    holding_period_months = holding_period_months if holding_period_months is not None else REHAB.holding_period_months
    monthly_holding_costs = monthly_holding_costs if monthly_holding_costs is not None else (market_value * REHAB.holding_costs_pct) / 12
    refinance_ltv = refinance_ltv if refinance_ltv is not None else BRRRR.refinance_ltv
    refinance_interest_rate = refinance_interest_rate if refinance_interest_rate is not None else BRRRR.refinance_interest_rate
    refinance_term_years = refinance_term_years if refinance_term_years is not None else BRRRR.refinance_term_years
    refinance_closing_costs = refinance_closing_costs if refinance_closing_costs is not None else arv * BRRRR.refinance_closing_costs_pct
    vacancy_rate = vacancy_rate if vacancy_rate is not None else OPERATING.vacancy_rate
    operating_expense_pct = operating_expense_pct if operating_expense_pct is not None else (OPERATING.maintenance_pct + OPERATING.property_management_pct)
    insurance_annual = insurance_annual if insurance_annual is not None else arv * OPERATING.insurance_pct
    
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
    operating_expenses = (
        annual_gross_rent * operating_expense_pct +
        property_taxes_annual +
        insurance_annual
    )
    noi = effective_gross_income - operating_expenses
    estimated_cap_rate = noi / arv
    
    # Phase 4: Refinance
    refinance_loan_amount = arv * refinance_ltv
    cash_out = refinance_loan_amount - initial_loan_amount - refinance_closing_costs
    new_monthly_pi = calculate_monthly_mortgage(
        refinance_loan_amount, refinance_interest_rate, refinance_term_years
    )
    new_annual_debt_service = new_monthly_pi * 12
    
    # Phase 5: Repeat Analysis
    capital_recycled_pct = cash_out / total_cash_invested if total_cash_invested > 0 else 0
    cash_left_in_deal = total_cash_invested - cash_out
    equity_position = arv - refinance_loan_amount
    equity_pct = equity_position / arv if arv > 0 else 0
    
    # Post-Refinance Cash Flow
    post_refi_annual_cash_flow = noi - new_annual_debt_service
    post_refi_monthly_cash_flow = post_refi_annual_cash_flow / 12
    post_refi_cash_on_cash = (
        post_refi_annual_cash_flow / cash_left_in_deal 
        if cash_left_in_deal > 0 else float('inf')
    )
    infinite_roi = cash_left_in_deal <= 0
    
    # Timeline
    total_months = holding_period_months + 2 + 1  # rehab + stabilize + refinance
    
    return {
        # Phase 1: Buy
        "purchase_price": purchase_price,
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        "initial_loan_amount": initial_loan_amount,
        "cash_required_phase1": cash_required_phase1,
        
        # Phase 2: Rehab
        "renovation_budget": renovation_budget,
        "contingency": contingency,
        "holding_costs": holding_costs,
        "cash_required_phase2": cash_required_phase2,
        
        # Phase 3: Rent
        "arv": arv,
        "post_rehab_monthly_rent": monthly_rent_post_rehab,
        "annual_gross_rent": annual_gross_rent,
        "estimated_cap_rate": estimated_cap_rate,
        
        # Phase 4: Refinance
        "refinance_loan_amount": refinance_loan_amount,
        "refinance_costs": refinance_closing_costs,
        "original_loan_payoff": initial_loan_amount,
        "cash_out_at_refinance": cash_out,
        "new_monthly_pi": new_monthly_pi,
        
        # Phase 5: Repeat
        "total_cash_invested": total_cash_invested,
        "capital_recycled_pct": capital_recycled_pct,
        "cash_left_in_deal": cash_left_in_deal,
        "equity_position": equity_position,
        "equity_pct": equity_pct,
        
        # Post-Refinance Metrics
        "post_refi_annual_cash_flow": post_refi_annual_cash_flow,
        "post_refi_monthly_cash_flow": post_refi_monthly_cash_flow,
        "post_refi_cash_on_cash": post_refi_cash_on_cash,
        "infinite_roi_achieved": infinite_roi,
        
        # Timeline
        "total_months_to_repeat": total_months
    }
