"""Assumable FHA / VA / USDA — PV of rate-spread when existing loan type qualifies (T9 / Phase 3)."""

from __future__ import annotations

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money, fmt_money_precise
from app.services.deal_structures.templates import sub2 as sub2_mod

FAMILY = "financing"
FAMILY_LABEL = "Assume the loan"
ID = "assumable"

_QUALIFYING = {"FHA", "VA", "USDA"}
_REMAINING_MONTHS_PROXY = 25 * 12


def _pv_annuity_monthly(payment: float, annual_discount: float, months: int) -> float:
    if payment <= 0 or months <= 0:
        return 0.0
    r = annual_discount / 12.0
    if r <= 0:
        return payment * months
    return float(payment * (1.0 - (1.0 + r) ** (-months)) / r)


def solve(ctx: StructureContext) -> DealStructure | None:
    if ctx.deal_gap_amount <= 0:
        return None
    if not (ctx.existing_loan_type and str(ctx.existing_loan_type).upper() in _QUALIFYING):
        return None

    bal = ctx.estimated_existing_loan_balance
    rate = ctx.estimated_existing_loan_rate
    if bal is None or bal <= 0 or rate is None or rate <= 0:
        # Fall back to Sub2-style balance if we at least have a last sale
        if ctx.estimated_purchase_year is None or ctx.estimated_purchase_price is None or ctx.estimated_purchase_price <= 0:
            return None
        assumed_rate = sub2_mod._rate_for_purchase_year(ctx.estimated_purchase_year)
        if assumed_rate is None:
            return None
        rate = assumed_rate
        orig_loan = ctx.estimated_purchase_price * 0.80
        years_elapsed = max(0, min(30, sub2_mod.CURRENT_YEAR - ctx.estimated_purchase_year))
        bal = sub2_mod._remaining_balance(orig_loan, assumed_rate, 30, years_elapsed * 12)
        if bal <= 0:
            return None

    note_rate = float(rate)
    balance = float(bal)
    if note_rate >= ctx.interest_rate - 0.005:
        return None

    pmt_existing = calculate_monthly_mortgage(balance, note_rate, 30)
    pmt_new_same_balance = calculate_monthly_mortgage(balance, ctx.interest_rate, 30)
    monthly_savings = pmt_new_same_balance - pmt_existing
    if monthly_savings <= 0:
        return None

    pv = _pv_annuity_monthly(monthly_savings, ctx.interest_rate, _REMAINING_MONTHS_PROXY)
    if pv <= 0:
        return None

    down_cash = ctx.list_price * 0.035
    cash_required = round(down_cash + ctx.list_price * ctx.closing_costs_pct, 0)

    new_cf = ctx.baseline_monthly_cash_flow + (ctx.baseline_monthly_pi - pmt_existing)
    if new_cf < 0:
        return None

    ranking = 88.0
    if ctx.days_on_market and ctx.days_on_market > 60:
        ranking += 5
    if ctx.is_fsbo:
        ranking += 4
    if ctx.is_foreclosure or ctx.is_bank_owned:
        ranking -= 10

    lt = str(ctx.existing_loan_type).upper()
    sel_reason = f"Shown because the seller's loan is {lt} and may be assumable at ~{note_rate * 100:.1f}%"
    headline = f"Assumable {lt} loan — worth ~{fmt_money(pv)} in today’s dollars vs a new loan"
    summary = (
        f"Assuming the existing {note_rate * 100:.1f}% note saves about {fmt_money(monthly_savings)}/mo in payment "
        f"versus {ctx.interest_rate * 100:.1f}% new financing on the same balance."
    )

    pitch = (
        f"I'm pursuing a formal assumption of your existing {lt} loan at around {note_rate * 100:.1f}% "
        f"instead of replacing it with a new mortgage at today’s rates—that’s roughly "
        f"{fmt_money_precise(pv)} in present value compared to taking out new debt at {ctx.interest_rate * 100:.1f}%."
    )

    caveat = (
        "Loan assumption takes 60–90 days for the lender’s approval. Slower than a new mortgage. "
        "Worth the wait when the rate gap is this big."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="Best when assumable",
        headline=headline,
        summary=summary,
        levers=[
            StructureLever(
                label="Est. balance",
                before_label="—",
                after_label=fmt_money(balance),
                delta_label=None,
            ),
            StructureLever(
                label="Note vs market rate",
                before_label=f"{note_rate * 100:.2f}%",
                after_label=f"{ctx.interest_rate * 100:.2f}% new",
                delta_label=None,
            ),
            StructureLever(
                label="Payment @ same balance",
                before_label=f"${round(pmt_new_same_balance):,}/mo",
                after_label=f"${round(pmt_existing):,}/mo assumed",
                delta_label=None,
            ),
        ],
        monthly_savings=round(monthly_savings, 2),
        cash_required=float(cash_required),
        ranking_score=min(100.0, max(0.0, ranking)),
        pitch_script=pitch,
        caveat=caveat,
        selection_reason=sel_reason,
        pre_loaded_record={
            "pending_extras": {
                "three_paths_structure_id": ID,
                "assumable_pv_estimate": round(pv, 0),
                "existing_loan_type": lt,
            }
        },
    )
