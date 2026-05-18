"""Income Value — breakeven purchase price where cash flow ≈ $0."""

import logging

from app.core.defaults import DEFAULT_BUY_DISCOUNT_PCT, FINANCING, OPERATING
from app.core.valuation.debt import blended_income_value_denominator
from app.core.valuation.noi import NOIInputs, compute_noi
from app.core.valuation.rates import normalize_annual_rate

logger = logging.getLogger(__name__)


def _clamp(value: float, lo: float, hi: float, name: str) -> float:
    if value < lo:
        logger.warning("Input '%s' = %s below minimum %s — clamped", name, value, lo)
        return lo
    if value > hi:
        logger.warning("Input '%s' = %s above maximum %s — clamped", name, value, hi)
        return hi
    return value


def estimate_income_value(
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    down_payment_pct: float | None = None,
    interest_rate: float | None = None,
    loan_term_years: int | None = None,
    vacancy_rate: float | None = None,
    maintenance_pct: float | None = None,
    management_pct: float | None = None,
    capex_pct: float = 0.0,
    utilities_annual: float = 0.0,
    other_annual_expenses: float = 0.0,
    *,
    seller_carry_amount: float = 0.0,
    seller_carry_rate: float = 0.0,
    seller_carry_term_years: int = 30,
    reference_purchase_price: float | None = None,
) -> float:
    """Purchase price at which NOI covers annual debt service (cash flow ≈ $0).

    Pure cash (no debt denominator): NOI / 0.05 cap-rate floor.
    """
    if monthly_rent is None or monthly_rent < 0:
        return 0
    if property_taxes is None or property_taxes < 0:
        property_taxes = 0
    if insurance is None or insurance < 0:
        insurance = 0

    dp = down_payment_pct if down_payment_pct is not None else FINANCING.down_payment_pct
    rate_in = interest_rate if interest_rate is not None else FINANCING.interest_rate
    term_in = loan_term_years if loan_term_years is not None else FINANCING.loan_term_years
    vac_in = vacancy_rate if vacancy_rate is not None else OPERATING.vacancy_rate
    maint_in = maintenance_pct if maintenance_pct is not None else OPERATING.maintenance_pct
    mgmt_in = management_pct if management_pct is not None else OPERATING.property_management_pct

    down_pct = _clamp(dp, 0.0, 1.0, "down_payment_pct")
    rate = normalize_annual_rate(rate_in)
    term = max(1, min(term_in, 50))
    vacancy = _clamp(vac_in, 0.0, 1.0, "vacancy_rate")
    maint_pct = _clamp(maint_in, 0.0, 1.0, "maintenance_pct")
    mgmt_pct = _clamp(mgmt_in, 0.0, 1.0, "management_pct")
    cap_pct = _clamp(capex_pct, 0.0, 1.0, "capex_pct")

    noi_result = compute_noi(
        NOIInputs(
            monthly_rent=monthly_rent,
            property_taxes=property_taxes,
            insurance=insurance,
            vacancy_rate=vacancy,
            maintenance_pct=maint_pct,
            management_pct=mgmt_pct,
            capex_pct=cap_pct,
            utilities_annual=utilities_annual,
            other_annual_expenses=other_annual_expenses,
        )
    )
    noi = noi_result.noi
    if noi <= 0:
        return 0

    ref = reference_purchase_price
    denominator = blended_income_value_denominator(
        down_pct,
        rate,
        term,
        seller_carry_amount=seller_carry_amount,
        seller_carry_rate=seller_carry_rate,
        seller_carry_term_years=seller_carry_term_years,
        reference_purchase_price=ref,
    )
    if denominator <= 0:
        return round(noi / 0.05)

    return round(noi / denominator)


def calculate_buy_price(
    market_price: float,
    monthly_rent: float,
    property_taxes: float,
    insurance: float,
    buy_discount_pct: float | None = None,
    down_payment_pct: float | None = None,
    interest_rate: float | None = None,
    loan_term_years: int | None = None,
    vacancy_rate: float | None = None,
    maintenance_pct: float | None = None,
    management_pct: float | None = None,
    capex_pct: float = 0.0,
    utilities_annual: float = 0.0,
    other_annual_expenses: float = 0.0,
    *,
    seller_carry_amount: float = 0.0,
    seller_carry_rate: float = 0.0,
    seller_carry_term_years: int = 30,
) -> float:
    """Target Buy = Income Value × (1 − buy discount), capped at market price."""
    if market_price is None or market_price <= 0:
        return 0
    if monthly_rent is None or monthly_rent < 0:
        return market_price

    bd = buy_discount_pct if buy_discount_pct is not None else DEFAULT_BUY_DISCOUNT_PCT
    discount_pct = _clamp(bd, 0.0, 0.50, "buy_discount_pct")

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
        capex_pct=capex_pct,
        utilities_annual=utilities_annual,
        other_annual_expenses=other_annual_expenses,
        seller_carry_amount=seller_carry_amount,
        seller_carry_rate=seller_carry_rate,
        seller_carry_term_years=seller_carry_term_years,
        reference_purchase_price=market_price,
    )

    if income_value <= 0:
        return 0

    buy_price = round(income_value * (1 - discount_pct))
    return min(buy_price, market_price)
