"""Subject-to (Sub2) heuristic template — take over seller's low-rate loan (v1, no public records)."""

from __future__ import annotations

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money, fmt_money_precise

FAMILY = "financing"
FAMILY_LABEL = "Take over the loan"
ID = "sub2"

# Evaluation year for amortization elapsed time (match server-side “today”).
CURRENT_YEAR = 2026


def _rate_for_purchase_year(year: int) -> float | None:
    """National average 30-yr fixed proxy by purchase year; None == skip template."""
    if year >= 2023:
        return None
    if year <= 2018:
        return 0.045
    mapping = {2019: 0.042, 2020: 0.034, 2021: 0.031, 2022: 0.048}
    return mapping.get(year)


def _remaining_balance(original_principal: float, annual_rate: float, years: int, payments_made: int) -> float:
    """Outstanding balance after ``payments_made`` monthly payments on a fixed-rate amortizing loan."""
    if original_principal <= 0:
        return 0.0
    n = years * 12
    k = max(0, min(n, payments_made))
    if annual_rate <= 0:
        return max(0.0, original_principal - original_principal * k / n)
    monthly_rate = annual_rate / 12.0
    factor_n = (1 + monthly_rate) ** n
    factor_k = (1 + monthly_rate) ** k
    return original_principal * (factor_n - factor_k) / (factor_n - 1)


def _build_sub2_pitch(
    *,
    ctx: StructureContext,
    assumed_rate: float,
    existing_pmt: float,
    implied_equity: float,
    data_source: str,
) -> str:
    """Negotiation script for a Subject-to deal.

    ``data_source`` is ``"public_records"`` when balance + rate come from records,
    or ``"heuristic"`` when we estimate from purchase year. Confidence framing differs.
    """
    if data_source == "public_records":
        bal_label = (
            fmt_money(ctx.estimated_existing_loan_balance)
            if ctx.estimated_existing_loan_balance
            else "the reported balance"
        )
        confidence_line = (
            f"Public records point to an existing loan of ~{bal_label} at "
            f"~{assumed_rate * 100:.2f}%. Verify the exact balance with the seller's most recent "
            "mortgage statement before signing."
        )
    else:
        confidence_line = (
            f"Based on the seller's likely purchase year, the existing loan is probably a "
            f"~{assumed_rate * 100:.1f}% fixed-rate note. Ask the seller for their last mortgage "
            "statement before signing — confirm rate, balance, and remaining term."
        )
    return (
        "WHO TO CALL\n"
        "The seller direct. This rarely works through a traditional listing agent — most agents "
        "don't understand Sub2 and will discourage the seller from considering it. If the property "
        "is FSBO or off-market, even better.\n\n"
        "PREP — TWO QUESTIONS YOU MUST ASK FIRST\n"
        "1. \"Do you have a mortgage on the property, and is the rate fixed?\" (Confirms the loan exists and is assumable in spirit.)\n"
        "2. \"On closing day, do you need to walk away with a big check, or is debt relief and a clean exit more important?\"\n"
        "   If they need a big cash check, Sub2 doesn't fit — pivot to a seller-second instead.\n\n"
        f"{confidence_line}\n\n"
        "THE OPEN — emotional discovery (Brent Daniels TTP style)\n"
        "Don't lead with the structure. Lead with their situation:\n"
        "\"Before I throw a number out, I want to understand what's going on. What's pushing the "
        "sale, and what would success look like for you on closing day? Are you trying to relocate, "
        "downsize, get out from under the payment, or something else entirely?\"\n\n"
        "(Listen for pain. Sub2 sells itself when you've heard the pain.)\n\n"
        "THE PITCH\n"
        "\"Here's a way I can help you that a normal buyer can't. I'd take over the existing "
        f"mortgage payments — the bank keeps getting paid the same {fmt_money_precise(existing_pmt)}/mo "
        "they've been receiving — but you're no longer responsible for them. The deed transfers to "
        "me at closing. The loan stays in your name on paper, but I'm contractually obligated to "
        "make every payment on time, and we paper that with an attorney so you have legal recourse "
        "if I don't.\"\n\n"
        "WHAT'S IN IT FOR THE SELLER (lead with this)\n"
        "1. A clean exit. No negotiating repairs, no inspection drama, no financing contingency.\n"
        "2. The mortgage gets paid every month, on time, by me. That keeps your credit strong.\n"
        "3. We close fast — no new loan to underwrite means 14-21 days, not 45.\n"
        f"4. You walk away with roughly {fmt_money(implied_equity)} of equity, less my closing "
        "costs. Yes, less than a retail sale — but a retail sale takes 60-90 days, requires "
        "showings, demands repairs, and a deal can fall apart at any point.\n\n"
        "ADDRESS THE FEAR — DUE-ON-SALE CLAUSE (do this BEFORE they ask)\n"
        "\"You may have heard of a 'due-on-sale' clause — it gives the bank the right to call the "
        "loan if title transfers. In practice, banks rarely call performing loans. They want their "
        "money — and they're getting it on time, every month. But here's how I protect you "
        "anyway: we put the property in a land trust before transfer (which doesn't trigger the "
        "clause), the bank receives the same payment from the same servicer it always has, and we "
        "set up a third-party servicing company so payments are documented. If I miss a payment, "
        "you can take the property back. We both have an attorney review the docs.\"\n\n"
        "ANTICIPATE OBJECTIONS\n"
        "\u2022 \"What if you stop paying?\" \u2192 \"You'd reclaim the property through the trust "
        "agreement and any payments I made stay with you. The downside risk to you is small.\"\n"
        "\u2022 \"What about the loan being in my name?\" \u2192 \"It stays on your credit report "
        "as a mortgage in good standing — that's actually positive for your credit. I have on-time "
        "payments documented through a third-party servicer.\"\n"
        "\u2022 \"How long until the loan is paid off / refinanced?\" \u2192 \"My plan is to refinance "
        "in 5-7 years when rates come down or the property cash-flows enough to qualify. We can "
        "agree to a maximum hold period in writing.\"\n\n"
        "THE ASK — soft yes/no\n"
        "\"Would you be open to walking through what this would look like on paper? I'll have my "
        "creative-finance attorney draft the agreement so we both know we're protected. No "
        "commitment from you until you've seen the structure and your attorney has signed off.\"\n\n"
        "TRIAL CLOSE\n"
        "\"What questions do you have about how this works for you?\"\n\n"
        "TACTICS\n"
        "\u2022 NEVER pitch Sub2 in the first 60 seconds. Build rapport, hear the pain, then offer the solution.\n"
        "\u2022 Use \"would you be open to...\" framing — soft yes/no that doesn't trigger defensiveness (Pace Morby).\n"
        "\u2022 Always reference an attorney. Sellers fear creative deals less when professional paper is involved.\n"
        "\u2022 Pace Morby's rule: \"If they hesitate, ask 'what part doesn't sit right?' — then handle THAT specific objection.\"\n"
        "\u2022 Use a third-party loan servicer (e.g., Note Servicing Center). Documentation is your protection AND the seller's."
    )


def solve(ctx: StructureContext) -> DealStructure | None:
    if ctx.deal_gap_amount <= 0:
        return None

    use_real = (
        ctx.estimated_existing_loan_balance is not None
        and ctx.estimated_existing_loan_balance > 0
        and ctx.estimated_existing_loan_rate is not None
        and ctx.estimated_existing_loan_rate > 0
    )

    if use_real:
        assumed_rate = float(ctx.estimated_existing_loan_rate)
        if assumed_rate >= ctx.interest_rate - 0.015:
            return None
        remaining_bal = float(ctx.estimated_existing_loan_balance)
        existing_pmt = calculate_monthly_mortgage(remaining_bal, assumed_rate, 30)
        monthly_savings = ctx.baseline_monthly_pi - existing_pmt
        if monthly_savings <= 0:
            return None
        implied_equity = max(0.0, ctx.list_price - remaining_bal)
        cash_required = round(0.80 * implied_equity + ctx.list_price * ctx.closing_costs_pct, 0)
        new_cf = ctx.baseline_monthly_cash_flow + monthly_savings
        if new_cf < 0:
            return None
        ranking = 78.0
        if ctx.days_on_market and ctx.days_on_market > 60:
            ranking += 10  # CALIBRATION PLACEHOLDER — refine via A/B test (see T17 / T15)
        if ctx.is_fsbo:
            ranking += 6  # CALIBRATION PLACEHOLDER
        if ctx.is_foreclosure or ctx.is_bank_owned:
            ranking -= 15
        if ctx.market_temperature and ctx.market_temperature.lower() == "cold":
            ranking += 5
        sel_reason = (
            f"Shown because records point to ~{fmt_money(remaining_bal)} at ~{assumed_rate * 100:.1f}% "
            "— cheaper debt service than a new loan at today's rates."
        )
        pitch = _build_sub2_pitch(
            ctx=ctx,
            assumed_rate=assumed_rate,
            existing_pmt=existing_pmt,
            implied_equity=implied_equity,
            data_source="public_records",
        )
        caveat = (
            "Confirm balance and assumption eligibility with the lender before you rely on these numbers. "
            "The bank can technically call the loan due (due-on-sale clause); it's rare in practice but real."
        )
        return DealStructure(
            id=ID,
            family=FAMILY,
            family_label=FAMILY_LABEL,
            realism_label="Lowest cost of capital",
            headline=f"Take over the seller's ~{assumed_rate * 100:.1f}% loan",
            summary=(
                f"Saves about {fmt_money(monthly_savings)}/mo on debt service vs a new loan at "
                f"{ctx.interest_rate * 100:.1f}%. Expect ~{fmt_money(cash_required)} cash toward seller equity."
            ),
            levers=[
                StructureLever(
                    label="Your new-loan P&I (baseline)",
                    before_label=f"${round(ctx.baseline_monthly_pi):,}",
                    after_label=f"${round(existing_pmt):,} (seller loan)",
                    delta_label=None,
                ),
                StructureLever(
                    label="Reported loan balance",
                    before_label="—",
                    after_label=fmt_money(remaining_bal),
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
                    "sub2_from_records": True,
                    "sub2_heuristic_rate": assumed_rate,
                    "sub2_heuristic_balance": remaining_bal,
                }
            },
        )

    if ctx.estimated_purchase_year is None:
        return None
    if ctx.estimated_purchase_price is None or ctx.estimated_purchase_price <= 0:
        return None

    assumed_rate = _rate_for_purchase_year(ctx.estimated_purchase_year)
    if assumed_rate is None:
        return None
    # Must be materially cheaper than buyer's new loan rate.
    if assumed_rate >= ctx.interest_rate - 0.015:
        return None

    orig_loan = ctx.estimated_purchase_price * 0.80
    years_elapsed = max(0, min(30, CURRENT_YEAR - ctx.estimated_purchase_year))
    pmts = years_elapsed * 12
    remaining_bal = _remaining_balance(orig_loan, assumed_rate, 30, pmts)
    if remaining_bal <= 0:
        return None

    # Seller's constant PI on original amortization (buyer assumes same payment).
    existing_pmt = calculate_monthly_mortgage(orig_loan, assumed_rate, 30)
    monthly_savings = ctx.baseline_monthly_pi - existing_pmt
    if monthly_savings <= 0:
        return None

    implied_equity = max(0.0, ctx.list_price - remaining_bal)
    cash_required = round(0.80 * implied_equity + ctx.list_price * ctx.closing_costs_pct, 0)

    new_cf = ctx.baseline_monthly_cash_flow + monthly_savings
    if new_cf < 0:
        return None

    ranking = 72.0
    if ctx.days_on_market and ctx.days_on_market > 60:
        ranking += 10  # CALIBRATION PLACEHOLDER — refine via A/B test (see T17 / T15)
    if ctx.is_fsbo:
        ranking += 6  # CALIBRATION PLACEHOLDER
    if ctx.is_foreclosure or ctx.is_bank_owned:
        ranking -= 15
    if ctx.market_temperature and ctx.market_temperature.lower() == "cold":
        ranking += 5

    sel_reason = (
        f"Shown because the seller likely bought in {ctx.estimated_purchase_year} "
        f"when rates were ~{assumed_rate * 100:.1f}%"
    )

    pitch = _build_sub2_pitch(
        ctx=ctx,
        assumed_rate=assumed_rate,
        existing_pmt=existing_pmt,
        implied_equity=implied_equity,
        data_source="heuristic",
    )

    caveat = (
        "Numbers assume the seller's original loan balance based on purchase year. "
        "Real balance may differ — confirm before making an offer. "
        "The bank can technically call the loan due (due-on-sale clause); it's rare in practice but real. "
        "Most Sub2 deals use a land trust or LLC structure — covered in Strategy."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="Lowest cost of capital",
        headline=f"Take over the seller's ~{assumed_rate * 100:.1f}% loan",
        summary=(
            f"Saves about {fmt_money(monthly_savings)}/mo on debt service vs a new loan at "
            f"{ctx.interest_rate * 100:.1f}%. Expect ~{fmt_money(cash_required)} cash toward seller equity."
        ),
        levers=[
            StructureLever(
                label="Your new-loan P&I (baseline)",
                before_label=f"${round(ctx.baseline_monthly_pi):,}",
                after_label=f"${round(existing_pmt):,} (seller loan)",
                delta_label=None,
            ),
            StructureLever(
                label="Est. loan balance",
                before_label="—",
                after_label=fmt_money(remaining_bal),
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
                "sub2_heuristic_rate": assumed_rate,
                "sub2_heuristic_balance": remaining_bal,
            }
        },
    )
