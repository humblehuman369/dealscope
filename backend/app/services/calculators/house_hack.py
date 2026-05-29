"""House Hacking strategy calculator.

Pure calculation module — accepts only explicit, fully-resolved parameters.
No imports from app.core.defaults allowed.
"""

from typing import Any

from .common import (
    bank_loan_after_seller_carry,
    calculate_monthly_mortgage,
    combined_bank_and_seller_pi,
    validate_financial_inputs,
)


def calculate_house_hack(
    purchase_price: float,
    monthly_rent_per_room: float,
    rooms_rented: int,
    property_taxes_annual: float,
    down_payment_pct: float,
    interest_rate: float,
    loan_term_years: int,
    closing_costs_pct: float,
    fha_mip_rate: float,
    insurance_annual: float,
    owner_unit_market_rent: float = 1500,
    utilities_shared_monthly: float = 150,
    maintenance_monthly: float = 200,
    conversion_cost: float | None = None,
    unit2_rent: float | None = None,
    hoa_monthly: float = 0,
    seller_carry_amount: float = 0.0,
    seller_carry_rate: float = 0.0,
    seller_carry_term_years: int = 30,
) -> dict[str, Any]:
    """Calculate House Hacking metrics.

    Every financial assumption is a required parameter — the caller
    (assumption_resolver) is responsible for merging user overrides
    with admin-dashboard defaults before invoking this function.
    """
    validate_financial_inputs(
        purchase_price=purchase_price,
        monthly_rent=monthly_rent_per_room,
        interest_rate=interest_rate,
        down_payment_pct=down_payment_pct,
        loan_term_years=loan_term_years,
    )

    # Acquisition — seller carry replaces bank debt dollar-for-dollar.
    down_payment = purchase_price * down_payment_pct
    closing_costs = purchase_price * closing_costs_pct
    sc = max(0.0, float(seller_carry_amount or 0.0))
    loan_amount = bank_loan_after_seller_carry(purchase_price, down_payment, sc)
    # Sources & uses: cash equity = price − bank loan − seller note; cash to close adds
    # closing. May be negative when financing exceeds purchase + costs (cash back).
    cash_equity_at_close = max(0.0, purchase_price - loan_amount - sc)
    total_cash_required = purchase_price + closing_costs - loan_amount - sc

    # Monthly Costs — bank P&I + seller note; MIP on bank loan only
    bank_pi, seller_pi, monthly_pi = combined_bank_and_seller_pi(
        loan_amount,
        interest_rate,
        loan_term_years,
        sc,
        seller_carry_rate,
        seller_carry_term_years,
    )
    monthly_mip = (loan_amount * fha_mip_rate) / 12
    monthly_taxes = property_taxes_annual / 12
    monthly_insurance = insurance_annual / 12
    monthly_piti = monthly_pi + monthly_mip + monthly_taxes + monthly_insurance + hoa_monthly

    # Scenario A: Rent Rooms (seller_pi already inside monthly_pi combined — monthly_piti adds taxes/ins/MIP)
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
        heloc_rate = 0.08
        heloc_term = 10
        heloc_payment = calculate_monthly_mortgage(conversion_cost, heloc_rate, heloc_term)

        scenario_b_expenses = monthly_piti + heloc_payment + utilities_shared_monthly + (maintenance_monthly * 1.25)
        net_housing_cost_b = scenario_b_expenses - unit2_rent
        savings_vs_renting_b = owner_unit_market_rent - net_housing_cost_b

    # Key Metrics
    housing_cost_offset_pct = total_monthly_income / total_monthly_expenses if total_monthly_expenses > 0 else 0
    live_free_threshold = total_monthly_expenses
    roi_on_savings = annual_savings_a / total_cash_required if total_cash_required > 0 else 0

    return {
        "purchase_price": purchase_price,
        "down_payment": down_payment,
        "cash_equity_at_close": cash_equity_at_close,
        "closing_costs": closing_costs,
        "loan_amount": loan_amount,
        "seller_carry_amount": sc,
        "bank_monthly_pi": bank_pi,
        "seller_monthly_pi": seller_pi,
        "total_cash_required": total_cash_required,
        "monthly_pi": monthly_pi,
        "monthly_mip": monthly_mip,
        "monthly_hoa": hoa_monthly,
        "monthly_piti": monthly_piti,
        "rooms_rented": rooms_rented,
        "room_rent": monthly_rent_per_room,
        "total_monthly_income": total_monthly_income,
        "utilities_shared": utilities_shared_monthly,
        "maintenance": maintenance_monthly,
        "total_monthly_expenses": total_monthly_expenses,
        "net_housing_cost_scenario_a": net_housing_cost_a,
        "savings_vs_renting_a": savings_vs_renting_a,
        "annual_savings_a": annual_savings_a,
        "conversion_cost": conversion_cost,
        "unit2_rent": unit2_rent,
        "heloc_payment": heloc_payment,
        "net_housing_cost_scenario_b": net_housing_cost_b,
        "savings_vs_renting_b": savings_vs_renting_b,
        "housing_cost_offset_pct": housing_cost_offset_pct,
        "live_free_threshold": live_free_threshold,
        "roi_on_savings": roi_on_savings,
    }
