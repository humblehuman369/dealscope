"""Short-Term Rental strategy calculator."""
from typing import Dict, Any

from .common import (
    validate_financial_inputs,
    calculate_monthly_mortgage,
    calculate_cap_rate,
    calculate_cash_on_cash,
    calculate_dscr,
)
from app.core.defaults import FINANCING, OPERATING, STR


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
    """
    Calculate Short-Term Rental metrics.
    Based on '2. Short-Term Rental' sheet from Excel.
    """
    # Validate inputs
    validate_financial_inputs(
        purchase_price=purchase_price,
        interest_rate=interest_rate,
        down_payment_pct=down_payment_pct,
        loan_term_years=loan_term_years,
    )
    
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
