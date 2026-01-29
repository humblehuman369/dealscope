"""
Investment Strategy Calculators
All formulas derived from Property_Data_Analytics.xlsx

NOTE: All default values are imported from app.core.defaults.
Do NOT hardcode default values in this file.
"""
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import math

# Import centralized defaults - SINGLE SOURCE OF TRUTH
from app.core.defaults import (
    FINANCING, OPERATING, STR, REHAB, BRRRR, FLIP, 
    HOUSE_HACK, WHOLESALE, GROWTH
)


# ============================================
# COMMON CALCULATIONS
# ============================================

def calculate_monthly_mortgage(principal: float, annual_rate: float, years: int) -> float:
    """
    Calculate monthly mortgage payment (P&I).
    Formula: P × [r(1+r)^n] / [(1+r)^n - 1]
    """
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


# ============================================
# LONG-TERM RENTAL CALCULATOR
# ============================================

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
    """
    Calculate Long-Term Rental metrics.
    Based on '1. Long-Term Rental' sheet from Excel.
    """
    
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
    cumulative_loan_balance = loan_amount
    
    for year in range(1, 11):
        year_gross_rent = annual_gross_rent * ((1 + rent_growth_rate) ** (year - 1))
        year_expenses = total_operating_expenses * ((1 + expense_growth_rate) ** (year - 1))
        year_noi = year_gross_rent * (1 - vacancy_rate) - year_expenses
        year_cash_flow = year_noi - annual_debt_service
        property_value = purchase_price * ((1 + appreciation_rate) ** year)
        
        # Simplified equity calculation (principal paydown estimate)
        equity = property_value - (loan_amount * (1 - (year / loan_term_years) * 0.3))
        
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


# ============================================
# SHORT-TERM RENTAL CALCULATOR
# ============================================

def calculate_str(
    purchase_price: float,
    average_daily_rate: float,
    occupancy_rate: float,
    property_taxes_annual: float,
    hoa_monthly: float = 0,
    down_payment_pct: float = None,
    interest_rate: float = None,
    loan_term_years: int = None,
    closing_costs_pct: float = None,
    furniture_setup_cost: float = None,
    platform_fees_pct: float = None,
    str_management_pct: float = None,
    cleaning_cost_per_turnover: float = None,
    cleaning_fee_revenue: float = None,
    avg_length_of_stay_days: int = None,
    supplies_monthly: float = None,
    additional_utilities_monthly: float = None,
    insurance_annual: float = None,
    maintenance_annual: float = None,
    landscaping_annual: float = None,
    pest_control_annual: float = None,
) -> Dict[str, Any]:
    # Apply centralized defaults for any unspecified values
    down_payment_pct = down_payment_pct if down_payment_pct is not None else FINANCING.down_payment_pct
    interest_rate = interest_rate if interest_rate is not None else FINANCING.interest_rate
    loan_term_years = loan_term_years if loan_term_years is not None else FINANCING.loan_term_years
    closing_costs_pct = closing_costs_pct if closing_costs_pct is not None else FINANCING.closing_costs_pct
    furniture_setup_cost = furniture_setup_cost if furniture_setup_cost is not None else STR.furniture_setup_cost
    platform_fees_pct = platform_fees_pct if platform_fees_pct is not None else STR.platform_fees_pct
    str_management_pct = str_management_pct if str_management_pct is not None else STR.str_management_pct
    cleaning_cost_per_turnover = cleaning_cost_per_turnover if cleaning_cost_per_turnover is not None else STR.cleaning_cost_per_turnover
    cleaning_fee_revenue = cleaning_fee_revenue if cleaning_fee_revenue is not None else STR.cleaning_fee_revenue
    avg_length_of_stay_days = avg_length_of_stay_days if avg_length_of_stay_days is not None else STR.avg_length_of_stay_days
    supplies_monthly = supplies_monthly if supplies_monthly is not None else STR.supplies_monthly
    additional_utilities_monthly = additional_utilities_monthly if additional_utilities_monthly is not None else STR.additional_utilities_monthly
    insurance_annual = insurance_annual if insurance_annual is not None else purchase_price * STR.str_insurance_pct
    maintenance_annual = maintenance_annual if maintenance_annual is not None else purchase_price * OPERATING.maintenance_pct
    landscaping_annual = landscaping_annual if landscaping_annual is not None else OPERATING.landscaping_annual
    pest_control_annual = pest_control_annual if pest_control_annual is not None else OPERATING.pest_control_annual
    """
    Calculate Short-Term Rental metrics.
    Based on '2. Short-Term Rental' sheet from Excel.
    """
    
    # Acquisition
    down_payment = purchase_price * down_payment_pct
    closing_costs = purchase_price * closing_costs_pct
    total_cash_required = down_payment + closing_costs + furniture_setup_cost
    loan_amount = purchase_price - down_payment
    
    # Financing
    monthly_pi = calculate_monthly_mortgage(loan_amount, interest_rate, loan_term_years)
    annual_debt_service = monthly_pi * 12
    
    # Revenue Calculations
    nights_occupied = 365 * occupancy_rate
    num_bookings = nights_occupied / avg_length_of_stay_days
    rental_revenue = average_daily_rate * nights_occupied
    cleaning_fee_revenue_total = cleaning_fee_revenue * num_bookings
    total_gross_revenue = rental_revenue + cleaning_fee_revenue_total
    
    # Operating Expenses
    platform_fees = total_gross_revenue * platform_fees_pct
    str_management = total_gross_revenue * str_management_pct
    cleaning_costs = cleaning_cost_per_turnover * num_bookings
    supplies_annual = supplies_monthly * 12
    utilities_annual = additional_utilities_monthly * 12
    hoa_annual = hoa_monthly * 12
    
    total_operating_expenses = (
        property_taxes_annual +
        insurance_annual +
        platform_fees +
        str_management +
        cleaning_costs +
        supplies_annual +
        utilities_annual +
        maintenance_annual +
        landscaping_annual +
        pest_control_annual +
        hoa_annual
    )
    
    # Key Metrics
    noi = total_gross_revenue - total_operating_expenses
    annual_cash_flow = noi - annual_debt_service
    monthly_cash_flow = annual_cash_flow / 12
    
    cap_rate = calculate_cap_rate(noi, purchase_price)
    cash_on_cash = calculate_cash_on_cash(annual_cash_flow, total_cash_required)
    dscr = calculate_dscr(noi, annual_debt_service)
    revenue_per_night = total_gross_revenue / 365
    
    # Break-even occupancy calculation
    fixed_costs = (
        property_taxes_annual + insurance_annual + maintenance_annual +
        landscaping_annual + pest_control_annual + hoa_annual + annual_debt_service
    )
    variable_cost_per_night = (
        (average_daily_rate * (platform_fees_pct + str_management_pct)) +
        (cleaning_cost_per_turnover / avg_length_of_stay_days)
    )
    revenue_per_night_net = average_daily_rate - variable_cost_per_night
    break_even_nights = fixed_costs / revenue_per_night_net if revenue_per_night_net > 0 else 365
    break_even_occupancy = break_even_nights / 365
    
    # Seasonality Analysis
    seasonality_analysis = [
        {"season": "Peak (Winter)", "months": 5, "occupancy": 0.90, "adr": average_daily_rate * 1.2,
         "revenue": average_daily_rate * 1.2 * 0.90 * (5 * 30)},
        {"season": "Shoulder (Spring/Fall)", "months": 2, "occupancy": 0.80, "adr": average_daily_rate,
         "revenue": average_daily_rate * 0.80 * (2 * 30)},
        {"season": "Off (Summer)", "months": 5, "occupancy": 0.70, "adr": average_daily_rate * 0.8,
         "revenue": average_daily_rate * 0.8 * 0.70 * (5 * 30)},
    ]
    
    return {
        # Revenue
        "average_daily_rate": average_daily_rate,
        "occupancy_rate": occupancy_rate,
        "nights_occupied": nights_occupied,
        "num_bookings": num_bookings,
        "rental_revenue": rental_revenue,
        "cleaning_fee_revenue": cleaning_fee_revenue_total,
        "total_gross_revenue": total_gross_revenue,
        
        # Expenses
        "property_taxes": property_taxes_annual,
        "insurance": insurance_annual,
        "platform_fees": platform_fees,
        "str_management": str_management,
        "cleaning_costs": cleaning_costs,
        "supplies": supplies_annual,
        "utilities": utilities_annual,
        "maintenance": maintenance_annual,
        "landscaping": landscaping_annual,
        "pest_control": pest_control_annual,
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
        "revenue_per_available_night": revenue_per_night,
        "break_even_occupancy": break_even_occupancy,
        
        # Investment Summary
        "total_cash_required": total_cash_required,
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        "furniture_setup": furniture_setup_cost,
        
        # Seasonality
        "seasonality_analysis": seasonality_analysis
    }


# ============================================
# BRRRR CALCULATOR
# ============================================

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
    """
    Calculate BRRRR Strategy metrics.
    Based on '3. BRRRR Strategy' sheet from Excel.
    """
    
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


# ============================================
# FIX & FLIP CALCULATOR
# ============================================

def calculate_flip(
    market_value: float,
    arv: float,
    purchase_discount_pct: float = None,
    hard_money_ltv: float = None,
    hard_money_rate: float = None,
    closing_costs_pct: float = None,
    inspection_costs: float = 1000,
    renovation_budget: float = None,
    contingency_pct: float = None,
    holding_period_months: float = None,
    property_taxes_annual: float = None,
    insurance_annual: float = None,
    utilities_monthly: float = None,
    security_maintenance_monthly: float = 83,
    selling_costs_pct: float = None,
    capital_gains_rate: float = 0.15,
) -> Dict[str, Any]:
    # Apply centralized defaults for any unspecified values
    purchase_discount_pct = purchase_discount_pct if purchase_discount_pct is not None else BRRRR.buy_discount_pct
    hard_money_ltv = hard_money_ltv if hard_money_ltv is not None else FLIP.hard_money_ltv
    hard_money_rate = hard_money_rate if hard_money_rate is not None else FLIP.hard_money_rate
    closing_costs_pct = closing_costs_pct if closing_costs_pct is not None else FINANCING.closing_costs_pct
    renovation_budget = renovation_budget if renovation_budget is not None else arv * REHAB.renovation_budget_pct
    contingency_pct = contingency_pct if contingency_pct is not None else REHAB.contingency_pct
    holding_period_months = holding_period_months if holding_period_months is not None else FLIP.holding_period_months
    property_taxes_annual = property_taxes_annual if property_taxes_annual is not None else market_value * 0.012
    insurance_annual = insurance_annual if insurance_annual is not None else market_value * OPERATING.insurance_pct
    utilities_monthly = utilities_monthly if utilities_monthly is not None else OPERATING.utilities_monthly
    selling_costs_pct = selling_costs_pct if selling_costs_pct is not None else FLIP.selling_costs_pct
    """
    Calculate Fix & Flip metrics.
    Based on '4. Fix & Flip' sheet from Excel.
    """
    
    # Acquisition
    purchase_price = market_value * (1 - purchase_discount_pct)
    hard_money_loan = purchase_price * hard_money_ltv
    down_payment = purchase_price - hard_money_loan
    closing_costs = purchase_price * closing_costs_pct
    total_acquisition_cash = down_payment + closing_costs + inspection_costs
    
    # Renovation
    contingency = renovation_budget * contingency_pct
    total_renovation = renovation_budget + contingency
    
    # Holding Costs
    hard_money_interest = hard_money_loan * hard_money_rate * (holding_period_months / 12)
    property_taxes_holding = property_taxes_annual * (holding_period_months / 12)
    insurance_holding = insurance_annual * (holding_period_months / 12)
    utilities_total = utilities_monthly * holding_period_months
    security_maintenance = security_maintenance_monthly * holding_period_months
    total_holding_costs = (
        hard_money_interest + property_taxes_holding + insurance_holding +
        utilities_total + security_maintenance
    )
    
    # Total Project Cost
    total_project_cost = purchase_price + closing_costs + inspection_costs + \
                         total_renovation + total_holding_costs
    
    # Total Cash Required
    total_cash_required = total_acquisition_cash + total_renovation + total_holding_costs
    
    # Sale
    realtor_commission = arv * 0.06
    seller_closing_costs = arv * 0.02
    total_selling_costs = arv * selling_costs_pct
    net_sale_proceeds = arv - total_selling_costs
    
    # Profit Analysis
    gross_profit = arv - total_project_cost
    net_profit_before_tax = net_sale_proceeds - hard_money_loan - total_cash_required
    capital_gains_tax = max(0, net_profit_before_tax * capital_gains_rate)
    net_profit_after_tax = net_profit_before_tax - capital_gains_tax
    
    # Key Metrics
    roi = net_profit_before_tax / total_cash_required if total_cash_required > 0 else 0
    annualized_roi = roi * (12 / holding_period_months) if holding_period_months > 0 else 0
    profit_margin = net_profit_before_tax / arv if arv > 0 else 0
    
    # 70% Rule Check
    seventy_pct_max_price = (arv * 0.70) - renovation_budget
    meets_70_rule = purchase_price <= seventy_pct_max_price
    
    # Break-even
    minimum_sale_for_breakeven = total_project_cost / (1 - selling_costs_pct)
    
    return {
        # Acquisition
        "purchase_price": purchase_price,
        "hard_money_loan": hard_money_loan,
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        "inspection_costs": inspection_costs,
        "total_acquisition_cash": total_acquisition_cash,
        
        # Renovation
        "renovation_budget": renovation_budget,
        "contingency": contingency,
        "total_renovation": total_renovation,
        
        # Holding Costs
        "hard_money_interest": hard_money_interest,
        "property_taxes": property_taxes_holding,
        "insurance": insurance_holding,
        "utilities": utilities_total,
        "security_maintenance": security_maintenance,
        "total_holding_costs": total_holding_costs,
        
        # Sale
        "arv": arv,
        "realtor_commission": realtor_commission,
        "seller_closing_costs": seller_closing_costs,
        "total_selling_costs": total_selling_costs,
        "net_sale_proceeds": net_sale_proceeds,
        
        # Profit Analysis
        "total_project_cost": total_project_cost,
        "gross_profit": gross_profit,
        "net_profit_before_tax": net_profit_before_tax,
        "capital_gains_tax": capital_gains_tax,
        "net_profit_after_tax": net_profit_after_tax,
        
        # Key Metrics
        "roi": roi,
        "annualized_roi": annualized_roi,
        "profit_margin": profit_margin,
        "total_cash_required": total_cash_required,
        
        # 70% Rule
        "seventy_pct_max_price": seventy_pct_max_price,
        "meets_70_rule": meets_70_rule,
        
        # Break-even
        "minimum_sale_for_breakeven": minimum_sale_for_breakeven
    }


# ============================================
# HOUSE HACK CALCULATOR
# ============================================

def calculate_house_hack(
    purchase_price: float,
    monthly_rent_per_room: float,
    rooms_rented: int,
    property_taxes_annual: float,
    owner_unit_market_rent: float = 1500,
    down_payment_pct: float = None,
    interest_rate: float = None,
    loan_term_years: int = None,
    closing_costs_pct: float = None,
    fha_mip_rate: float = None,
    insurance_annual: float = None,
    utilities_shared_monthly: float = 150,
    maintenance_monthly: float = 200,
    conversion_cost: float = None,
    unit2_rent: float = None,
) -> Dict[str, Any]:
    # Apply centralized defaults for any unspecified values (FHA defaults for house hack)
    down_payment_pct = down_payment_pct if down_payment_pct is not None else HOUSE_HACK.fha_down_payment_pct
    interest_rate = interest_rate if interest_rate is not None else FINANCING.interest_rate
    loan_term_years = loan_term_years if loan_term_years is not None else FINANCING.loan_term_years
    closing_costs_pct = closing_costs_pct if closing_costs_pct is not None else FINANCING.closing_costs_pct
    fha_mip_rate = fha_mip_rate if fha_mip_rate is not None else HOUSE_HACK.fha_mip_rate
    insurance_annual = insurance_annual if insurance_annual is not None else purchase_price * OPERATING.insurance_pct
    """
    Calculate House Hacking metrics.
    Based on '5. House Hacking' sheet from Excel.
    """
    
    # Acquisition (FHA)
    down_payment = purchase_price * down_payment_pct
    closing_costs = purchase_price * closing_costs_pct
    total_cash_required = down_payment + closing_costs
    loan_amount = purchase_price - down_payment
    
    # Monthly Costs
    monthly_pi = calculate_monthly_mortgage(loan_amount, interest_rate, loan_term_years)
    monthly_mip = (loan_amount * fha_mip_rate) / 12
    monthly_taxes = property_taxes_annual / 12
    monthly_insurance = insurance_annual / 12
    monthly_piti = monthly_pi + monthly_mip + monthly_taxes + monthly_insurance
    
    # Scenario A: Rent Rooms
    total_monthly_income = monthly_rent_per_room * rooms_rented
    total_monthly_expenses = monthly_piti + utilities_shared_monthly + maintenance_monthly
    net_housing_cost_a = total_monthly_expenses - total_monthly_income
    savings_vs_renting_a = owner_unit_market_rent - net_housing_cost_a
    annual_savings_a = savings_vs_renting_a * 12
    
    # Scenario B: Duplex Conversion (if applicable)
    net_housing_cost_b = None
    savings_vs_renting_b = None
    heloc_payment = None
    
    if conversion_cost and unit2_rent:
        # Assume HELOC at 8%
        heloc_rate = 0.08
        heloc_term = 10
        heloc_payment = calculate_monthly_mortgage(conversion_cost, heloc_rate, heloc_term)
        
        scenario_b_expenses = monthly_piti + heloc_payment + utilities_shared_monthly + \
                             (maintenance_monthly * 1.25)  # Higher maintenance for duplex
        net_housing_cost_b = scenario_b_expenses - unit2_rent
        savings_vs_renting_b = owner_unit_market_rent - net_housing_cost_b
    
    # Key Metrics
    housing_cost_offset_pct = total_monthly_income / total_monthly_expenses if total_monthly_expenses > 0 else 0
    live_free_threshold = total_monthly_expenses  # Rent needed to live free
    roi_on_savings = annual_savings_a / total_cash_required if total_cash_required > 0 else 0
    
    return {
        # Acquisition
        "purchase_price": purchase_price,
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        "loan_amount": loan_amount,
        "total_cash_required": total_cash_required,
        
        # Monthly Costs
        "monthly_pi": monthly_pi,
        "monthly_mip": monthly_mip,
        "monthly_piti": monthly_piti,
        
        # Scenario A: Rent Rooms
        "rooms_rented": rooms_rented,
        "room_rent": monthly_rent_per_room,
        "total_monthly_income": total_monthly_income,
        "utilities_shared": utilities_shared_monthly,
        "maintenance": maintenance_monthly,
        "total_monthly_expenses": total_monthly_expenses,
        "net_housing_cost_scenario_a": net_housing_cost_a,
        "savings_vs_renting_a": savings_vs_renting_a,
        "annual_savings_a": annual_savings_a,
        
        # Scenario B: Duplex Conversion
        "conversion_cost": conversion_cost,
        "unit2_rent": unit2_rent,
        "heloc_payment": heloc_payment,
        "net_housing_cost_scenario_b": net_housing_cost_b,
        "savings_vs_renting_b": savings_vs_renting_b,
        
        # Key Metrics
        "housing_cost_offset_pct": housing_cost_offset_pct,
        "live_free_threshold": live_free_threshold,
        "roi_on_savings": roi_on_savings
    }


# ============================================
# WHOLESALE CALCULATOR
# ============================================

def calculate_wholesale(
    arv: float,
    estimated_rehab_costs: float,
    assignment_fee: float = None,
    marketing_costs: float = None,
    earnest_money_deposit: float = None,
    arv_discount_pct: float = None,
    days_to_close: int = None,
    time_investment_hours: float = 50,
) -> Dict[str, Any]:
    # Apply centralized defaults for any unspecified values
    assignment_fee = assignment_fee if assignment_fee is not None else WHOLESALE.assignment_fee
    marketing_costs = marketing_costs if marketing_costs is not None else WHOLESALE.marketing_costs
    earnest_money_deposit = earnest_money_deposit if earnest_money_deposit is not None else WHOLESALE.earnest_money_deposit
    arv_discount_pct = arv_discount_pct if arv_discount_pct is not None else WHOLESALE.target_purchase_discount_pct
    days_to_close = days_to_close if days_to_close is not None else WHOLESALE.days_to_close
    """
    Calculate Wholesale Deal metrics.
    Based on '6. Wholesale' sheet from Excel.
    """
    
    # 70% Rule
    seventy_pct_max_offer = (arv * (1 - arv_discount_pct)) - estimated_rehab_costs
    
    # Deal Structure
    contract_price = seventy_pct_max_offer
    end_buyer_price = contract_price + assignment_fee
    
    # Costs
    total_cash_at_risk = earnest_money_deposit + marketing_costs
    
    # Profit
    gross_profit = assignment_fee
    net_profit = assignment_fee - marketing_costs
    
    # Key Metrics
    roi = net_profit / total_cash_at_risk if total_cash_at_risk > 0 else float('inf')
    annualized_roi = roi * (365 / days_to_close)
    effective_hourly_rate = net_profit / time_investment_hours if time_investment_hours > 0 else 0
    
    # Deal Analysis
    spread_available = arv - contract_price - estimated_rehab_costs
    
    if spread_available >= assignment_fee + 20000:  # $20k profit for buyer
        deal_viability = "Strong"
    elif spread_available >= assignment_fee + 10000:
        deal_viability = "Moderate"
    elif spread_available >= assignment_fee:
        deal_viability = "Tight"
    else:
        deal_viability = "Not Viable"
    
    # Income Projections
    net_profit_per_deal = net_profit
    deals_needed_50k = 50000 / net_profit_per_deal if net_profit_per_deal > 0 else float('inf')
    deals_needed_100k = 100000 / net_profit_per_deal if net_profit_per_deal > 0 else float('inf')
    
    return {
        # Deal Structure
        "contract_price": contract_price,
        "earnest_money": earnest_money_deposit,
        "assignment_fee": assignment_fee,
        "end_buyer_price": end_buyer_price,
        
        # Costs
        "marketing_costs": marketing_costs,
        "total_cash_at_risk": total_cash_at_risk,
        
        # Profit
        "gross_profit": gross_profit,
        "net_profit": net_profit,
        
        # Key Metrics
        "roi": roi,
        "annualized_roi": annualized_roi,
        "effective_hourly_rate": effective_hourly_rate,
        "time_investment_hours": time_investment_hours,
        
        # Deal Analysis
        "arv": arv,
        "estimated_rehab": estimated_rehab_costs,
        "seventy_pct_max_offer": seventy_pct_max_offer,
        "spread_available": spread_available,
        "deal_viability": deal_viability,
        
        # Income Projections
        "deals_needed_50k": deals_needed_50k,
        "deals_needed_100k": deals_needed_100k,
        
        # Timeline
        "timeline_days": days_to_close
    }


# ============================================
# SENSITIVITY ANALYSIS
# ============================================

def run_sensitivity_analysis(
    base_calculation_func,
    base_params: Dict[str, Any],
    variable_name: str,
    variations: List[float],
    output_metrics: List[str]
) -> List[Dict[str, Any]]:
    """
    Run sensitivity analysis on a single variable.
    """
    results = []
    base_value = base_params.get(variable_name, 0)
    
    for variation in variations:
        # Create modified params
        modified_params = base_params.copy()
        modified_value = base_value * (1 + variation)
        modified_params[variable_name] = modified_value
        
        # Run calculation
        calc_result = base_calculation_func(**modified_params)
        
        # Extract requested metrics
        result_row = {
            "variation": variation,
            "variable_value": modified_value,
        }
        for metric in output_metrics:
            result_row[metric] = calc_result.get(metric, None)
        
        results.append(result_row)
    
    return results


# ============================================
# DEAL OPPORTUNITY SCORE
# ============================================

"""
Deal Opportunity Score - Investment Price Indicator

The Deal Opportunity Score considers multiple factors to determine
how attractive a property is as an investment opportunity:

1. Deal Gap (50% weight) - ((List Price - Breakeven Price) / List Price) × 100
   - Breakeven is calculated from LTR strategy (market rent less property costs)
   - This is the primary factor as it indicates how much discount is needed

2. Availability Ranking (30% weight) - Based on listing status and motivation:
   - Withdrawn (best) - Seller motivation may be high
   - For Sale – Price Reduced 2+ Times - Seller showing flexibility
   - For Sale - Bank Owned/REO - Banks want to move properties
   - For Sale – FSBO/Individual - More negotiation room
   - For Sale - Agent Listed - Standard listing
   - Off-Market - May find motivated sellers
   - For Rent - Landlord may consider selling
   - Pending – Under Contract - Unlikely to get
   - Sold (Recently) - Not available

3. Days on Market (20% weight) - Combined with Deal Gap:
   - High Deal Gap + High DOM = More negotiation leverage
   - High Deal Gap + Low DOM = Opportunity not yet recognized
   - Low Deal Gap + High DOM = Price may already be fair

Note: Equity % is excluded as mortgage balance data is not available
from the Axesso API. This would require public records data.

Note: BRRRR, Fix & Flip, and Wholesale strategies require physical
inspection for repair estimates. The Deal Score is based on LTR
breakeven since it can be calculated from available market data.
"""


# Availability status rankings (lower = better opportunity)
AVAILABILITY_RANKINGS = {
    "WITHDRAWN": {"rank": 1, "score": 100, "label": "Withdrawn - High Motivation", "motivation": "high"},
    "PRICE_REDUCED": {"rank": 2, "score": 90, "label": "Price Reduced", "motivation": "high"},
    "BANK_OWNED": {"rank": 3, "score": 80, "label": "Bank Owned (REO)", "motivation": "high"},
    "FORECLOSURE": {"rank": 3, "score": 80, "label": "Foreclosure", "motivation": "high"},
    "FSBO": {"rank": 4, "score": 70, "label": "For Sale By Owner", "motivation": "medium"},
    "FOR_SALE": {"rank": 5, "score": 60, "label": "For Sale - Agent Listed", "motivation": "medium"},
    "OFF_MARKET": {"rank": 6, "score": 50, "label": "Off-Market", "motivation": "low"},
    "FOR_RENT": {"rank": 7, "score": 40, "label": "For Rent", "motivation": "low"},
    "PENDING": {"rank": 8, "score": 20, "label": "Pending - Under Contract", "motivation": "low"},
    "SOLD": {"rank": 9, "score": 10, "label": "Recently Sold", "motivation": "low"},
    "UNKNOWN": {"rank": 6, "score": 50, "label": "Unknown Status", "motivation": "low"},
}


def get_availability_ranking(
    listing_status: Optional[str] = None,
    seller_type: Optional[str] = None,
    is_foreclosure: bool = False,
    is_bank_owned: bool = False,
    is_fsbo: bool = False,
    price_reductions: int = 0,
) -> Dict[str, Any]:
    """
    Get availability ranking based on listing status and seller type.
    
    Returns dict with: status, rank, score, label, motivation_level
    """
    status = (listing_status or "").upper()
    seller = (seller_type or "").upper()
    
    # Check for withdrawn
    if "WITHDRAWN" in status:
        ranking = AVAILABILITY_RANKINGS["WITHDRAWN"]
        return {
            "status": "WITHDRAWN",
            **ranking
        }
    
    # Check for price reductions (2+ times = motivated)
    if ("FOR_SALE" in status or "SALE" in status) and price_reductions >= 2:
        ranking = AVAILABILITY_RANKINGS["PRICE_REDUCED"]
        return {
            "status": "PRICE_REDUCED",
            "rank": ranking["rank"],
            "score": ranking["score"],
            "label": f"Price Reduced {price_reductions}x",
            "motivation": ranking["motivation"]
        }
    
    # Check for bank owned / foreclosure
    if is_bank_owned or "BANK" in seller:
        ranking = AVAILABILITY_RANKINGS["BANK_OWNED"]
        return {"status": "BANK_OWNED", **ranking}
    
    if is_foreclosure or "FORECLOSURE" in seller:
        ranking = AVAILABILITY_RANKINGS["FORECLOSURE"]
        return {"status": "FORECLOSURE", **ranking}
    
    # Check for FSBO
    if is_fsbo or "FSBO" in seller or "OWNER" in seller:
        ranking = AVAILABILITY_RANKINGS["FSBO"]
        return {"status": "FSBO", **ranking}
    
    # Check for standard for sale
    if "FOR_SALE" in status or "SALE" in status:
        ranking = AVAILABILITY_RANKINGS["FOR_SALE"]
        return {"status": "FOR_SALE", **ranking}
    
    # Check for off-market
    if "OFF_MARKET" in status or "OFF" in status:
        ranking = AVAILABILITY_RANKINGS["OFF_MARKET"]
        return {"status": "OFF_MARKET", **ranking}
    
    # Check for rent
    if "FOR_RENT" in status or "RENT" in status:
        ranking = AVAILABILITY_RANKINGS["FOR_RENT"]
        return {"status": "FOR_RENT", **ranking}
    
    # Check for pending
    if "PENDING" in status or "CONTRACT" in status:
        ranking = AVAILABILITY_RANKINGS["PENDING"]
        return {"status": "PENDING", **ranking}
    
    # Check for sold
    if "SOLD" in status:
        ranking = AVAILABILITY_RANKINGS["SOLD"]
        return {"status": "SOLD", **ranking}
    
    # Unknown
    ranking = AVAILABILITY_RANKINGS["UNKNOWN"]
    return {"status": "UNKNOWN", **ranking}


def calculate_dom_score(
    days_on_market: Optional[int],
    deal_gap_percent: float,
) -> Dict[str, Any]:
    """
    Calculate Days on Market score with Deal Gap context.
    
    The relationship between DOM and Deal Gap:
    - High Deal Gap + High DOM = Strong negotiation leverage
    - High Deal Gap + Low DOM = Opportunity not yet recognized
    - Low Deal Gap + High DOM = Price may already be fair
    - Low Deal Gap + Low DOM = Hot property, move fast
    """
    if days_on_market is None:
        return {"days": None, "score": 50, "leverage": "unknown"}
    
    days = days_on_market
    
    # DOM thresholds (in days)
    LOW_DOM = 30
    MEDIUM_DOM = 60
    HIGH_DOM = 120
    
    # Deal Gap thresholds (in %)
    LOW_GAP = 10
    HIGH_GAP = 25
    
    if deal_gap_percent >= HIGH_GAP:
        # High Deal Gap - DOM increases leverage
        if days >= HIGH_DOM:
            return {"days": days, "score": 100, "leverage": "high"}
        elif days >= MEDIUM_DOM:
            return {"days": days, "score": 85, "leverage": "high"}
        elif days >= LOW_DOM:
            return {"days": days, "score": 70, "leverage": "medium"}
        else:
            return {"days": days, "score": 60, "leverage": "medium"}
    elif deal_gap_percent >= LOW_GAP:
        # Medium Deal Gap
        if days >= HIGH_DOM:
            return {"days": days, "score": 70, "leverage": "medium"}
        elif days >= MEDIUM_DOM:
            return {"days": days, "score": 60, "leverage": "medium"}
        elif days >= LOW_DOM:
            return {"days": days, "score": 50, "leverage": "medium"}
        else:
            return {"days": days, "score": 45, "leverage": "low"}
    else:
        # Low Deal Gap - already close to fair price
        if days >= HIGH_DOM:
            return {"days": days, "score": 50, "leverage": "low"}
        elif days >= MEDIUM_DOM:
            return {"days": days, "score": 40, "leverage": "low"}
        else:
            return {"days": days, "score": 30, "leverage": "low"}


def calculate_deal_gap_score(
    breakeven_price: float,
    list_price: float,
) -> Dict[str, Any]:
    """
    Calculate the Deal Gap score from breakeven and list price.
    
    Deal Gap = ((List Price - Breakeven Price) / List Price) × 100
    """
    if list_price <= 0:
        return {
            "breakeven_price": breakeven_price,
            "list_price": list_price,
            "gap_amount": 0,
            "gap_percent": 0,
            "score": 0
        }
    
    gap_amount = list_price - breakeven_price
    gap_percent = max(0, (gap_amount / list_price) * 100)
    
    # Score is inverse of gap (lower gap = higher score)
    # 0% gap = 100 score, 45%+ gap = 0 score
    score = max(0, min(100, round(100 - (gap_percent * 100 / 45))))
    
    return {
        "breakeven_price": breakeven_price,
        "list_price": list_price,
        "gap_amount": gap_amount,
        "gap_percent": gap_percent,
        "score": score
    }


def calculate_deal_opportunity_score(
    breakeven_price: float,
    list_price: float,
    listing_status: Optional[str] = None,
    seller_type: Optional[str] = None,
    is_foreclosure: bool = False,
    is_bank_owned: bool = False,
    is_fsbo: bool = False,
    is_auction: bool = False,
    price_reductions: int = 0,
    days_on_market: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Calculate comprehensive Deal Opportunity Score.
    
    Weights:
    - Deal Gap: 50% (primary factor - how much discount needed)
    - Availability: 30% (seller motivation and listing status)
    - Days on Market: 20% (negotiation leverage context)
    
    Args:
        breakeven_price: LTR breakeven price (from market rent less costs)
        list_price: Current list price (or estimated value if off-market)
        listing_status: Property listing status (FOR_SALE, OFF_MARKET, etc.)
        seller_type: Type of seller (Agent, FSBO, BankOwned, etc.)
        is_foreclosure: Whether property is a foreclosure
        is_bank_owned: Whether property is bank-owned/REO
        is_fsbo: Whether property is for sale by owner
        is_auction: Whether property is an auction listing
        price_reductions: Number of price reductions
        days_on_market: Days the property has been listed
    
    Returns:
        Dict with score, grade, label, color, and factor breakdowns
    """
    # Weights for composite score
    WEIGHTS = {
        "deal_gap": 0.50,
        "availability": 0.30,
        "days_on_market": 0.20
    }
    
    # Calculate Deal Gap score (50% weight)
    deal_gap = calculate_deal_gap_score(breakeven_price, list_price)
    
    # Calculate Availability score (30% weight)
    availability = get_availability_ranking(
        listing_status=listing_status,
        seller_type=seller_type,
        is_foreclosure=is_foreclosure,
        is_bank_owned=is_bank_owned,
        is_fsbo=is_fsbo,
        price_reductions=price_reductions,
    )
    
    # Calculate Days on Market score (20% weight)
    dom_score = calculate_dom_score(
        days_on_market=days_on_market,
        deal_gap_percent=deal_gap["gap_percent"]
    )
    
    # Calculate weighted composite score
    composite_score = round(
        (deal_gap["score"] * WEIGHTS["deal_gap"]) +
        (availability["score"] * WEIGHTS["availability"]) +
        (dom_score["score"] * WEIGHTS["days_on_market"])
    )
    
    # Determine grade and label based on composite score
    if composite_score >= 85:
        grade = "A+"
        label = "Strong Opportunity"
        color = "#22c55e"  # green-500
    elif composite_score >= 70:
        grade = "A"
        label = "Great Opportunity"
        color = "#22c55e"  # green-500
    elif composite_score >= 55:
        grade = "B"
        label = "Moderate Opportunity"
        color = "#84cc16"  # lime-500
    elif composite_score >= 40:
        grade = "C"
        label = "Potential Opportunity"
        color = "#f97316"  # orange-500
    elif composite_score >= 25:
        grade = "D"
        label = "Weak Opportunity"
        color = "#f97316"  # orange-500
    else:
        grade = "F"
        label = "Poor Opportunity"
        color = "#ef4444"  # red-500
    
    return {
        "score": composite_score,
        "grade": grade,
        "label": label,
        "color": color,
        "factors": {
            "deal_gap": deal_gap,
            "availability": availability,
            "days_on_market": dom_score,
            "weights": WEIGHTS
        },
        # Legacy compatibility
        "discount_percent": deal_gap["gap_percent"],
        "breakeven_price": breakeven_price,
        "list_price": list_price
    }


# ============================================
# SELLER MOTIVATION INDICATORS
# ============================================

"""
Seller Motivation Score - Investment Negotiation Leverage

Analyzes multiple data signals to determine seller motivation level
and potential negotiation leverage for investors.

INDICATORS (from Seller Motivation Indicators.csv):

HIGH Signal Strength (weight 3.0):
1. Days on Market (DOM) - Longer DOM = seller fatigue
2. Multiple Price Reductions - Failed pricing strategy
3. Expired/Withdrawn Listing - Failed to sell publicly
4. Pre-Foreclosure/Foreclosure - Financial distress
5. Poor Property Condition - Limited buyer pool (partial: text inference)

MEDIUM-HIGH Signal Strength (weight 2.5):
6. Absentee Ownership - Property treated as asset
7. Tenant Issues - (NOT AVAILABLE - requires property management data)

MEDIUM Signal Strength (weight 2.0):
8. Vacant Property - Carrying costs without utility (partial inference)
9. Out-of-State Owner - Distance reduces attachment
10. Recently Inherited - (PARTIAL - check for $0 last sale)

LOW Signal Strength (weight 1.0) - Counter-indicator:
11. Owner-Occupied, Well-Maintained - Strong resistance to discounts

NOT AVAILABLE (require external data sources):
- Estate/Probate Sale - Requires court records
- Tenant Issues - Requires property management data
"""


def calculate_seller_motivation(
    # Days on Market
    days_on_market: Optional[int] = None,
    market_median_dom: Optional[int] = None,
    # Price History
    price_reduction_count: int = 0,
    total_price_reduction_pct: Optional[float] = None,
    # Listing Status
    listing_status: Optional[str] = None,
    is_withdrawn: bool = False,
    # Distress Indicators
    is_foreclosure: bool = False,
    is_pre_foreclosure: bool = False,
    is_bank_owned: bool = False,
    is_auction: bool = False,
    # Ownership
    is_owner_occupied: Optional[bool] = None,
    is_absentee_owner: Optional[bool] = None,
    owner_state: Optional[str] = None,
    property_state: Optional[str] = None,
    # Vacancy (inferred)
    is_likely_vacant: Optional[bool] = None,
    # Condition (text-inferred)
    condition_keywords_found: Optional[List[str]] = None,
    # Inheritance indicator
    last_sale_price: Optional[float] = None,
    # Engagement metrics (from AXESSO)
    favorite_count: Optional[int] = None,
    page_view_count: Optional[int] = None,
    selling_soon_percentile: Optional[float] = None,
    # FSBO
    is_fsbo: bool = False,
    # Market context
    market_temperature: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Calculate comprehensive Seller Motivation Score.
    
    Returns a score from 0-100 with individual indicator breakdown.
    Higher score = more motivated seller = better negotiation leverage.
    """
    from datetime import datetime
    
    indicators = []
    
    # ========================================
    # 1. DAYS ON MARKET (HIGH - weight 3.0)
    # ========================================
    dom_indicator = {
        "name": "Days on Market",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": days_on_market,
        "source": "AXESSO"
    }
    
    if days_on_market is not None:
        dom_indicator["detected"] = True
        
        # Calculate DOM vs market average multiplier
        dom_multiplier = 1.0
        if market_median_dom and market_median_dom > 0:
            dom_multiplier = days_on_market / market_median_dom
        
        # Score based on absolute DOM and relative to market
        if days_on_market >= 180:
            dom_indicator["score"] = 100
            dom_indicator["signal_strength"] = "high"
            dom_indicator["description"] = f"{days_on_market} days - Extreme seller fatigue"
        elif days_on_market >= 120:
            dom_indicator["score"] = 85
            dom_indicator["signal_strength"] = "high"
            dom_indicator["description"] = f"{days_on_market} days - Very high seller fatigue"
        elif days_on_market >= 90:
            dom_indicator["score"] = 70
            dom_indicator["signal_strength"] = "high"
            dom_indicator["description"] = f"{days_on_market} days - High seller fatigue"
        elif days_on_market >= 60:
            dom_indicator["score"] = 55
            dom_indicator["signal_strength"] = "medium-high"
            dom_indicator["description"] = f"{days_on_market} days - Moderate seller fatigue"
        elif days_on_market >= 30:
            dom_indicator["score"] = 35
            dom_indicator["signal_strength"] = "medium"
            dom_indicator["description"] = f"{days_on_market} days - Some seller fatigue"
        else:
            dom_indicator["score"] = 15
            dom_indicator["signal_strength"] = "low"
            dom_indicator["description"] = f"{days_on_market} days - Fresh listing"
        
        # Boost score if significantly above market average
        if dom_multiplier >= 2.0:
            dom_indicator["score"] = min(100, dom_indicator["score"] + 15)
            dom_indicator["description"] += f" ({dom_multiplier:.1f}x market avg)"
    
    indicators.append(dom_indicator)
    
    # ========================================
    # 2. MULTIPLE PRICE REDUCTIONS (HIGH - weight 3.0)
    # ========================================
    price_red_indicator = {
        "name": "Price Reductions",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": price_reduction_count,
        "source": "AXESSO"
    }
    
    if price_reduction_count > 0:
        price_red_indicator["detected"] = True
        
        if price_reduction_count >= 3:
            price_red_indicator["score"] = 100
            price_red_indicator["signal_strength"] = "high"
            price_red_indicator["description"] = f"{price_reduction_count} price cuts - Very motivated"
        elif price_reduction_count == 2:
            price_red_indicator["score"] = 80
            price_red_indicator["signal_strength"] = "high"
            price_red_indicator["description"] = "2 price cuts - Seller adjusting expectations"
        else:
            price_red_indicator["score"] = 50
            price_red_indicator["signal_strength"] = "medium"
            price_red_indicator["description"] = "1 price cut - Initial adjustment"
        
        # Boost if total reduction is significant
        if total_price_reduction_pct and total_price_reduction_pct > 10:
            price_red_indicator["score"] = min(100, price_red_indicator["score"] + 10)
            price_red_indicator["description"] += f" (total {total_price_reduction_pct:.1f}% off)"
    
    indicators.append(price_red_indicator)
    
    # ========================================
    # 3. EXPIRED/WITHDRAWN LISTING (HIGH - weight 3.0)
    # ========================================
    withdrawn_indicator = {
        "name": "Withdrawn/Expired Listing",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": is_withdrawn,
        "source": "AXESSO"
    }
    
    status_upper = (listing_status or "").upper()
    if is_withdrawn or "WITHDRAWN" in status_upper or "EXPIRED" in status_upper:
        withdrawn_indicator["detected"] = True
        withdrawn_indicator["score"] = 95
        withdrawn_indicator["signal_strength"] = "high"
        withdrawn_indicator["description"] = "Previously listed but didn't sell - High motivation likely"
    
    indicators.append(withdrawn_indicator)
    
    # ========================================
    # 4. FORECLOSURE/DISTRESS (HIGH - weight 3.0)
    # ========================================
    foreclosure_indicator = {
        "name": "Foreclosure/Distress",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": None,
        "source": "AXESSO"
    }
    
    if is_pre_foreclosure:
        foreclosure_indicator["detected"] = True
        foreclosure_indicator["score"] = 100
        foreclosure_indicator["signal_strength"] = "high"
        foreclosure_indicator["description"] = "Pre-foreclosure - Urgent timeline, maximum leverage"
        foreclosure_indicator["raw_value"] = "pre-foreclosure"
    elif is_foreclosure:
        foreclosure_indicator["detected"] = True
        foreclosure_indicator["score"] = 95
        foreclosure_indicator["signal_strength"] = "high"
        foreclosure_indicator["description"] = "Foreclosure - Bank motivated to sell"
        foreclosure_indicator["raw_value"] = "foreclosure"
    elif is_bank_owned:
        foreclosure_indicator["detected"] = True
        foreclosure_indicator["score"] = 85
        foreclosure_indicator["signal_strength"] = "high"
        foreclosure_indicator["description"] = "REO/Bank-owned - Institution wants to clear inventory"
        foreclosure_indicator["raw_value"] = "bank-owned"
    elif is_auction:
        foreclosure_indicator["detected"] = True
        foreclosure_indicator["score"] = 80
        foreclosure_indicator["signal_strength"] = "high"
        foreclosure_indicator["description"] = "Auction listing - Seller seeking quick sale"
        foreclosure_indicator["raw_value"] = "auction"
    
    indicators.append(foreclosure_indicator)
    
    # ========================================
    # 5. ABSENTEE OWNERSHIP (MEDIUM-HIGH - weight 2.5)
    # ========================================
    absentee_indicator = {
        "name": "Absentee Ownership",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.5,
        "description": "",
        "raw_value": is_absentee_owner,
        "source": "AXESSO/RentCast"
    }
    
    if is_absentee_owner is True or is_owner_occupied is False:
        absentee_indicator["detected"] = True
        absentee_indicator["score"] = 70
        absentee_indicator["signal_strength"] = "medium-high"
        absentee_indicator["description"] = "Non-owner occupied - Treated as investment, less emotional"
    
    indicators.append(absentee_indicator)
    
    # ========================================
    # 6. OUT-OF-STATE OWNER (MEDIUM - weight 2.0)
    # ========================================
    out_of_state_indicator = {
        "name": "Out-of-State Owner",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.0,
        "description": "",
        "raw_value": None,
        "source": "RentCast"
    }
    
    if owner_state and property_state:
        if owner_state.upper() != property_state.upper():
            out_of_state_indicator["detected"] = True
            out_of_state_indicator["score"] = 65
            out_of_state_indicator["signal_strength"] = "medium"
            out_of_state_indicator["description"] = f"Owner in {owner_state} - Distance reduces attachment"
            out_of_state_indicator["raw_value"] = owner_state
    
    indicators.append(out_of_state_indicator)
    
    # ========================================
    # 7. VACANT PROPERTY (MEDIUM - weight 2.0) - Inferred
    # ========================================
    vacant_indicator = {
        "name": "Likely Vacant",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.0,
        "description": "",
        "raw_value": is_likely_vacant,
        "source": "Inferred"
    }
    
    if is_likely_vacant:
        vacant_indicator["detected"] = True
        vacant_indicator["score"] = 60
        vacant_indicator["signal_strength"] = "medium"
        vacant_indicator["description"] = "Likely vacant - Carrying costs without income"
    
    indicators.append(vacant_indicator)
    
    # ========================================
    # 8. POOR CONDITION (HIGH - weight 3.0) - Text inferred
    # ========================================
    condition_indicator = {
        "name": "Poor Condition",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 3.0,
        "description": "",
        "raw_value": condition_keywords_found,
        "source": "AXESSO (text analysis)"
    }
    
    if condition_keywords_found and len(condition_keywords_found) > 0:
        condition_indicator["detected"] = True
        keyword_count = len(condition_keywords_found)
        condition_indicator["score"] = min(100, 50 + (keyword_count * 15))
        condition_indicator["signal_strength"] = "high" if keyword_count >= 2 else "medium-high"
        keywords_str = ", ".join(condition_keywords_found[:3])
        condition_indicator["description"] = f"Condition keywords: {keywords_str}"
    
    indicators.append(condition_indicator)
    
    # ========================================
    # 9. RECENTLY INHERITED (MEDIUM - weight 2.0) - Partial
    # ========================================
    inherited_indicator = {
        "name": "Possibly Inherited",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.0,
        "description": "",
        "raw_value": last_sale_price,
        "source": "RentCast"
    }
    
    # $0 or $1 sale price often indicates gift/inheritance transfer
    if last_sale_price is not None and last_sale_price <= 100:
        inherited_indicator["detected"] = True
        inherited_indicator["score"] = 55
        inherited_indicator["signal_strength"] = "medium"
        inherited_indicator["description"] = f"Last sale at ${last_sale_price:.0f} - Possible inheritance/gift transfer"
    
    indicators.append(inherited_indicator)
    
    # ========================================
    # 10. FSBO (MEDIUM-HIGH - weight 2.5)
    # ========================================
    fsbo_indicator = {
        "name": "For Sale By Owner",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 2.5,
        "description": "",
        "raw_value": is_fsbo,
        "source": "AXESSO"
    }
    
    if is_fsbo:
        fsbo_indicator["detected"] = True
        fsbo_indicator["score"] = 65
        fsbo_indicator["signal_strength"] = "medium-high"
        fsbo_indicator["description"] = "FSBO - More direct negotiation, no agent buffer"
    
    indicators.append(fsbo_indicator)
    
    # ========================================
    # 11. OWNER-OCCUPIED (LOW - Counter indicator)
    # ========================================
    owner_occupied_indicator = {
        "name": "Owner-Occupied",
        "detected": False,
        "score": 0,
        "signal_strength": "low",
        "weight": 1.0,
        "description": "",
        "raw_value": is_owner_occupied,
        "source": "AXESSO/RentCast"
    }
    
    if is_owner_occupied is True:
        owner_occupied_indicator["detected"] = True
        owner_occupied_indicator["score"] = 20  # Low score = less motivated
        owner_occupied_indicator["signal_strength"] = "low"
        owner_occupied_indicator["description"] = "Owner-occupied - Emotional pricing likely, harder negotiation"
    
    indicators.append(owner_occupied_indicator)
    
    # ========================================
    # BONUS: Zillow Selling Soon Percentile
    # ========================================
    if selling_soon_percentile is not None:
        selling_soon_indicator = {
            "name": "Selling Soon Prediction",
            "detected": True,
            "score": int(selling_soon_percentile),
            "signal_strength": "high" if selling_soon_percentile >= 70 else "medium" if selling_soon_percentile >= 40 else "low",
            "weight": 2.0,
            "description": f"Zillow predicts {selling_soon_percentile:.0f}% likelihood to sell soon",
            "raw_value": selling_soon_percentile,
            "source": "AXESSO"
        }
        indicators.append(selling_soon_indicator)
    
    # ========================================
    # CALCULATE COMPOSITE SCORE
    # ========================================
    
    # Only include detected indicators in weighted average
    detected_indicators = [i for i in indicators if i["detected"]]
    
    if detected_indicators:
        total_weight = sum(i["weight"] for i in detected_indicators)
        weighted_sum = sum(i["score"] * i["weight"] for i in detected_indicators)
        composite_score = round(weighted_sum / total_weight) if total_weight > 0 else 0
    else:
        composite_score = 25  # Default low score if no indicators detected
    
    # Count high-signal indicators
    high_signals = sum(1 for i in detected_indicators if i["signal_strength"] == "high")
    
    # Determine grade
    if composite_score >= 80:
        grade = "A+"
        label = "Very High Motivation"
        color = "#22c55e"
    elif composite_score >= 65:
        grade = "A"
        label = "High Motivation"
        color = "#22c55e"
    elif composite_score >= 50:
        grade = "B"
        label = "Moderate Motivation"
        color = "#84cc16"
    elif composite_score >= 35:
        grade = "C"
        label = "Low Motivation"
        color = "#f97316"
    elif composite_score >= 20:
        grade = "D"
        label = "Very Low Motivation"
        color = "#f97316"
    else:
        grade = "F"
        label = "Minimal Motivation"
        color = "#ef4444"
    
    # Determine negotiation leverage
    if composite_score >= 70:
        leverage = "high"
        discount_range = "10-20%"
    elif composite_score >= 50:
        leverage = "medium"
        discount_range = "5-10%"
    elif composite_score >= 30:
        leverage = "low"
        discount_range = "2-5%"
    else:
        leverage = "minimal"
        discount_range = "0-3%"
    
    # Extract key leverage points (top 3 detected indicators by score)
    sorted_detected = sorted(detected_indicators, key=lambda x: x["score"], reverse=True)
    key_leverage_points = [i["description"] for i in sorted_detected[:3] if i["score"] >= 50]
    
    # Calculate data completeness
    total_indicator_count = len(indicators)
    indicators_with_data = sum(1 for i in indicators if i["raw_value"] is not None or i["detected"])
    data_completeness = (indicators_with_data / total_indicator_count) * 100 if total_indicator_count > 0 else 0
    
    return {
        "score": composite_score,
        "grade": grade,
        "label": label,
        "color": color,
        "indicators": indicators,
        "high_signals_count": high_signals,
        "total_signals_detected": len(detected_indicators),
        "negotiation_leverage": leverage,
        "recommended_discount_range": discount_range,
        "key_leverage_points": key_leverage_points,
        "dom_vs_market_avg": (days_on_market / market_median_dom) if days_on_market and market_median_dom else None,
        "market_temperature": market_temperature,
        "data_completeness": round(data_completeness, 1),
        "calculated_at": datetime.utcnow().isoformat()
    }


def extract_condition_keywords(description: Optional[str]) -> List[str]:
    """
    Extract keywords from property description that indicate poor condition.
    
    These keywords suggest the property needs work and may have a limited
    buyer pool, giving investors negotiation leverage.
    """
    if not description:
        return []
    
    # Normalize text
    text = description.lower()
    
    # Keywords indicating property needs work (investor opportunities)
    condition_keywords = [
        "as-is", "as is", "sold as-is", "sold as is",
        "fixer", "fixer-upper", "fixer upper", "handyman",
        "tlc", "needs tlc", "needs work", "needs updating",
        "investor special", "investor opportunity", "investor",
        "cash only", "cash buyers", "cash buyer",
        "estate sale", "estate", "probate",
        "motivated seller", "motivated", "must sell",
        "bring your contractor", "bring contractor",
        "cosmetic", "needs cosmetic",
        "deferred maintenance", "maintenance needed",
        "priced to sell", "price to sell",
        "diamond in the rough", "potential",
        "foreclosure", "bank owned", "reo",
        "vacant", "unoccupied",
    ]
    
    found_keywords = []
    for keyword in condition_keywords:
        if keyword in text:
            # Avoid duplicates (e.g., "as-is" and "as is")
            normalized = keyword.replace("-", " ").strip()
            if normalized not in [k.replace("-", " ") for k in found_keywords]:
                found_keywords.append(keyword)
    
    return found_keywords


def calculate_ltr_breakeven(
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    vacancy_rate: float = 0.01,
    maintenance_pct: float = 0.05,
    management_pct: float = 0.0,
    down_payment_pct: float = 0.20,
    interest_rate: float = 0.06,
    loan_term_years: int = 30,
) -> float:
    """
    Estimate breakeven purchase price for LTR based on basic property data.
    
    Breakeven is where monthly cash flow = $0
    At breakeven: NOI = Annual Debt Service
    
    Args:
        monthly_rent: Expected monthly rental income
        property_taxes: Annual property taxes
        insurance: Annual insurance cost
        vacancy_rate: Expected vacancy rate (default 1%)
        maintenance_pct: Maintenance as % of rent (default 5%)
        management_pct: Management as % of rent (default 0%)
        down_payment_pct: Down payment percentage (default 20%)
        interest_rate: Annual interest rate (default 6%)
        loan_term_years: Loan term in years (default 30)
    
    Returns:
        Breakeven purchase price
    """
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
    breakeven = noi / (ltv_ratio * mortgage_constant)
    
    return round(breakeven)
