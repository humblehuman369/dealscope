"""Blended Plan (Path 4) — combine partial price reduction + seller 2nd + rent uplift.

Each lever owns a share of the monthly cash-flow gap, weighted by the individual
component template's realism score (`ranking_score`). When a lever caps out
(price floor at Target Buy, rent at +20%, seller 2nd at 20% of price), the
remainder bleeds onto the others until the gap closes or all three cap.

Honest gating: when caps prevent fully closing the gap, the card still renders
(per product decision: "always show as Path 4") but with an explicit caveat —
no fabricated numbers.

Not added to ``ALL_TEMPLATES`` — invoked from ``engine.py`` after selection.
"""

from __future__ import annotations

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.calculators import calculate_monthly_mortgage
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import (
    fmt_money,
    fmt_money_precise,
    fmt_monthly,
    fmt_pct_delta,
)
from app.services.deal_structures.templates.rent_uplift import (
    MAX_REALISTIC_BUMP_PCT as RENT_MAX_BUMP_PCT,
)
from app.services.deal_structures.templates.seller_second_zero_balloon import (
    DEFAULT_BALLOON_YEARS,
    MAX_SECOND_AS_PCT_OF_PRICE,
)

FAMILY = "blended"
FAMILY_LABEL = "Blended plan"
ID = "blended-plan"


def _price_savings_at(new_price: float, ctx: StructureContext) -> float:
    """Monthly P&I savings vs baseline if we negotiate to ``new_price``."""
    new_loan = max(0.0, new_price * (1 - ctx.down_payment_pct))
    new_pi = calculate_monthly_mortgage(new_loan, ctx.interest_rate, ctx.loan_term_years)
    return ctx.baseline_monthly_pi - new_pi


def _solve_price_for_savings(target: float, ctx: StructureContext) -> tuple[float, float]:
    """Bisection on price in [target_buy_price, list_price] for given monthly savings.

    Returns ``(new_price, achieved_savings)``. Caps at Target Buy (the floor) and
    list price (the ceiling — zero savings).
    """
    if target <= 0 or ctx.list_price <= 0:
        return ctx.list_price, 0.0
    floor = max(0.0, ctx.target_buy_price)
    ceil = ctx.list_price
    if floor >= ceil:
        return ceil, 0.0

    max_savings = _price_savings_at(floor, ctx)
    if target >= max_savings:
        return floor, max_savings

    lo, hi = floor, ceil
    new_price = ceil
    for _ in range(40):
        mid = (lo + hi) / 2
        savings = _price_savings_at(mid, ctx)
        if savings >= target:
            new_price = mid
            lo = mid
        else:
            hi = mid
    return new_price, _price_savings_at(new_price, ctx)


def _solve_seller_second_for_savings(target: float, ctx: StructureContext) -> tuple[float, float]:
    """Bisection on the seller-2nd principal for given monthly savings.

    The 2nd is interest-only at 0% (no monthly cost), so every dollar shifted
    from the bank loan to the 2nd reduces the bank-loan P&I.

    Returns ``(chosen_second, achieved_savings)``.
    """
    if target <= 0 or ctx.list_price <= 0:
        return 0.0, 0.0

    bank_loan = ctx.list_price * (1 - ctx.down_payment_pct)
    max_second = ctx.list_price * MAX_SECOND_AS_PCT_OF_PRICE

    def savings_at(second: float) -> float:
        new_bank = max(0.0, bank_loan - second)
        new_pi = calculate_monthly_mortgage(new_bank, ctx.interest_rate, ctx.loan_term_years)
        return ctx.baseline_monthly_pi - new_pi

    max_savings = savings_at(max_second)
    if target >= max_savings:
        return max_second, max_savings

    lo, hi = 0.0, max_second
    chosen = 0.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if savings_at(mid) >= target:
            chosen = mid
            hi = mid
        else:
            lo = mid
    return chosen, savings_at(chosen)


def _solve_rent_for_savings(target: float, ctx: StructureContext) -> tuple[float, float, float]:
    """Solve for the rent bump that delivers ``target`` monthly NOI savings, capped at +20%.

    Returns ``(new_rent, actual_bump, achieved_savings)``.
    """
    if target <= 0 or ctx.monthly_rent <= 0:
        return ctx.monthly_rent, 0.0, 0.0
    haircut = (1 - ctx.vacancy_rate) - (ctx.maintenance_pct + ctx.management_pct + ctx.capex_pct)
    if haircut <= 0:
        return ctx.monthly_rent, 0.0, 0.0
    needed = target / haircut
    max_bump = ctx.monthly_rent * RENT_MAX_BUMP_PCT
    actual = min(needed, max_bump)
    return ctx.monthly_rent + actual, actual, actual * haircut


def _max_savings(ctx: StructureContext) -> tuple[float, float, float]:
    """Cap at full lever reach for each component (used by cap-bleed)."""
    p = _price_savings_at(max(0.0, ctx.target_buy_price), ctx)

    bank_loan = ctx.list_price * (1 - ctx.down_payment_pct)
    max_second = ctx.list_price * MAX_SECOND_AS_PCT_OF_PRICE
    new_bank = max(0.0, bank_loan - max_second)
    f = ctx.baseline_monthly_pi - calculate_monthly_mortgage(new_bank, ctx.interest_rate, ctx.loan_term_years)

    haircut = (1 - ctx.vacancy_rate) - (ctx.maintenance_pct + ctx.management_pct + ctx.capex_pct)
    r = ctx.monthly_rent * RENT_MAX_BUMP_PCT * max(0.0, haircut)
    return max(0.0, p), max(0.0, f), max(0.0, r)


def _allocate_with_bleed(
    gap: float,
    weights: tuple[float, float, float],
    caps: tuple[float, float, float],
) -> tuple[float, float, float]:
    """Apportion ``gap`` across three buckets by weight, redistributing capped overflow.

    Returns each bucket's assigned target (clamped to its cap). If total caps < gap,
    each bucket maxes out (best-effort).
    """
    if gap <= 0:
        return 0.0, 0.0, 0.0

    targets = list(weights)
    cap_list = list(caps)

    if sum(targets) <= 0:
        targets = [1.0 if c > 0 else 0.0 for c in cap_list]
        if sum(targets) <= 0:
            return 0.0, 0.0, 0.0

    assigned = [0.0, 0.0, 0.0]
    remaining = gap
    active = [i for i in range(3) if cap_list[i] > 0 and targets[i] > 0]

    for _ in range(4):
        if remaining <= 1e-6 or not active:
            break
        weight_sum = sum(targets[i] for i in active)
        if weight_sum <= 0:
            break
        next_active: list[int] = []
        for i in active:
            share = remaining * (targets[i] / weight_sum)
            slack = cap_list[i] - assigned[i]
            take = min(share, slack)
            assigned[i] += take
            if cap_list[i] - assigned[i] > 1e-6:
                next_active.append(i)
        consumed = sum(assigned) - (gap - remaining)
        remaining = max(0.0, gap - sum(assigned))
        active = next_active
        # Stop if no progress
        if consumed <= 1e-6:
            break

    return assigned[0], assigned[1], assigned[2]


def solve(
    ctx: StructureContext,
    *,
    price_result: DealStructure | None,
    seller2nd_result: DealStructure | None,
    rent_result: DealStructure | None,
) -> DealStructure | None:
    """Build the Blended Plan card. Returns ``None`` only when ``deal_gap_amount <= 0``."""
    if ctx.deal_gap_amount <= 0:
        return None
    if ctx.list_price <= 0:
        return None

    # Monthly cash-flow gap to close + small cushion (matches existing templates).
    gap = max(0.0, -ctx.baseline_monthly_cash_flow) + 25

    # Realism weights — None component means weight 0.
    w_p = float(price_result.ranking_score) if price_result else 0.0
    w_f = float(seller2nd_result.ranking_score) if seller2nd_result else 0.0
    w_r = float(rent_result.ranking_score) if rent_result else 0.0
    weights = (w_p, w_f, w_r)

    caps = _max_savings(ctx)
    target_p, target_f, target_r = _allocate_with_bleed(gap, weights, caps)

    new_price, savings_p = _solve_price_for_savings(target_p, ctx)
    chosen_second, savings_f = _solve_seller_second_for_savings(target_f, ctx)
    new_rent, rent_bump, savings_r = _solve_rent_for_savings(target_r, ctx)

    monthly_savings = round(savings_p + savings_f + savings_r, 2)
    if monthly_savings <= 0:
        return None

    # Cash to close: price drop reduces it; seller carry stays in 1st/2nd ratio.
    cash_required = round(new_price * (ctx.down_payment_pct + ctx.closing_costs_pct), 0)

    closes_gap = monthly_savings + 1e-6 >= gap
    realism_label = "Combined plan" if closes_gap else "Best-effort combination"

    # Realism score: weighted average of contributing components + small bonus.
    contrib_scores: list[float] = []
    if price_result:
        contrib_scores.append(price_result.ranking_score)
    if seller2nd_result:
        contrib_scores.append(seller2nd_result.ranking_score)
    if rent_result:
        contrib_scores.append(rent_result.ranking_score)
    base_score = sum(contrib_scores) / len(contrib_scores) if contrib_scores else 50.0
    ranking = min(100.0, max(0.0, base_score + (3.0 if closes_gap else -8.0)))

    bump_pct = (rent_bump / ctx.monthly_rent * 100) if ctx.monthly_rent > 0 else 0.0
    price_pct = ((ctx.list_price - new_price) / ctx.list_price * 100) if ctx.list_price > 0 else 0.0

    headline = (
        f"Blend: {price_pct:.1f}% price cut + {fmt_money(chosen_second)} seller 2nd + "
        f"{bump_pct:.1f}% rent lift"
    )
    # Bullets carry the full math for the blended card (no separate lever block on the card).
    # Each bullet uses the "Label: before → after" pattern for at-a-glance scanning.
    bullets = [
        f"Target price:\u00A0{fmt_money(ctx.list_price)} → {fmt_money(new_price)}",
        f"Seller 2nd:\u00A0{fmt_money(chosen_second)} → 0%, {DEFAULT_BALLOON_YEARS}yr balloon",
        f"Target Rent:\u00A0${round(ctx.monthly_rent):,} → ${round(new_rent):,}  +{bump_pct:.1f}%",
    ]
    # Combined selection-reason + savings so the card only renders one supporting paragraph.
    summary = (
        "Real deals usually combine moves — a smaller price cut, a partial seller carry, "
        "and a modest rent lift can clear the gap together when no single lever wants to do it alone. "
        f"Together they save about {fmt_monthly(monthly_savings)} vs the baseline."
    )
    if not closes_gap:
        summary += (
            " This combination gets close — the remaining gap likely needs rehab, "
            "a strategy switch, or a deeper concession on one lever."
        )

    # Selection-reason is preserved for downstream consumers (PDF, Strategy,
    # accessibility). The verdict card renderer suppresses it for blended plans
    # because the summary below already carries the same thesis.
    sel_reason = (
        "Real deals usually combine moves — a smaller price cut, a partial seller carry, "
        "and a modest rent lift can clear the gap together when no single lever wants to do it alone."
    )

    pitch = (
        "WHO TO CALL\n"
        "Listing agent first. This pitch works because no single ask is unreasonable — together "
        "they bridge the gap. Frame it that way.\n\n"
        "WHY THIS APPROACH WORKS\n"
        "Real deals rarely close on a single concession. A small price cut, a partial seller "
        "carry, and a modest rent verification — none of which is dramatic alone — together make "
        "the math pencil. You're asking the seller to share the gap across three small moves "
        "instead of swallowing one large one.\n\n"
        "OPEN — discover before you ask\n"
        "\"Before I send a number, can you walk me through what's driving the sale and where the "
        "seller would ideally land? I have a structure in mind that I think can get us close to "
        "their number — but I want to understand their situation first.\"\n\n"
        "ANCHOR — frame the gap honestly\n"
        f"\"At {fmt_money_precise(ctx.list_price)}, the deal doesn't pencil for me. But I don't "
        "think it has to come down to a single big concession. I'd like to propose a blended "
        "structure where we share the lift across three small moves.\"\n\n"
        "THE PROPOSAL — three small asks instead of one big one\n"
        f"1. PRICE — {fmt_pct_delta(ctx.list_price, new_price)} from asking, to "
        f"{fmt_money_precise(new_price)}. A modest cut, not a haircut.\n"
        f"2. SELLER CARRY — the seller holds {fmt_money_precise(chosen_second)} as a 0% second "
        f"mortgage for {DEFAULT_BALLOON_YEARS} years, then balloons to a single payoff check from "
        "my refinance.\n"
        f"3. RENT VERIFICATION — I confirm market rent at roughly ${round(new_rent):,}/mo "
        f"({bump_pct:.1f}% above current modeled rent) before we go hard on earnest. This is on "
        "me — not an ask of the seller.\n\n"
        "WHAT'S IN IT FOR THE SELLER\n"
        f"\u2022 Headline price drops only {fmt_pct_delta(ctx.list_price, new_price)} — "
        f"{price_pct:.1f}% off their number, vs. typical investor offers of 10-20% below.\n"
        f"\u2022 The {fmt_money(chosen_second)} second is a recorded, secured note — better than "
        "cash sitting in their bank account at 0.5%.\n"
        f"\u2022 In {DEFAULT_BALLOON_YEARS} years they receive a single check for "
        f"{fmt_money_precise(chosen_second)}, paid by my refinance.\n"
        "\u2022 Clean fast close. No financing contingency drama.\n\n"
        "OFFER MULTIPLE OPTIONS (Brandon Turner's three-offer rule)\n"
        "Sellers say no to single asks but pick between options. Frame your offer as a choice:\n"
        f"\u2022 OPTION A — Cash, lower price: {fmt_money_precise(ctx.target_buy_price)}, all cash, 14-day close.\n"
        f"\u2022 OPTION B — Blended (recommended): {fmt_money_precise(new_price)} + "
        f"{fmt_money(chosen_second)} seller second at 0%.\n"
        f"\u2022 OPTION C — Full price, full terms: {fmt_money_precise(ctx.list_price)} with the "
        f"seller carrying ~{fmt_money(chosen_second * 1.6)} at 0% (Pace Morby's pure price-for-terms play).\n\n"
        "Which one feels closest to what the seller would consider?\n\n"
        "HANDLE PUSHBACK — break it into pieces\n"
        "If they balk at the whole package, ask: \"Which part doesn't work for the seller — the "
        "price, the carry, or the timeline? Let's figure out where there's flexibility and where "
        "there isn't.\"\n\n"
        "TRIAL CLOSE\n"
        "\"If the seller is open to Option B, I'll have a clean offer with proof of funds and "
        "draft seller-carry note in your inbox within 48 hours. My creative-finance attorney "
        "papers the second so the seller's counsel has clean documents to review.\"\n\n"
        "TACTICS\n"
        "\u2022 Always offer 2-3 options. Sellers pick between options; they say no to single asks.\n"
        "\u2022 Lead with the seller's situation. \"Help me understand...\" beats \"I need...\" every time.\n"
        "\u2022 Use the words \"creative offer\" early — the agent and seller can prep for an unusual structure.\n"
        "\u2022 Have an attorney lined up before the call. \"My attorney will paper this\" is a trust signal.\n"
        "\u2022 Trade concessions for concessions — never give without getting (faster close, leaseback, fewer contingencies)."
    )

    caveat = None
    if not closes_gap:
        caveat = (
            "All three levers are stretched — the math still leaves a small monthly gap. "
            "Treat this as a starting point and tune in Strategy."
        )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label=realism_label,
        headline=headline,
        bullets=bullets,
        summary=summary,
        levers=[
            StructureLever(
                label="Target price",
                before_label=fmt_money(ctx.list_price),
                after_label=fmt_money(new_price),
                delta_label=fmt_pct_delta(ctx.list_price, new_price),
            ),
            StructureLever(
                label=f"Seller 2nd (0%, {DEFAULT_BALLOON_YEARS}yr balloon)",
                before_label="—",
                after_label=fmt_money(chosen_second),
                delta_label=None,
            ),
            StructureLever(
                label="Monthly rent",
                before_label=f"${round(ctx.monthly_rent):,}",
                after_label=f"${round(new_rent):,}",
                delta_label=fmt_pct_delta(ctx.monthly_rent, new_rent),
            ),
        ],
        monthly_savings=monthly_savings,
        cash_required=float(cash_required),
        ranking_score=ranking,
        pitch_script=pitch,
        caveat=caveat,
        selection_reason=sel_reason,
        pre_loaded_record={
            "custom_purchase_price": new_price,
            "custom_rent_estimate": new_rent,
            "pending_extras": {
                "three_paths_structure_id": ID,
                "seller_carry_amount": chosen_second,
                "seller_carry_rate": 0.0,
                "seller_carry_term_years": DEFAULT_BALLOON_YEARS,
                "seller_carry_balloon_years": DEFAULT_BALLOON_YEARS,
                "blended_closes_gap": closes_gap,
            },
        },
    )
