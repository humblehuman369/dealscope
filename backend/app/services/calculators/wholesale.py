"""Wholesale strategy calculator."""
from typing import Dict, Any

from .common import validate_financial_inputs
from app.core.defaults import WHOLESALE


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
    """
    Calculate Wholesale Deal metrics.
    Based on '6. Wholesale' sheet from Excel.
    """
    # Validate inputs
    validate_financial_inputs(
        arv=arv,
        rehab_cost=estimated_rehab_costs,
        assignment_fee=assignment_fee,
    )
    
    # Apply centralized defaults for any unspecified values
    assignment_fee = assignment_fee if assignment_fee is not None else WHOLESALE.assignment_fee
    marketing_costs = marketing_costs if marketing_costs is not None else WHOLESALE.marketing_costs
    earnest_money_deposit = earnest_money_deposit if earnest_money_deposit is not None else WHOLESALE.earnest_money_deposit
    arv_discount_pct = arv_discount_pct if arv_discount_pct is not None else WHOLESALE.target_purchase_discount_pct
    days_to_close = days_to_close if days_to_close is not None else WHOLESALE.days_to_close
    
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
