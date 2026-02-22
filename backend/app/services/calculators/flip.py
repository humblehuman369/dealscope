"""Fix & Flip strategy calculator.

Pure calculation module — accepts only explicit, fully-resolved parameters.
No imports from app.core.defaults allowed.
"""
from typing import Dict, Any

from .common import validate_financial_inputs


def calculate_flip(
    market_value: float,
    arv: float,
    purchase_discount_pct: float,
    hard_money_ltv: float,
    hard_money_rate: float,
    closing_costs_pct: float,
    renovation_budget: float,
    contingency_pct: float,
    holding_period_months: float,
    property_taxes_annual: float,
    insurance_annual: float,
    utilities_monthly: float,
    selling_costs_pct: float,
    capital_gains_rate: float,
    inspection_costs: float = 1000,
    security_maintenance_monthly: float = 83,
) -> Dict[str, Any]:
    """Calculate Fix & Flip metrics.

    Every financial assumption is a required parameter — the caller
    (assumption_resolver) is responsible for merging user overrides
    with admin-dashboard defaults before invoking this function.
    """
    validate_financial_inputs(
        purchase_price=market_value,
        arv=arv,
        interest_rate=hard_money_rate,
        rehab_cost=renovation_budget,
        holding_period_months=int(holding_period_months) if holding_period_months else None,
    )

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
        hard_money_interest + property_taxes_holding + insurance_holding
        + utilities_total + security_maintenance
    )

    # Total Project Cost
    total_project_cost = (
        purchase_price + closing_costs + inspection_costs
        + total_renovation + total_holding_costs
    )

    # Total Cash Required
    total_cash_required = total_acquisition_cash + total_renovation + total_holding_costs

    # Sale — selling_costs_pct covers commission + seller closing combined
    total_selling_costs = arv * selling_costs_pct
    net_sale_proceeds = arv - total_selling_costs

    # Profit Analysis
    gross_profit = arv - total_project_cost
    net_profit_before_tax = net_sale_proceeds - total_project_cost
    capital_gains_tax = max(0, net_profit_before_tax * capital_gains_rate)
    net_profit_after_tax = net_profit_before_tax - capital_gains_tax

    # Key Metrics
    roi = net_profit_before_tax / total_cash_required if total_cash_required > 0 else 0
    annualized_roi = roi * (12 / holding_period_months) if holding_period_months > 0 else 0
    profit_margin = net_profit_before_tax / arv if arv > 0 else 0

    # 70% Rule Check
    seventy_pct_max_price = (arv * 0.70) - renovation_budget
    meets_70_rule = purchase_price <= seventy_pct_max_price

    # Breakeven sale price (minimum to cover project cost after selling costs)
    minimum_sale_for_breakeven = total_project_cost / (1 - selling_costs_pct) if selling_costs_pct < 1 else 0

    return {
        "purchase_price": purchase_price,
        "hard_money_loan": hard_money_loan,
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        "inspection_costs": inspection_costs,
        "total_acquisition_cash": total_acquisition_cash,
        "renovation_budget": renovation_budget,
        "contingency": contingency,
        "total_renovation": total_renovation,
        "hard_money_interest": hard_money_interest,
        "property_taxes": property_taxes_holding,
        "insurance": insurance_holding,
        "utilities": utilities_total,
        "security_maintenance": security_maintenance,
        "total_holding_costs": total_holding_costs,
        "arv": arv,
        "total_selling_costs": total_selling_costs,
        "net_sale_proceeds": net_sale_proceeds,
        "total_project_cost": total_project_cost,
        "gross_profit": gross_profit,
        "net_profit_before_tax": net_profit_before_tax,
        "capital_gains_tax": capital_gains_tax,
        "net_profit_after_tax": net_profit_after_tax,
        "roi": roi,
        "annualized_roi": annualized_roi,
        "profit_margin": profit_margin,
        "total_cash_required": total_cash_required,
        "seventy_pct_max_price": seventy_pct_max_price,
        "meets_70_rule": meets_70_rule,
        "minimum_sale_for_breakeven": minimum_sale_for_breakeven,
    }
