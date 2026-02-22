"""Short-Term Rental strategy calculator.

Pure calculation module — accepts only explicit, fully-resolved parameters.
No imports from app.core.defaults allowed.
"""
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

from .common import (
    validate_financial_inputs,
    calculate_monthly_mortgage,
    calculate_cap_rate,
    calculate_cash_on_cash,
    calculate_dscr,
)


@dataclass(frozen=True)
class SeasonConfig:
    """One season entry for STR seasonality analysis."""
    name: str
    months: int
    occupancy_multiplier: float
    adr_multiplier: float


DEFAULT_SEASONALITY: List[SeasonConfig] = [
    SeasonConfig(name="Peak (Winter)", months=5, occupancy_multiplier=0.90, adr_multiplier=1.2),
    SeasonConfig(name="Shoulder (Spring/Fall)", months=2, occupancy_multiplier=0.80, adr_multiplier=1.0),
    SeasonConfig(name="Off (Summer)", months=5, occupancy_multiplier=0.70, adr_multiplier=0.8),
]


def calculate_str(
    purchase_price: float,
    average_daily_rate: float,
    occupancy_rate: float,
    property_taxes_annual: float,
    down_payment_pct: float,
    interest_rate: float,
    loan_term_years: int,
    closing_costs_pct: float,
    furniture_setup_cost: float,
    platform_fees_pct: float,
    str_management_pct: float,
    cleaning_cost_per_turnover: float,
    cleaning_fee_revenue: float,
    avg_length_of_stay_days: int,
    supplies_monthly: float,
    additional_utilities_monthly: float,
    insurance_annual: float,
    maintenance_annual: float,
    landscaping_annual: float,
    pest_control_annual: float,
    hoa_monthly: float = 0,
    seasonality: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Calculate Short-Term Rental metrics.

    Every financial assumption is a required parameter — the caller
    (assumption_resolver) is responsible for merging user overrides
    with admin-dashboard defaults before invoking this function.
    """
    validate_financial_inputs(
        purchase_price=purchase_price,
        interest_rate=interest_rate,
        down_payment_pct=down_payment_pct,
        loan_term_years=loan_term_years,
    )

    # Acquisition
    down_payment = purchase_price * down_payment_pct
    closing_costs = purchase_price * closing_costs_pct
    total_cash_required = down_payment + closing_costs + furniture_setup_cost
    loan_amount = purchase_price - down_payment

    # Financing
    monthly_pi = calculate_monthly_mortgage(loan_amount, interest_rate, loan_term_years)
    annual_debt_service = monthly_pi * 12

    # Revenue
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
        property_taxes_annual
        + insurance_annual
        + platform_fees
        + str_management
        + cleaning_costs
        + supplies_annual
        + utilities_annual
        + maintenance_annual
        + landscaping_annual
        + pest_control_annual
        + hoa_annual
    )

    # Key Metrics
    noi = total_gross_revenue - total_operating_expenses
    annual_cash_flow = noi - annual_debt_service
    monthly_cash_flow = annual_cash_flow / 12

    cap_rate = calculate_cap_rate(noi, purchase_price)
    cash_on_cash = calculate_cash_on_cash(annual_cash_flow, total_cash_required)
    dscr = calculate_dscr(noi, annual_debt_service)
    revenue_per_night = total_gross_revenue / 365

    # Break-even occupancy
    fixed_costs = (
        property_taxes_annual + insurance_annual + maintenance_annual
        + landscaping_annual + pest_control_annual + hoa_annual + annual_debt_service
    )
    variable_cost_per_night = (
        (average_daily_rate * (platform_fees_pct + str_management_pct))
        + (cleaning_cost_per_turnover / avg_length_of_stay_days)
    )
    revenue_per_night_net = average_daily_rate - variable_cost_per_night
    break_even_nights = fixed_costs / revenue_per_night_net if revenue_per_night_net > 0 else 365
    break_even_occupancy = break_even_nights / 365

    # Seasonality Analysis
    seasons: List[SeasonConfig] = []
    if seasonality:
        seasons = [
            SeasonConfig(
                name=s.get("name", s.get("season", f"Season {i+1}")),
                months=s["months"],
                occupancy_multiplier=s.get("occupancy_multiplier", s.get("occupancy", 0.75)),
                adr_multiplier=s.get("adr_multiplier", 1.0),
            )
            for i, s in enumerate(seasonality)
        ]
    else:
        seasons = list(DEFAULT_SEASONALITY)

    seasonality_analysis = [
        {
            "season": sc.name,
            "months": sc.months,
            "occupancy": sc.occupancy_multiplier,
            "adr": average_daily_rate * sc.adr_multiplier,
            "revenue": average_daily_rate * sc.adr_multiplier * sc.occupancy_multiplier * (sc.months * 30),
        }
        for sc in seasons
    ]

    return {
        "average_daily_rate": average_daily_rate,
        "occupancy_rate": occupancy_rate,
        "nights_occupied": nights_occupied,
        "num_bookings": num_bookings,
        "rental_revenue": rental_revenue,
        "cleaning_fee_revenue": cleaning_fee_revenue_total,
        "total_gross_revenue": total_gross_revenue,
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
        "loan_amount": loan_amount,
        "monthly_pi": monthly_pi,
        "annual_debt_service": annual_debt_service,
        "noi": noi,
        "monthly_cash_flow": monthly_cash_flow,
        "annual_cash_flow": annual_cash_flow,
        "cap_rate": cap_rate,
        "cash_on_cash_return": cash_on_cash,
        "dscr": dscr,
        "revenue_per_available_night": revenue_per_night,
        "break_even_occupancy": break_even_occupancy,
        "total_cash_required": total_cash_required,
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        "furniture_setup": furniture_setup_cost,
        "seasonality_analysis": seasonality_analysis,
    }
