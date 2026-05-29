"""Project monthly cash flow for deal-structure handoff (matches LTR verdict math)."""

from __future__ import annotations

from app.services.calculators.common import (
    bank_loan_after_seller_carry,
    combined_bank_and_seller_pi,
)
from app.services.deal_structures.context import StructureContext

# Cushion used by rent-uplift and path solvers.
TARGET_MONTHLY_CASH_FLOW = 25.0


def project_monthly_cash_flow(
    ctx: StructureContext,
    *,
    purchase_price: float,
    monthly_rent: float,
    seller_carry_amount: float = 0.0,
    seller_carry_rate: float = 0.0,
    seller_carry_term_years: int = 5,
    # Deal-structure seller carries are creative-finance 0% balloon notes (interest-only
    # until balloon), so this projection defaults to a deferred seller payment.
    seller_interest_only: bool = True,
) -> float:
    """Monthly cash flow after P&I at the given price, rent, and seller-carry terms."""
    if purchase_price <= 0:
        return 0.0

    down_payment = purchase_price * ctx.down_payment_pct
    sc = max(0.0, float(seller_carry_amount or 0.0))
    bank_loan = bank_loan_after_seller_carry(purchase_price, down_payment, sc)
    _, _, monthly_pi = combined_bank_and_seller_pi(
        bank_loan,
        ctx.interest_rate,
        ctx.loan_term_years,
        sc,
        seller_carry_rate,
        seller_carry_term_years,
        seller_interest_only=seller_interest_only,
    )

    annual_gross = monthly_rent * 12
    eff = annual_gross * (1 - ctx.vacancy_rate)
    opex = (
        ctx.property_taxes_annual
        + ctx.insurance_annual
        + annual_gross * ctx.maintenance_pct
        + annual_gross * ctx.management_pct
        + annual_gross * ctx.capex_pct
        + ctx.utilities_annual
        + ctx.other_annual_expenses
    )
    noi_monthly = (eff - opex) / 12
    return noi_monthly - monthly_pi


def rent_for_target_cash_flow(
    ctx: StructureContext,
    *,
    purchase_price: float,
    target_monthly_cf: float = TARGET_MONTHLY_CASH_FLOW,
    seller_carry_amount: float = 0.0,
    seller_carry_rate: float = 0.0,
    seller_carry_term_years: int = 5,
    seller_interest_only: bool = True,
    max_rent: float | None = None,
) -> float | None:
    """Closed-form rent (capped) that achieves ``target_monthly_cf`` at ``purchase_price``."""
    haircut = (1 - ctx.vacancy_rate) - (
        ctx.maintenance_pct + ctx.management_pct + ctx.capex_pct
    )
    if haircut <= 0:
        return None

    fixed_annual = (
        ctx.property_taxes_annual
        + ctx.insurance_annual
        + ctx.utilities_annual
        + ctx.other_annual_expenses
    )
    down_payment = purchase_price * ctx.down_payment_pct
    sc = max(0.0, float(seller_carry_amount or 0.0))
    bank_loan = bank_loan_after_seller_carry(purchase_price, down_payment, sc)
    _, _, monthly_pi = combined_bank_and_seller_pi(
        bank_loan,
        ctx.interest_rate,
        ctx.loan_term_years,
        sc,
        seller_carry_rate,
        seller_carry_term_years,
        seller_interest_only=seller_interest_only,
    )
    fixed_monthly = fixed_annual / 12 + monthly_pi
    required = (fixed_monthly + target_monthly_cf) / haircut
    floor = ctx.monthly_rent
    if max_rent is not None:
        required = min(required, max_rent)
    return max(floor, required)
