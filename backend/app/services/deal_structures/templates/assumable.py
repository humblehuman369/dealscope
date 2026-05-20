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
        if (
            ctx.estimated_purchase_year is None
            or ctx.estimated_purchase_price is None
            or ctx.estimated_purchase_price <= 0
        ):
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
    headline = f"Assumable {lt} loan — worth ~{fmt_money(pv)} in today’s dollars vs a new loan"  # noqa: RUF001 — typographic apostrophe in user-facing copy
    summary = (
        f"Assuming the existing {note_rate * 100:.1f}% note saves about {fmt_money(monthly_savings)}/mo in payment "
        f"versus {ctx.interest_rate * 100:.1f}% new financing on the same balance."
    )

    equity_check = max(0.0, ctx.list_price - balance)
    va_warning = (
        "\n\nIMPORTANT IF VA: Only a VA-eligible buyer can assume a VA loan without affecting "
        "the seller's VA entitlement. If you're not VA-eligible and the seller plans to buy again "
        "with a VA loan, this can be a deal-breaker for them — bring it up early and discuss."
        if lt == "VA"
        else ""
    )
    pitch = (
        "WHO TO CALL\n"
        "Listing agent first. Many agents don't know that FHA, VA, and USDA loans are formally "
        "assumable — you may need to educate them. Then the seller's loan servicer (the agent or "
        "seller can request the assumption package).\n\n"
        "EDUCATE FIRST — most agents miss this\n"
        f"\"The seller's existing loan is {lt} — those are formally assumable by a qualified "
        "buyer. Has the seller looked into letting a buyer assume the loan instead of paying it "
        'off at closing? It changes the numbers significantly for both sides."\n\n'
        "WHY IT'S A WIN FOR THE SELLER (lead with this)\n"
        f"1. The property becomes attractive to a much larger buyer pool — buyers can take a "
        f"{note_rate * 100:.2f}% loan vs. originating new at {ctx.interest_rate * 100:.2f}%.\n"
        "2. The closing process is straightforward — the lender transfers the existing note "
        "instead of issuing new debt.\n"
        f"3. The seller still walks away with their full equity — approximately "
        f"{fmt_money(equity_check)} based on current market value vs. estimated loan balance.\n"
        "4. Faster close, fewer contingencies, less risk of falling out.\n\n"
        "WHY IT'S A WIN FOR YOU\n"
        f"Assuming the {note_rate * 100:.2f}% loan vs. originating new at "
        f"{ctx.interest_rate * 100:.2f}% saves about {fmt_money(monthly_savings)}/mo in payment "
        f"on the same balance. Over the remaining ~25-year term, that's worth roughly "
        f"{fmt_money_precise(pv)} in present value. Some of that savings can be passed back to the "
        "seller through stronger price or terms — don't be greedy.\n\n"
        "THE STRUCTURE OF THE OFFER\n"
        f'"My offer is to formally assume the existing {lt} loan at the current balance of '
        f"approximately {fmt_money(balance)}, plus a cash payment to the seller for their equity. "
        f"That equity check would be approximately {fmt_money(equity_check)} — call it gross "
        "equity less my standard closing costs and reserves. I'd close in 60-90 days to "
        "accommodate the lender's assumption underwriting.\"\n\n"
        "ANTICIPATE OBJECTIONS\n"
        '\u2022 "60-90 days is too long" \u2192 "It\'s slower than a regular sale, true. In '
        "exchange, you get a buyer who is fully qualified through the existing lender — almost no "
        "risk of falling out. And the seller's headline price stays whole because I'm not asking "
        'for a discount on price."\n'
        '\u2022 "Why should the seller bother?" \u2192 "Because most buyers can\'t bring this much '
        "cash AND get a loan at this rate. The seller is selling into a buyer pool of one — me. "
        "That's leverage for the seller, not for me.\"\n"
        '\u2022 "Will the lender approve you?" \u2192 "I\'ll submit my full credit and income '
        "package the day you accept the offer. The lender's underwriting is similar to a regular "
        "FHA approval — I've already been pre-qualified.\"\n\n"
        "TRIAL CLOSE\n"
        '"If the seller is open to letting me assume the loan, I can have a clean offer with proof '
        "of funds in your inbox within 24 hours. Should I get the assumption package started with "
        'the servicer in parallel?"\n\n'
        "TACTICS\n"
        "\u2022 Confirm the loan is currently assumable — call the servicer; some FHA loans pre-1989 are unrestricted, post-1989 require credit qualification.\n"
        "\u2022 Lock the property up early — 30-day inspection, then 60-90 day close to accommodate underwriting.\n"
        "\u2022 If the seller wants to buy again with another FHA, they may not want to let go of the loan — discuss timing of their next purchase.\n"
        f'\u2022 Get pre-qualified through an FHA-approved lender BEFORE you make the offer. "I\'m already pre-approved" is the strongest trust signal you can offer.'
        f"{va_warning}"
    )

    caveat = (
        # En dash for number range + typographic apostrophe — both are deliberate user-facing copy.
        "Loan assumption takes 60–90 days for the lender’s approval. Slower than a new mortgage. "  # noqa: RUF001
        "Worth the wait when the rate gap is this big."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="Best when assumable",
        headline=headline,
        bullets=[
            f"Assume the seller's {lt} loan at ~{note_rate * 100:.1f}%",
            f"Worth ~{fmt_money(pv)} in today's dollars",
        ],
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
            # Loan assumption preserves full asking price — buyer assumes the seller's
            # existing low-rate loan and pays the seller's equity in cash. Without
            # this, the worksheet's Target Buy would fall back to the LTR-discounted
            # price and contradict the pitch ("clean offer at full price").
            "custom_purchase_price": ctx.list_price,
            "pending_extras": {
                "three_paths_structure_id": ID,
                "assumable_pv_estimate": round(pv, 0),
                "existing_loan_type": lt,
            },
        },
    )
