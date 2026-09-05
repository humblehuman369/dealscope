"""Why a breakeven lever has no result — the difference between good and bad news.

A template returning ``None`` collapses three opposite meanings: this lever is
not needed, this lever cannot close the gap, or we have no data to try. The UI
has to say which, because "you don't need more equity" is reassurance and
"even 50% down won't save this" is a warning.

Diagnosis lives here rather than in the templates so their return contract stays
``DealStructure | None``. Everything is recomputed from the public cash-flow
projections, never from template internals.
"""

from __future__ import annotations

from app.schemas.deal_structures import WayUnavailable
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.cashflow import project_monthly_cash_flow
from app.services.deal_structures.formatting import fmt_monthly

# Ceilings past which a lever stops being a plan and starts being a fantasy.
MAX_REALISTIC_RENT_BUMP_PCT = 0.20
MAX_DOWN_PAYMENT_PCT = 0.50
MAX_SELLER_CARRY_PCT = 0.20


def _shortfall_phrase(cash_flow: float) -> str:
    return fmt_monthly(abs(cash_flow))


def _income(ctx: StructureContext) -> WayUnavailable | None:
    if ctx.monthly_rent <= 0:
        return WayUnavailable(
            family="income",
            reason="no_data",
            message="No rent estimate for this property, so we can't test a rent lift.",
        )

    at_today = project_monthly_cash_flow(
        ctx, purchase_price=ctx.list_price, monthly_rent=ctx.monthly_rent
    )
    if at_today >= 0:
        return WayUnavailable(
            family="income",
            reason="not_needed",
            message="Not needed — today's rent already covers this price.",
        )

    ceiling = ctx.monthly_rent * (1 + MAX_REALISTIC_RENT_BUMP_PCT)
    at_ceiling = project_monthly_cash_flow(
        ctx, purchase_price=ctx.list_price, monthly_rent=ceiling
    )
    if at_ceiling < 0:
        pct = int(MAX_REALISTIC_RENT_BUMP_PCT * 100)
        return WayUnavailable(
            family="income",
            reason="insufficient",
            message=(
                f"Even a {pct}% rent lift leaves you {_shortfall_phrase(at_ceiling)} short. "
                "Rent alone can't carry this price."
            ),
        )
    return None


def _capital_stack(ctx: StructureContext) -> WayUnavailable | None:
    if ctx.list_price <= 0:
        return WayUnavailable(
            family="capital_stack",
            reason="no_data",
            message="No price for this property, so we can't size a down payment.",
        )

    at_today = project_monthly_cash_flow(
        ctx, purchase_price=ctx.list_price, monthly_rent=ctx.monthly_rent
    )
    if at_today >= 0:
        return WayUnavailable(
            family="capital_stack",
            reason="not_needed",
            message=(
                f"Not needed — the rent already covers this price at "
                f"{ctx.down_payment_pct * 100:.0f}% down."
            ),
        )

    # A larger down payment only removes debt service, so an all-cash purchase is
    # the best this lever can ever do: today's cash flow with the P&I added back.
    all_cash = at_today + ctx.baseline_monthly_pi
    if all_cash < 0:
        return WayUnavailable(
            family="capital_stack",
            reason="insufficient",
            message=(
                f"Even paying all cash leaves you {_shortfall_phrase(all_cash)} short. "
                "The rent doesn't cover the taxes and operating costs at this price."
            ),
        )
    return WayUnavailable(
        family="capital_stack",
        reason="insufficient",
        message=(
            f"More than {int(MAX_DOWN_PAYMENT_PCT * 100)}% down would be required. "
            "At that point you're buying cash flow with your own capital, not with the deal."
        ),
    )


def _financing(ctx: StructureContext) -> WayUnavailable | None:
    if ctx.list_price <= 0:
        return None

    max_carry = ctx.list_price * MAX_SELLER_CARRY_PCT
    at_max = project_monthly_cash_flow(
        ctx,
        purchase_price=ctx.list_price,
        monthly_rent=ctx.monthly_rent,
        seller_carry_amount=max_carry,
        seller_carry_rate=0.0,
    )
    if at_max < 0:
        pct = int(MAX_SELLER_CARRY_PCT * 100)
        return WayUnavailable(
            family="financing",
            reason="insufficient",
            message=(
                f"Even a {pct}% seller-carried second leaves you "
                f"{_shortfall_phrase(at_max)} short at full price."
            ),
        )
    return None


def _price(ctx: StructureContext) -> WayUnavailable | None:
    if ctx.list_price <= 0 or ctx.monthly_rent <= 0:
        return WayUnavailable(
            family="price",
            reason="no_data",
            message="Not enough price or rent data to solve for a target price.",
        )
    return None


_DIAGNOSERS = {
    "price": _price,
    "income": _income,
    "financing": _financing,
    "capital_stack": _capital_stack,
}


def diagnose_missing(ctx: StructureContext, present_families: set[str]) -> list[WayUnavailable]:
    """Explain every breakeven lever that produced no structure, in row order."""
    out: list[WayUnavailable] = []
    for family, diagnose in _DIAGNOSERS.items():
        if family in present_families:
            continue
        result = diagnose(ctx)
        if result is not None:
            out.append(result)
    return out
