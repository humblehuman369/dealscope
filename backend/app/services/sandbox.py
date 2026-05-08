"""Activation Arc Phase 0 (B2) — Build Your Deal sandbox recompute service.

Pure function that recomputes the Deal Gap, motivating tier, cash flow, and
cash-to-close given user slider adjustments. Designed to be invoked on every
slider drag — no I/O, no DB, no external calls. Reuses the canonical
``estimate_income_value`` formula and ``calculate_monthly_mortgage`` helper
so the sandbox math stays identical to what Strategy and the verdict pipeline
produce given the same inputs.

See ``docs/feature-plans/ACTIVATION_ARC.md`` §5 for the doctrine. Also see
``app.schemas.sandbox`` for the request/response shapes.
"""

from __future__ import annotations

from app.core.formulas import estimate_income_value
from app.schemas.sandbox import (
    MotivatingLabel,
    SandboxAdjustments,
    SandboxBaseInputs,
    SandboxRequest,
    SandboxResponse,
)
from app.services.calculators import calculate_monthly_mortgage


def _motivating_label_for(deal_gap_pct: float) -> MotivatingLabel:
    """Map a Deal Gap % to its motivating tier label.

    Mirror of the frontend ``getDealGapTier`` thresholds in
    ``components/iq-verdict/types.ts``. Kept server-side so the sandbox
    endpoint can return the label directly — the frontend doesn't need to
    re-derive it on every slider drag.
    """
    if deal_gap_pct <= 0:
        return "Cash-Flow Deal"
    if deal_gap_pct <= 5:
        return "Negotiable Deal"
    if deal_gap_pct <= 10:
        return "Near Deal"
    if deal_gap_pct <= 20:
        return "Potential Deal"
    if deal_gap_pct <= 30:
        return "Structured Deal"
    return "Reset Deal"


def _resolve(
    base: SandboxBaseInputs, adjustments: SandboxAdjustments
) -> tuple[float, float, float, float]:
    """Apply slider adjustments to base inputs.

    Returns ``(price, rent, dp_pct, seller_carry)``. None values in
    ``adjustments`` fall through to the base values; seller_carry defaults
    to zero (no carry) when not provided.
    """
    price = adjustments.price if adjustments.price is not None else base.list_price
    rent = (
        adjustments.monthly_rent
        if adjustments.monthly_rent is not None
        else base.monthly_rent
    )
    dp_pct = (
        adjustments.down_payment_pct
        if adjustments.down_payment_pct is not None
        else base.down_payment_pct
    )
    seller_carry = adjustments.seller_carry_amount or 0.0
    # Seller carry can't legally exceed the price (defensive clamp).
    if price > 0 and seller_carry > price:
        seller_carry = price
    return price, rent, dp_pct, seller_carry


def recompute_gap(request: SandboxRequest) -> SandboxResponse:
    """Recompute the Deal Gap and tier given user slider adjustments.

    Pure function. Safe to invoke on every slider drag — no I/O, no DB,
    no external calls.

    Algorithm:
        1. Apply adjustments to base inputs.
        2. Recompute Income Value at the adjusted rent + financing assumptions.
        3. Compute Target Buy Price = Income Value × (1 - buy_discount_pct).
        4. Compute Deal Gap % = ((effective_price - target_buy_price) / effective_price) × 100.
        5. Compute monthly P&I on the bank loan (= price × (1 - dp_pct), reduced
           by seller_carry which is treated as a 0%-interest second note with
           no monthly cost — matches the existing seller_second_zero_balloon
           template's default structure).
        6. Compute monthly cash flow = NOI/12 - monthly P&I.
        7. Compute cash to close = (price × dp_pct + closing_costs) - seller_carry.

    Returns:
        SandboxResponse with the recomputed values and the matching motivating
        tier label.
    """
    base, adjustments = request.base, request.adjustments
    price, rent, dp_pct, seller_carry = _resolve(base, adjustments)

    # Step 1: recompute Income Value with adjusted rent + financing.
    income_value = estimate_income_value(
        monthly_rent=rent,
        property_taxes=base.property_taxes_annual,
        insurance=base.insurance_annual,
        down_payment_pct=dp_pct,
        interest_rate=base.interest_rate,
        loan_term_years=base.loan_term_years,
        vacancy_rate=base.vacancy_rate,
        maintenance_pct=base.maintenance_pct,
        management_pct=base.management_pct,
        capex_pct=base.capex_pct,
        utilities_annual=base.utilities_annual,
        other_annual_expenses=base.other_annual_expenses,
    )

    # Step 2: Target Buy Price.
    target_buy_price = round(income_value * (1 - base.buy_discount_pct))

    # Step 3: Deal Gap %.
    if price > 0:
        deal_gap_pct = ((price - target_buy_price) / price) * 100.0
    else:
        deal_gap_pct = 0.0

    # Step 4: monthly P&I on the bank loan (after seller carry reduction).
    bank_loan = max(0.0, price * (1 - dp_pct) - seller_carry)
    monthly_pi = (
        calculate_monthly_mortgage(bank_loan, base.interest_rate, base.loan_term_years)
        if bank_loan > 0
        else 0.0
    )

    # Step 5: monthly cash flow at the adjusted rent.
    annual_gross = rent * 12
    effective_gross = annual_gross * (1 - base.vacancy_rate)
    opex = (
        base.property_taxes_annual
        + base.insurance_annual
        + annual_gross * base.maintenance_pct
        + annual_gross * base.management_pct
        + annual_gross * base.capex_pct
        + base.utilities_annual
        + base.other_annual_expenses
    )
    noi_monthly = (effective_gross - opex) / 12
    monthly_cash_flow = noi_monthly - monthly_pi

    # Step 6: cash to close. Seller carry reduces buyer cash one-for-one.
    cash_required = max(
        0.0, price * (dp_pct + base.closing_costs_pct) - seller_carry
    )

    return SandboxResponse(
        deal_gap_pct=round(deal_gap_pct, 2),
        motivating_label=_motivating_label_for(deal_gap_pct),
        monthly_cash_flow=round(monthly_cash_flow, 2),
        monthly_pi=round(monthly_pi, 2),
        cash_required=round(cash_required, 0),
        income_value=round(income_value, 0),
        target_buy_price=target_buy_price,
    )
