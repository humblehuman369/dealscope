"""Valuation snapshot — one bundle for NOI, Income Value, debt, and cash flow."""

from dataclasses import dataclass

from app.core.valuation.debt import annual_debt_service_at_price
from app.core.valuation.income_value import calculate_buy_price, estimate_income_value
from app.core.valuation.noi import NOIInputs, compute_noi
from app.core.valuation.rates import normalize_annual_rate

VALUATION_FORMULA_VERSION = 5


@dataclass(frozen=True)
class ValuationInputs:
    monthly_rent: float
    property_taxes: float
    insurance: float
    list_price: float
    purchase_price: float
    down_payment_pct: float
    interest_rate: float
    loan_term_years: int
    vacancy_rate: float
    maintenance_pct: float
    management_pct: float
    capex_pct: float = 0.0
    utilities_annual: float = 0.0
    other_annual_expenses: float = 0.0
    buy_discount_pct: float = 0.05
    seller_carry_amount: float = 0.0
    seller_carry_rate: float = 0.0
    seller_carry_term_years: int = 30
    other_income_annual: float = 0.0


def _pct_gap(numerator: float, denominator: float) -> float | None:
    if denominator <= 0:
        return None
    return (numerator - denominator) / denominator


def build_valuation_snapshot(inputs: ValuationInputs) -> dict:
    """Build a valuation snapshot dict (plain dict for Pydantic embedding)."""
    bank_rate = normalize_annual_rate(inputs.interest_rate)
    seller_rate = (
        normalize_annual_rate(inputs.seller_carry_rate, fallback=0.0)
        if inputs.seller_carry_amount > 0
        else 0.0
    )

    noi_result = compute_noi(
        NOIInputs(
            monthly_rent=inputs.monthly_rent,
            property_taxes=inputs.property_taxes,
            insurance=inputs.insurance,
            vacancy_rate=inputs.vacancy_rate,
            maintenance_pct=inputs.maintenance_pct,
            management_pct=inputs.management_pct,
            capex_pct=inputs.capex_pct,
            utilities_annual=inputs.utilities_annual,
            other_annual_expenses=inputs.other_annual_expenses,
            other_income_annual=inputs.other_income_annual,
        )
    )
    noi = noi_result.noi
    price = max(0.0, inputs.purchase_price)
    list_price = max(0.0, inputs.list_price)

    ref = price if price > 0 else list_price
    income_value = estimate_income_value(
        monthly_rent=inputs.monthly_rent,
        property_taxes=inputs.property_taxes,
        insurance=inputs.insurance,
        down_payment_pct=inputs.down_payment_pct,
        interest_rate=bank_rate,
        loan_term_years=inputs.loan_term_years,
        vacancy_rate=inputs.vacancy_rate,
        maintenance_pct=inputs.maintenance_pct,
        management_pct=inputs.management_pct,
        capex_pct=inputs.capex_pct,
        utilities_annual=inputs.utilities_annual,
        other_annual_expenses=inputs.other_annual_expenses,
        seller_carry_amount=inputs.seller_carry_amount,
        seller_carry_rate=seller_rate,
        seller_carry_term_years=inputs.seller_carry_term_years,
        reference_purchase_price=ref if ref > 0 else None,
    )

    target_buy = calculate_buy_price(
        market_price=list_price,
        monthly_rent=inputs.monthly_rent,
        property_taxes=inputs.property_taxes,
        insurance=inputs.insurance,
        buy_discount_pct=inputs.buy_discount_pct,
        down_payment_pct=inputs.down_payment_pct,
        interest_rate=bank_rate,
        loan_term_years=inputs.loan_term_years,
        vacancy_rate=inputs.vacancy_rate,
        maintenance_pct=inputs.maintenance_pct,
        management_pct=inputs.management_pct,
        capex_pct=inputs.capex_pct,
        utilities_annual=inputs.utilities_annual,
        other_annual_expenses=inputs.other_annual_expenses,
        seller_carry_amount=inputs.seller_carry_amount,
        seller_carry_rate=seller_rate,
        seller_carry_term_years=inputs.seller_carry_term_years,
    )

    if income_value > 0 and target_buy > income_value:
        target_buy = income_value

    annual_debt = annual_debt_service_at_price(
        price,
        inputs.down_payment_pct,
        bank_rate,
        inputs.loan_term_years,
        seller_carry_amount=inputs.seller_carry_amount,
        seller_carry_rate=seller_rate,
        seller_carry_term_years=inputs.seller_carry_term_years,
    )
    annual_cash_flow = noi - annual_debt
    monthly_cash_flow = annual_cash_flow / 12 if price > 0 else 0.0
    cap_rate_implied = (noi / price) if price > 0 else None

    iv = float(income_value) if income_value > 0 else None
    tb = float(target_buy) if target_buy > 0 else None

    return {
        "noi": round(noi),
        "income_value": iv,
        "target_buy_price": tb,
        "purchase_price": round(price),
        "annual_debt_service": round(annual_debt),
        "monthly_cash_flow": round(monthly_cash_flow, 2),
        "annual_cash_flow": round(annual_cash_flow),
        "cap_rate_implied": round(cap_rate_implied * 100, 2) if cap_rate_implied is not None else None,
        "price_gap_to_income_pct": _pct_gap(iv or 0, list_price) if iv and list_price > 0 else None,
        "target_vs_income_pct": _pct_gap(tb or 0, iv or 0) if tb and iv and iv > 0 else None,
        "list_vs_target_pct": _pct_gap(list_price, tb or 0) if tb and list_price > 0 else None,
        "formula_version": VALUATION_FORMULA_VERSION,
        "noi_expense_basis": noi_result.expense_basis,
        "annual_gross_rent": round(noi_result.annual_gross_rent),
        "effective_gross_income": round(noi_result.effective_gross_income),
        "operating_expenses": round(noi_result.operating_expenses),
    }
