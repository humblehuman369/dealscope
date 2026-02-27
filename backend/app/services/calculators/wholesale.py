"""Wholesale strategy calculator.

Pure calculation module — accepts only explicit, fully-resolved parameters.
No imports from app.core.defaults allowed.
"""

from typing import Any

from .common import validate_financial_inputs


def calculate_wholesale(
    arv: float,
    estimated_rehab_costs: float,
    assignment_fee: float,
    marketing_costs: float,
    earnest_money_deposit: float,
    arv_discount_pct: float,
    days_to_close: int,
    time_investment_hours: float = 50,
) -> dict[str, Any]:
    """Calculate Wholesale Deal metrics.

    Every financial assumption is a required parameter — the caller
    (assumption_resolver) is responsible for merging user overrides
    with admin-dashboard defaults before invoking this function.
    """
    validate_financial_inputs(
        arv=arv,
        rehab_cost=estimated_rehab_costs,
        assignment_fee=assignment_fee,
    )

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
    roi = net_profit / total_cash_at_risk if total_cash_at_risk > 0 else float("inf")
    annualized_roi = roi * (365 / days_to_close) if days_to_close > 0 else 0
    effective_hourly_rate = net_profit / time_investment_hours if time_investment_hours > 0 else 0

    # Deal Analysis
    spread_available = arv - contract_price - estimated_rehab_costs

    if spread_available >= assignment_fee + 20000:
        deal_viability = "Strong"
    elif spread_available >= assignment_fee + 10000:
        deal_viability = "Moderate"
    elif spread_available >= assignment_fee:
        deal_viability = "Tight"
    else:
        deal_viability = "Not Viable"

    # Income Projections
    deals_needed_50k = 50000 / net_profit if net_profit > 0 else float("inf")
    deals_needed_100k = 100000 / net_profit if net_profit > 0 else float("inf")

    # Breakeven assignment fee
    breakeven_assignment_fee = marketing_costs

    return {
        "contract_price": contract_price,
        "earnest_money": earnest_money_deposit,
        "assignment_fee": assignment_fee,
        "end_buyer_price": end_buyer_price,
        "marketing_costs": marketing_costs,
        "total_cash_at_risk": total_cash_at_risk,
        "gross_profit": gross_profit,
        "net_profit": net_profit,
        "roi": roi,
        "annualized_roi": annualized_roi,
        "effective_hourly_rate": effective_hourly_rate,
        "time_investment_hours": time_investment_hours,
        "arv": arv,
        "estimated_rehab": estimated_rehab_costs,
        "seventy_pct_max_offer": seventy_pct_max_offer,
        "spread_available": spread_available,
        "deal_viability": deal_viability,
        "deals_needed_50k": deals_needed_50k,
        "deals_needed_100k": deals_needed_100k,
        "timeline_days": days_to_close,
        "breakeven_assignment_fee": breakeven_assignment_fee,
    }
