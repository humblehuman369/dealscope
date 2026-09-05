"""Negotiability — how likely the seller agrees to each breakeven lever.

Deterministic. Every reason string is emitted only when the underlying signal is
actually present on the property; nothing is guessed. Ratings reuse the same
bands as ``calculate_deal_opportunity_score`` (>=70 achievable, >=40 stretch,
<40 unlikely) so the section agrees with the IQ Verdict score above it.
"""

from __future__ import annotations

from app.schemas.deal_structures import DealStructure, Negotiability, NegotiabilityRating
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.formatting import fmt_money

HIGH_THRESHOLD = 70
MEDIUM_THRESHOLD = 40

# Past a year, feeds routinely report relisted or stale DOM values. Quoting
# "1213 days on market" as leverage reads as broken data to anyone who knows
# the market, so the phrasing degrades to a credible band instead.
DOM_CREDIBLE_CEILING = 365


def dom_phrase(days: int) -> str:
    """Days on market as something an investor would actually say out loud."""
    if days >= DOM_CREDIBLE_CEILING:
        return "listed over a year"
    return f"{days} days on market"


def _rating_for(score: float) -> NegotiabilityRating:
    if score >= HIGH_THRESHOLD:
        return "high"
    if score >= MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def _clamp(score: float) -> int:
    return int(min(100, max(0, round(score))))


def _is_distressed(ctx: StructureContext) -> bool:
    return bool(ctx.is_foreclosure or ctx.is_bank_owned or ctx.is_auction)


def seller_signal_reasons(ctx: StructureContext) -> list[str]:
    """Plain-English facts about this seller, strongest first. Empty when nothing is known."""
    reasons: list[str] = []
    if ctx.price_reductions > 0:
        n = ctx.price_reductions
        reasons.append(f"{n} price cut{'s' if n > 1 else ''} already — the seller is adjusting to the market")
    dom = ctx.days_on_market
    if dom is not None and dom >= 60:
        reasons.append(f"{dom_phrase(dom)} — well past the point where sellers start listening")
    if ctx.is_bank_owned:
        reasons.append("Bank-owned (REO) — the lender prices to liquidate, not to hold")
    elif ctx.is_foreclosure:
        reasons.append("Foreclosure — a deadline is driving this sale")
    elif ctx.is_auction:
        reasons.append("Auction listing — price is decided on the day, terms are not negotiable")
    if ctx.is_fsbo:
        reasons.append("For sale by owner — no agent in the middle, so unusual offers get heard")
    if ctx.is_absentee_owner:
        reasons.append("Absentee owner — a landlord exiting, not a family losing a home")
    temp = (ctx.market_temperature or "").lower()
    if temp == "cold":
        reasons.append("Buyer's market — fewer competing offers")
    elif temp == "hot":
        reasons.append("Seller's market — the seller has other buyers to fall back on")
    if ctx.seller_motivation_score is not None and ctx.seller_motivation_score >= 60:
        reasons.append(f"Seller motivation score {ctx.seller_motivation_score}/100")
    return reasons


def _price(ctx: StructureContext) -> Negotiability:
    gap = ctx.deal_gap_pct
    if ctx.deal_opportunity_score is not None:
        score = float(ctx.deal_opportunity_score)
    elif gap <= 5:
        score = 85.0
    elif gap <= 10:
        score = 70.0
    elif gap <= 20:
        score = 55.0
    elif gap <= 30:
        score = 35.0
    else:
        score = 20.0

    reasons = seller_signal_reasons(ctx)
    if gap > 25:
        reasons.append(f"A {gap:.0f}% cut is deeper than most sellers accept in a single move")
    elif gap <= 5:
        reasons.append(f"A {gap:.1f}% ask is inside normal negotiating room")
    return Negotiability(rating=_rating_for(score), score=_clamp(score), reasons=reasons)


def _financing(ctx: StructureContext, structure: DealStructure) -> Negotiability:
    score = 55.0
    reasons: list[str] = []
    if _is_distressed(ctx):
        score -= 30
        reasons.append("Banks, lenders, and auctions do not carry paper — seller financing is off the table")
    if ctx.is_fsbo:
        score += 10
        reasons.append("For sale by owner — you can pitch terms to the decision-maker directly")
    if ctx.is_absentee_owner:
        score += 10
        reasons.append("Absentee owner — landlords often prefer a secured note over a taxable lump sum")
    dom = ctx.days_on_market
    if dom is not None and dom >= 90:
        score += 8
        reasons.append(
            f"{dom_phrase(dom)} — creative terms get a hearing once the easy offers dry up"
        )
    temp = (ctx.market_temperature or "").lower()
    if temp == "cold":
        score += 8
        reasons.append("Buyer's market — sellers trade terms to protect their price")
    elif temp == "hot":
        score -= 8
        reasons.append("Seller's market — a full-price cash buyer is likely, so terms are a hard sell")
    if ctx.seller_motivation_score is not None and ctx.seller_motivation_score >= 60:
        score += 6
    fact = structure.breakeven
    if fact is not None and not fact.closes_gap_alone:
        score = min(score, 45.0)
        reasons.append(
            f"Even a maximum {fmt_money(fact.result_amount)} carry does not close this gap alone — "
            "it has to pair with a price or rent move"
        )
    if not reasons:
        reasons.append("No distress signals on this listing — expect the seller to need the full-price framing")
    return Negotiability(rating=_rating_for(score), score=_clamp(score), reasons=reasons)


def _income(structure: DealStructure) -> Negotiability:
    fact = structure.breakeven
    pct = fact.change_pct if fact is not None and fact.change_pct is not None else 0.0
    if pct <= 5:
        score = 85.0
        reason = f"A {pct:.1f}% lift is inside normal rent-comp variance — this is verification, not negotiation"
    elif pct <= 12:
        score = 60.0
        reason = f"A {pct:.1f}% lift needs two local property managers to confirm it before you lean on it"
    else:
        score = 30.0
        reason = f"A {pct:.1f}% lift usually means rehab, a unit add, or a strategy change — not a rent comp"
    return Negotiability(rating=_rating_for(score), score=_clamp(score), reasons=[reason])


def _equity(structure: DealStructure) -> Negotiability:
    fact = structure.breakeven
    reasons = ["Your decision, not the seller's — no negotiation required"]
    if fact is not None and fact.change_amount is not None:
        reasons.append(f"{fmt_money(fact.change_amount)} more cash at close; check cash-on-cash in Strategy")
    if fact is not None and fact.change_pct is not None and fact.change_pct >= 15:
        reasons.append("A large equity swing — the trade is monthly stability for a lower return on cash")
    return Negotiability(rating="your_call", score=100, reasons=reasons)


def assess(ctx: StructureContext, structure: DealStructure) -> Negotiability | None:
    """Rate one structure. Returns None for families the section does not show."""
    if structure.family == "price":
        return _price(ctx)
    if structure.family == "financing":
        return _financing(ctx, structure)
    if structure.family == "income":
        return _income(structure)
    if structure.family == "capital_stack":
        return _equity(structure)
    return None


def build_blend_recommendation(ctx: StructureContext, paths: list[DealStructure]) -> str | None:
    """Only when a single lever is unlikely to close it. Small gaps get a one-play ask, not a blend."""
    if ctx.deal_gap_pct <= 10:
        return None

    signals = seller_signal_reasons(ctx)
    lead = signals[0].split(" — ")[0] if signals else None
    financing_open = not _is_distressed(ctx)

    if lead:
        opener = f"{lead}: "
    else:
        opener = "No distress signals show on this listing yet, so "

    if not financing_open:
        body = (
            f"a lender will not carry a note, so the realistic blend is a price cut toward "
            f"{fmt_money(ctx.target_buy_price)} plus more of your own cash down."
        )
    else:
        body = (
            "a modest price cut plus a small seller-carried second is the most probable close. "
            "Sellers concede a little on several things far more readily than a lot on one."
        )
    return opener + body
