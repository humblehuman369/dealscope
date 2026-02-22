"""Core valuation formulas for DealGapIQ.

Pure functions — every parameter is required (no defaults imports).
The AssumptionResolver is responsible for providing resolved values.

Functions moved here from defaults.py to enforce separation between
"schema / seed defaults" and "calculation logic."
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _clamp(value: float, lo: float, hi: float, name: str) -> float:
    if value < lo:
        logger.warning("Input '%s' = %s below minimum %s — clamped", name, value, lo)
        return lo
    if value > hi:
        logger.warning("Input '%s' = %s above maximum %s — clamped", name, value, hi)
        return hi
    return value


def compute_market_price(
    is_listed: bool,
    list_price: Optional[float],
    zestimate: Optional[float],
    current_value_avm: Optional[float] = None,
    tax_assessed_value: Optional[float] = None,
) -> Optional[float]:
    """Compute Market Price for display and deal gap.

    Listed: Market Price = List Price.
    Off-market: Zestimate only (no blending).
    Sequential fallbacks when primary source unavailable.
    """
    if is_listed and list_price is not None and list_price > 0:
        return round(list_price)
    if zestimate is not None and zestimate > 0:
        return round(zestimate)
    if current_value_avm is not None and current_value_avm > 0:
        return round(current_value_avm)
    if tax_assessed_value is not None and tax_assessed_value > 0:
        return round(tax_assessed_value / 0.75)
    return None


def estimate_income_value(
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    down_payment_pct: float,
    interest_rate: float,
    loan_term_years: int,
    vacancy_rate: float,
    maintenance_pct: float,
    management_pct: float,
) -> float:
    """Income Value — the purchase price at which cash flow = $0.

    At this price, rental income exactly covers operating expenses
    and debt service (NOI = Annual Debt Service).
    Above this price, cash flow turns negative. Below it, positive.

    All parameters are required and fully resolved by the caller.
    """
    if monthly_rent is None or monthly_rent < 0:
        return 0
    if property_taxes is None or property_taxes < 0:
        property_taxes = 0
    if insurance is None or insurance < 0:
        insurance = 0

    down_pct = _clamp(down_payment_pct, 0.0, 1.0, "down_payment_pct")
    rate = _clamp(interest_rate, 0.0, 0.30, "interest_rate")
    term = max(1, min(loan_term_years, 50))
    vacancy = _clamp(vacancy_rate, 0.0, 1.0, "vacancy_rate")
    maint_pct = _clamp(maintenance_pct, 0.0, 1.0, "maintenance_pct")
    mgmt_pct = _clamp(management_pct, 0.0, 1.0, "management_pct")

    annual_gross_rent = monthly_rent * 12
    effective_gross_income = annual_gross_rent * (1 - vacancy)

    annual_maintenance = effective_gross_income * maint_pct
    annual_management = effective_gross_income * mgmt_pct
    operating_expenses = property_taxes + insurance + annual_maintenance + annual_management

    noi = effective_gross_income - operating_expenses
    if noi <= 0:
        return 0

    monthly_rate = rate / 12
    num_payments = term * 12
    ltv_ratio = 1 - down_pct

    if monthly_rate > 0:
        compounded = (1 + monthly_rate) ** num_payments
        if compounded <= 1:
            return 0
        mortgage_constant = (monthly_rate * compounded) / (compounded - 1) * 12
    else:
        mortgage_constant = 1 / term if term > 0 else 0

    denominator = ltv_ratio * mortgage_constant
    if denominator <= 0:
        return round(noi / 0.05)

    return round(noi / denominator)


def calculate_buy_price(
    market_price: float,
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    buy_discount_pct: float,
    down_payment_pct: float,
    interest_rate: float,
    loan_term_years: int,
    vacancy_rate: float,
    maintenance_pct: float,
    management_pct: float,
) -> float:
    """Target Buy Price = Income Value x (1 - Buy Discount %).

    All parameters required and fully resolved by the caller.
    Returns the lesser of the calculated buy price or market_price.
    """
    if market_price is None or market_price <= 0:
        return 0
    if monthly_rent is None or monthly_rent < 0:
        return market_price

    discount_pct = _clamp(buy_discount_pct, 0.0, 0.50, "buy_discount_pct")

    income_value = estimate_income_value(
        monthly_rent=monthly_rent,
        property_taxes=property_taxes,
        insurance=insurance,
        down_payment_pct=down_payment_pct,
        interest_rate=interest_rate,
        loan_term_years=loan_term_years,
        vacancy_rate=vacancy_rate,
        maintenance_pct=maintenance_pct,
        management_pct=management_pct,
    )

    if income_value <= 0:
        return market_price

    buy_price = round(income_value * (1 - discount_pct))
    return min(buy_price, market_price)
