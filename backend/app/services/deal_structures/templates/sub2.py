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


def solve(ctx: StructureContext) -> DealStructure | None:
    if ctx.deal_gap_amount <= 0:
        return None
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

    pitch = (
        f"I'm structured to take over your existing financing around {assumed_rate * 100:.1f}% "
        f"instead of putting on a new loan at today’s rates. "
        f"My monthly payment lines up around ${existing_pmt:,.0f}/mo on the existing balance — "
        f"that’s how I make the cash flow work at {fmt_money_precise(ctx.list_price)}."
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
