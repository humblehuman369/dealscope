"""Rent uplift template — close the gap by verifying or improving rent."""

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money, fmt_money_precise, fmt_pct_delta

FAMILY = "income"
FAMILY_LABEL = "Rent increase"
ID = "rent-verification"

MAX_REALISTIC_BUMP_PCT = 0.20  # ranking / realism only — not applied to Target Rent math

# Cushion above $0 monthly CF at list price when Option 1 is applied on Strategy.
_TARGET_MONTHLY_CF_AT_LIST = 25.0


def _marginal_noi_per_rent_dollar(ctx: StructureContext) -> float | None:
    """Marginal monthly NOI per $1 of gross rent (vacancy + % opex on gross basis)."""
    haircut = (1 - ctx.vacancy_rate) - (ctx.maintenance_pct + ctx.management_pct + ctx.capex_pct)
    return haircut if haircut > 0 else None


def _required_rent_for_monthly_cf(ctx: StructureContext, target_monthly_cf: float) -> float | None:
    """Closed-form rent at list price that achieves ``target_monthly_cf`` after fixed opex + P&I."""
    haircut = _marginal_noi_per_rent_dollar(ctx)
    if haircut is None:
        return None
    fixed_annual = (
        ctx.property_taxes_annual
        + ctx.insurance_annual
        + ctx.utilities_annual
        + ctx.other_annual_expenses
    )
    fixed_monthly = fixed_annual / 12 + ctx.baseline_monthly_pi
    required = (fixed_monthly + target_monthly_cf) / haircut
    return max(ctx.monthly_rent, required)


def solve(ctx: StructureContext) -> DealStructure | None:
    """Solve for Target Rent that yields positive cash flow at Market (list) price."""
    if ctx.deal_gap_amount <= 0:
        return None
    if ctx.monthly_rent <= 0:
        return None

    haircut = _marginal_noi_per_rent_dollar(ctx)
    if haircut is None:
        return None

    required_rent = _required_rent_for_monthly_cf(ctx, _TARGET_MONTHLY_CF_AT_LIST)
    if required_rent is None:
        return None

    new_rent = required_rent
    actual_bump = new_rent - ctx.monthly_rent
    monthly_savings = actual_bump * haircut

    bump_pct = (actual_bump / ctx.monthly_rent) * 100 if ctx.monthly_rent > 0 else 0

    if bump_pct <= 5:
        ranking, realism_label = 84.0, "Verify the rent"
    elif bump_pct <= 12:
        ranking, realism_label = 66.0, "Light rent uplift"
    else:
        ranking, realism_label = 44.0, "Significant uplift"

    if ctx.is_listed:
        ranking -= 4  # listed properties usually have rent already set near market

    pitch = (
        "WHO TO CALL\n"
        "Yourself — this is due diligence, not negotiation. Then 2 local property managers, then "
        "the listing agent (only if rent is verified upward).\n\n"
        "THIS IS NOT A NEGOTIATION — IT'S DUE DILIGENCE\n"
        f"The deal works at full asking IF actual market rent is closer to "
        f"${round(new_rent):,}/mo (vs. the modeled ${round(ctx.monthly_rent):,}/mo — a "
        f"{bump_pct:.1f}% lift). Verify before you adjust your offer. Never raise your number on a "
        "rent assumption you haven't confirmed.\n\n"
        "VERIFICATION CHECKLIST — 60 MINUTES\n"
        "1. Rentometer / Zillow Rental Manager — pull comps within 1 mile, same beds/baths, same "
        "condition tier. Note the median, not the high.\n"
        "2. Call 2 local property managers. Script: \"I'm under contract on [address] and weighing "
        'what to charge. If I asked you to manage it, what would you list it at?" PMs underwrite '
        "rent for a living and tell you the truth — they want the listing.\n"
        "3. Walk 3 active rental listings nearby. Take photos. Honestly assess condition gap.\n"
        "4. If rehab is required to hit the higher rent, model the rehab cost AND the months of "
        "lost rent in Strategy before committing.\n\n"
        "IF VERIFIED \u2014 SEND THE OFFER AT ASKING\n"
        f'"My offer is at the asking price of {fmt_money_precise(ctx.list_price)}. My numbers '
        "work because I've verified market rent at "
        f"${round(new_rent):,}/mo with two local property managers and three active comps. Clean "
        'offer in your inbox today."\n\n'
        "IF NOT VERIFIED \u2014 PIVOT TO PRICE\n"
        f"\"Comps came in lighter than I'd hoped — closer to ${round(ctx.monthly_rent):,}/mo. To "
        "make the math work at that rent level, my number has to come down. What's the lowest the "
        'seller would entertain?"\n\n'
        "TACTICS\n"
        "\u2022 NEVER raise your offer based on a rent estimate from anyone who isn't willing to "
        "manage the unit themselves. Online estimates are starting points, not truth.\n"
        "\u2022 Property managers will sometimes inflate rent to win the listing — verify with at least 2.\n"
        "\u2022 If the rent gap is small (<5%), it's almost always a verification win. If it's "
        f"large (>{int(MAX_REALISTIC_BUMP_PCT * 100)}%), assume it requires rehab.\n"
        "\u2022 Short-term rental conversion can boost gross rent 30-80% in the right zip — "
        "explore the STR strategy in Strategy if zoning allows.\n"
        "\u2022 Always lock in a 14-day feasibility/inspection window so you can verify rent "
        "without risking your earnest deposit."
    )

    sel_reason = "Local market conditions are the key factors to support an increase."
    if bump_pct > 12:
        sel_reason = "The gap needs a larger rent lift — verify comps before leaning on this path."

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label=realism_label,
        headline=f"Target Rent → ${round(new_rent):,}",
        # Discovery card bullets — same three-row shape as other options (Market
        # Price, lever, 1st mortgage at list-price baseline).
        bullets=[
            f"Market Price: {fmt_money(ctx.list_price)}",
            f"Target Rent: ${round(new_rent):,}",
            f"1st Mortgage: {fmt_money(ctx.baseline_loan_amount)} @ {ctx.interest_rate * 100:.1f}%",
        ],
        # Compact closing line — points the user to the deeper tool instead of
        # restating the math already shown above.
        summary="Confirm local rent. Go to the Appraiser page in DealGapIQ.",
        levers=[
            StructureLever(
                label="Target Rent",
                # Show the rent bump inline so the math is self-evident:
                #   $5,764 + $25 → $5,791  +0.5%
                before_label=f"${round(ctx.monthly_rent):,} + ${round(actual_bump):,}",
                after_label=f"${round(new_rent):,}",
                delta_label=fmt_pct_delta(ctx.monthly_rent, new_rent),
            ),
        ],
        monthly_savings=round(monthly_savings, 2),
        cash_required=round(ctx.baseline_cash_required, 0),
        ranking_score=min(100.0, max(0.0, ranking)),
        pitch_script=pitch,
        caveat=(
            "Always verify rent with local comps before committing. "
            "If a rehab is required to get there, model the rehab cost in Strategy."
        ),
        selection_reason=sel_reason,
        pre_loaded_record={
            "custom_purchase_price": ctx.list_price,
            "custom_rent_estimate": new_rent,
        },
    )
