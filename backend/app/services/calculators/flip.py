"""Fix & Flip strategy calculator."""
from typing import Dict, Any

from .common import validate_financial_inputs, calculate_monthly_mortgage
from app.core.defaults import FINANCING, REHAB, FLIP, BRRRR, OPERATING


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
    """
    Calculate Fix & Flip metrics.
    Based on '4. Fix & Flip' sheet from Excel.
    """
    # Validate inputs
    validate_financial_inputs(
        purchase_price=market_value,
        arv=arv,
        interest_rate=hard_money_rate,
        rehab_cost=renovation_budget,
        holding_period_months=int(holding_period_months) if holding_period_months else None,
    )
    
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
    
    # Income Value (minimum sale price to cover project cost after selling costs)
    minimum_sale_for_income_value = total_project_cost / (1 - selling_costs_pct)
    
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
        
        # Income Value
        "minimum_sale_for_income_value": minimum_sale_for_income_value
    }
