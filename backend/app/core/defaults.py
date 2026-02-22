"""
Centralized Default Assumptions for DealGapIQ
All investment calculation defaults are defined here and used across the application.

These values align with the frontend stores/index.ts DEFAULT_ASSUMPTIONS.
Updated: January 2025 to reflect current market conditions and user preferences.
"""
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass(frozen=True)
class FinancingDefaults:
    """Default financing assumptions."""
    down_payment_pct: float = 0.20          # 20%
    interest_rate: float = 0.06             # 6% (was 7.5%)
    loan_term_years: int = 30
    closing_costs_pct: float = 0.03         # 3%


@dataclass(frozen=True)
class OperatingDefaults:
    """Default operating expense assumptions."""
    vacancy_rate: float = 0.01              # 1% (was 5%)
    property_management_pct: float = 0.00   # 0% (was 10%)
    maintenance_pct: float = 0.05           # 5% (was 10%)
    insurance_pct: float = 0.01             # 1% of purchase price (was $500 fixed)
    utilities_monthly: float = 100          # $100/mo (was $75)
    landscaping_annual: float = 0           # $0 (was $500)
    pest_control_annual: float = 200        # $200


@dataclass(frozen=True)
class SeasonConfig:
    """One season entry for STR seasonality analysis."""
    name: str
    months: int
    occupancy_multiplier: float
    adr_multiplier: float


# Temperate-climate defaults (e.g. Florida/Southeast US winter peak)
DEFAULT_SEASONALITY: List[SeasonConfig] = [
    SeasonConfig(name="Peak (Winter)", months=5, occupancy_multiplier=0.90, adr_multiplier=1.2),
    SeasonConfig(name="Shoulder (Spring/Fall)", months=2, occupancy_multiplier=0.80, adr_multiplier=1.0),
    SeasonConfig(name="Off (Summer)", months=5, occupancy_multiplier=0.70, adr_multiplier=0.8),
]


@dataclass(frozen=True)
class STRDefaults:
    """Default short-term rental assumptions."""
    platform_fees_pct: float = 0.15         # 15%
    str_management_pct: float = 0.10        # 10% (was 20%)
    cleaning_cost_per_turnover: float = 150 # $150 (was $200)
    cleaning_fee_revenue: float = 75        # $75
    avg_length_of_stay_days: int = 6        # 6 days
    supplies_monthly: float = 100           # $100
    additional_utilities_monthly: float = 0 # $0 (was $125)
    furniture_setup_cost: float = 6000      # $6,000
    str_insurance_pct: float = 0.01         # 1% of purchase price (was $1,500 fixed)
    seasonality: List[SeasonConfig] = field(default_factory=lambda: list(DEFAULT_SEASONALITY))


@dataclass(frozen=True)
class RehabDefaults:
    """Default rehab/renovation assumptions."""
    renovation_budget_pct: float = 0.05     # 5% of ARV (was $40,000 fixed)
    contingency_pct: float = 0.05           # 5% (was 10%)
    holding_period_months: int = 4          # 4 months
    holding_costs_pct: float = 0.01         # 1% of purchase price annually (was $2,000/mo fixed)


@dataclass(frozen=True)
class BRRRRDefaults:
    """Default BRRRR strategy assumptions."""
    buy_discount_pct: float = 0.05          # 5% below Income Value
    refinance_ltv: float = 0.75             # 75%
    refinance_interest_rate: float = 0.06   # 6% (was 7%)
    refinance_term_years: int = 30          # 30 years
    refinance_closing_costs_pct: float = 0.03  # 3% of refinance amount (was $3,500 fixed)
    post_rehab_rent_increase_pct: float = 0.10 # 10%


@dataclass(frozen=True)
class FlipDefaults:
    """Default fix & flip assumptions."""
    hard_money_ltv: float = 0.90            # 90%
    hard_money_rate: float = 0.12           # 12%
    selling_costs_pct: float = 0.08         # 8% (6% commission + 2% seller closing)
    holding_period_months: int = 6          # 6 months
    purchase_discount_pct: float = 0.20     # 20% below ARV for purchase


@dataclass(frozen=True)
class HouseHackDefaults:
    """Default house hack assumptions."""
    fha_down_payment_pct: float = 0.035     # 3.5%
    fha_interest_rate: float = 0.065        # 6.5% (FHA rates typically lower than conventional)
    fha_mip_rate: float = 0.0085            # 0.85%
    units_rented_out: int = 2               # 2 units
    buy_discount_pct: float = 0.05          # 5% below Income Value


@dataclass(frozen=True)
class WholesaleDefaults:
    """Default wholesale assumptions."""
    assignment_fee: float = 15000           # $15,000
    marketing_costs: float = 500            # $500
    earnest_money_deposit: float = 1000     # $1,000
    days_to_close: int = 45                 # 45 days
    target_purchase_discount_pct: float = 0.30  # 30%


@dataclass(frozen=True)
class GrowthDefaults:
    """Default growth rate assumptions."""
    appreciation_rate: float = 0.05         # 5%
    rent_growth_rate: float = 0.05          # 5% (was 3%)
    expense_growth_rate: float = 0.03       # 3%


# Create singleton instances
FINANCING = FinancingDefaults()
OPERATING = OperatingDefaults()
STR = STRDefaults()
REHAB = RehabDefaults()
BRRRR = BRRRRDefaults()
FLIP = FlipDefaults()
HOUSE_HACK = HouseHackDefaults()
WHOLESALE = WholesaleDefaults()
GROWTH = GrowthDefaults()

# Buy discount percentage below breakeven (5% = buy at 95% of breakeven)
DEFAULT_BUY_DISCOUNT_PCT = 0.05


def get_all_defaults() -> Dict[str, Any]:
    """
    Get all default assumptions as a dictionary.
    Useful for API responses.
    """
    return {
        "financing": {
            "down_payment_pct": FINANCING.down_payment_pct,
            "interest_rate": FINANCING.interest_rate,
            "loan_term_years": FINANCING.loan_term_years,
            "closing_costs_pct": FINANCING.closing_costs_pct,
        },
        "operating": {
            "vacancy_rate": OPERATING.vacancy_rate,
            "property_management_pct": OPERATING.property_management_pct,
            "maintenance_pct": OPERATING.maintenance_pct,
            "insurance_pct": OPERATING.insurance_pct,
            "utilities_monthly": OPERATING.utilities_monthly,
            "landscaping_annual": OPERATING.landscaping_annual,
            "pest_control_annual": OPERATING.pest_control_annual,
        },
        "str": {
            "platform_fees_pct": STR.platform_fees_pct,
            "str_management_pct": STR.str_management_pct,
            "cleaning_cost_per_turnover": STR.cleaning_cost_per_turnover,
            "cleaning_fee_revenue": STR.cleaning_fee_revenue,
            "avg_length_of_stay_days": STR.avg_length_of_stay_days,
            "supplies_monthly": STR.supplies_monthly,
            "additional_utilities_monthly": STR.additional_utilities_monthly,
            "furniture_setup_cost": STR.furniture_setup_cost,
            "str_insurance_pct": STR.str_insurance_pct,
        },
        "rehab": {
            "renovation_budget_pct": REHAB.renovation_budget_pct,
            "contingency_pct": REHAB.contingency_pct,
            "holding_period_months": REHAB.holding_period_months,
            "holding_costs_pct": REHAB.holding_costs_pct,
        },
        "brrrr": {
            "buy_discount_pct": BRRRR.buy_discount_pct,
            "refinance_ltv": BRRRR.refinance_ltv,
            "refinance_interest_rate": BRRRR.refinance_interest_rate,
            "refinance_term_years": BRRRR.refinance_term_years,
            "refinance_closing_costs_pct": BRRRR.refinance_closing_costs_pct,
            "post_rehab_rent_increase_pct": BRRRR.post_rehab_rent_increase_pct,
        },
        "flip": {
            "hard_money_ltv": FLIP.hard_money_ltv,
            "hard_money_rate": FLIP.hard_money_rate,
            "selling_costs_pct": FLIP.selling_costs_pct,
            "holding_period_months": FLIP.holding_period_months,
            "purchase_discount_pct": FLIP.purchase_discount_pct,
        },
        "house_hack": {
            "fha_down_payment_pct": HOUSE_HACK.fha_down_payment_pct,
            "fha_interest_rate": HOUSE_HACK.fha_interest_rate,
            "fha_mip_rate": HOUSE_HACK.fha_mip_rate,
            "units_rented_out": HOUSE_HACK.units_rented_out,
            "buy_discount_pct": HOUSE_HACK.buy_discount_pct,
        },
        "wholesale": {
            "assignment_fee": WHOLESALE.assignment_fee,
            "marketing_costs": WHOLESALE.marketing_costs,
            "earnest_money_deposit": WHOLESALE.earnest_money_deposit,
            "days_to_close": WHOLESALE.days_to_close,
            "target_purchase_discount_pct": WHOLESALE.target_purchase_discount_pct,
        },
        "growth": {
            "appreciation_rate": GROWTH.appreciation_rate,
            "rent_growth_rate": GROWTH.rent_growth_rate,
            "expense_growth_rate": GROWTH.expense_growth_rate,
        },
        "buy_discount_pct": DEFAULT_BUY_DISCOUNT_PCT,
    }


# Valuation formulas (compute_market_price, estimate_income_value,
# calculate_buy_price) have moved to app.core.formulas.
# Import them from there — NOT from this file.
