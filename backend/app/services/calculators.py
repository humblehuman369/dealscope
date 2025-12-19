"""
Investment Strategy Calculators
All formulas derived from Property_Data_Analytics.xlsx
"""
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import math


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
    down_payment_pct: float = 0.20,
    interest_rate: float = 0.075,
    loan_term_years: int = 30,
    closing_costs_pct: float = 0.03,
    vacancy_rate: float = 0.05,
    property_management_pct: float = 0.10,
    maintenance_pct: float = 0.10,
    insurance_annual: float = 500,
    utilities_monthly: float = 75,
    landscaping_annual: float = 500,
    pest_control_annual: float = 200,
    appreciation_rate: float = 0.05,
    rent_growth_rate: float = 0.03,
    expense_growth_rate: float = 0.03,
) -> Dict[str, Any]:
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
    down_payment_pct: float = 0.25,
    interest_rate: float = 0.075,
    loan_term_years: int = 30,
    closing_costs_pct: float = 0.03,
    furniture_setup_cost: float = 6000,
    platform_fees_pct: float = 0.15,
    str_management_pct: float = 0.20,
    cleaning_cost_per_turnover: float = 200,
    cleaning_fee_revenue: float = 75,
    avg_length_of_stay_days: int = 6,
    supplies_monthly: float = 100,
    additional_utilities_monthly: float = 125,
    insurance_annual: float = 1500,
    maintenance_annual: float = 3500,
    landscaping_annual: float = 500,
    pest_control_annual: float = 200,
) -> Dict[str, Any]:
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
    purchase_discount_pct: float = 0.20,
    down_payment_pct: float = 0.20,
    interest_rate: float = 0.075,
    loan_term_years: int = 30,
    closing_costs_pct: float = 0.03,
    renovation_budget: float = 40000,
    contingency_pct: float = 0.10,
    holding_period_months: int = 4,
    monthly_holding_costs: float = 2000,
    refinance_ltv: float = 0.75,
    refinance_interest_rate: float = 0.07,
    refinance_term_years: int = 30,
    refinance_closing_costs: float = 3500,
    vacancy_rate: float = 0.05,
    operating_expense_pct: float = 0.35,
) -> Dict[str, Any]:
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
    operating_expenses = annual_gross_rent * operating_expense_pct
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
    purchase_discount_pct: float = 0.20,
    hard_money_ltv: float = 0.90,
    hard_money_rate: float = 0.12,
    closing_costs_pct: float = 0.03,
    inspection_costs: float = 1000,
    renovation_budget: float = 60500,
    contingency_pct: float = 0.10,
    holding_period_months: int = 6,
    property_taxes_annual: float = 4500,
    insurance_annual: float = 1500,
    utilities_monthly: float = 100,
    security_maintenance_monthly: float = 83,
    selling_costs_pct: float = 0.08,  # 6% commission + 2% closing
    capital_gains_rate: float = 0.15,
) -> Dict[str, Any]:
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
    annualized_roi = roi * (12 / holding_period_months)
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
    down_payment_pct: float = 0.035,  # FHA
    interest_rate: float = 0.065,
    loan_term_years: int = 30,
    closing_costs_pct: float = 0.03,
    fha_mip_rate: float = 0.0085,
    insurance_annual: float = 500,
    utilities_shared_monthly: float = 150,
    maintenance_monthly: float = 200,
    conversion_cost: float = None,  # For duplex conversion scenario
    unit2_rent: float = None,
) -> Dict[str, Any]:
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
    assignment_fee: float = 15000,
    marketing_costs: float = 500,
    earnest_money_deposit: float = 1000,
    arv_discount_pct: float = 0.30,  # 70% rule = 30% discount
    days_to_close: int = 45,
    time_investment_hours: float = 50,
) -> Dict[str, Any]:
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
