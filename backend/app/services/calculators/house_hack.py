"""House Hacking strategy calculator."""
from typing import Dict, Any

from .common import validate_financial_inputs, calculate_monthly_mortgage
from app.core.defaults import FINANCING, OPERATING, HOUSE_HACK


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
    """
    Calculate House Hacking metrics.
    Based on '5. House Hacking' sheet from Excel.
    """
    # Validate inputs
    validate_financial_inputs(
        purchase_price=purchase_price,
        monthly_rent=monthly_rent_per_room,
        interest_rate=interest_rate,
        down_payment_pct=down_payment_pct,
        loan_term_years=loan_term_years,
    )
    
    # Apply centralized defaults for any unspecified values (FHA defaults for house hack)
    down_payment_pct = down_payment_pct if down_payment_pct is not None else HOUSE_HACK.fha_down_payment_pct
    interest_rate = interest_rate if interest_rate is not None else FINANCING.interest_rate
    loan_term_years = loan_term_years if loan_term_years is not None else FINANCING.loan_term_years
    closing_costs_pct = closing_costs_pct if closing_costs_pct is not None else FINANCING.closing_costs_pct
    fha_mip_rate = fha_mip_rate if fha_mip_rate is not None else HOUSE_HACK.fha_mip_rate
    insurance_annual = insurance_annual if insurance_annual is not None else purchase_price * OPERATING.insurance_pct
    
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
