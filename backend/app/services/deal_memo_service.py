"""
Deal Memo service — a short, explainable investment memo for a saved property.

Turns the deal's own numbers (deal-maker record + cached metrics) into 2-4
plain-language paragraphs: what the numbers are, what drives the verdict, and
what would change it. Uses Anthropic Claude when configured; otherwise falls
back to a deterministic template built from the same facts.

Ground rule (same as the appraisal narrative service): the memo may only
reference facts we pass it. No fabricated market color, no invented comps.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.models.saved_property import SavedProperty

logger = logging.getLogger(__name__)

_anthropic_client = None
_anthropic_checked = False


def _ensure_anthropic():
    """Lazy-load the Anthropic client on first use."""
    global _anthropic_client, _anthropic_checked

    if _anthropic_checked:
        return _anthropic_client

    _anthropic_checked = True
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        logger.info("ANTHROPIC_API_KEY not set — deal memos will use the template fallback")
        return None

    try:
        import anthropic

        _anthropic_client = anthropic.Anthropic(api_key=api_key, timeout=15.0, max_retries=1)
        return _anthropic_client
    except Exception as exc:
        logger.error("Anthropic client init failed: %s", exc)
        return None


SYSTEM_PROMPT = """You are a real estate investment analyst writing a short internal deal memo for an individual investor. Use ONLY the facts provided — never invent numbers, market conditions, or comparables. Write in plain language a first-time investor can follow, but keep it precise. Structure: 2-4 short paragraphs covering (1) the deal at a glance, (2) what drives the numbers (the largest levers), and (3) key risks and what would change the verdict. If a critical input is missing, say so plainly instead of guessing. Do not use headers, bullet lists, or markdown — return flowing prose only."""


def _fmt_money(val: float | None) -> str:
    return f"${val:,.0f}" if val is not None else "N/A"


def _fmt_pct(val: float | None, *, already_pct: bool = False) -> str:
    if val is None:
        return "N/A"
    return f"{val:.1f}%" if already_pct else f"{val * 100:.1f}%"


STRATEGY_NAMES = {
    "ltr": "long-term rental",
    "str": "short-term rental",
    "brrrr": "BRRRR",
    "flip": "fix & flip",
    "house_hack": "house hack",
    "wholesale": "wholesale",
}


def build_facts(prop: SavedProperty) -> dict[str, Any]:
    """Collect the non-null facts the memo may use — one place, so the AI
    prompt and the template fallback can never diverge on inputs."""
    record: dict[str, Any] = prop.deal_maker_record or {}
    metrics: dict[str, Any] = record.get("cached_metrics") or {}
    snapshot: dict[str, Any] = prop.property_data_snapshot or {}

    def num(value: Any) -> float | None:
        return float(value) if isinstance(value, (int, float)) else None

    facts: dict[str, Any] = {
        "address": prop.full_address or prop.address_street,
        "status": prop.status.value if prop.status else None,
        "strategy": STRATEGY_NAMES.get(
            record.get("strategy_type") or prop.best_strategy or "", prop.best_strategy
        ),
        "bedrooms": snapshot.get("bedrooms"),
        "bathrooms": snapshot.get("bathrooms"),
        "sqft": snapshot.get("sqft") or snapshot.get("square_footage"),
        "year_built": snapshot.get("year_built"),
        "list_price": num(record.get("list_price")),
        "buy_price": num(record.get("buy_price")),
        "market_value_override": num(record.get("market_value_override")),
        "monthly_rent": num(record.get("monthly_rent")),
        "rehab_budget": num(record.get("rehab_budget")),
        "arv": num(record.get("arv")),
        "interest_rate": num(record.get("interest_rate")),
        "down_payment_pct": num(record.get("down_payment_pct")),
        "deal_gap_pct": num(metrics.get("deal_gap_pct")),
        "income_value": num(metrics.get("income_value")),
        "monthly_cash_flow": num(metrics.get("monthly_cash_flow")),
        "cap_rate": num(metrics.get("cap_rate")),
        "cash_on_cash": num(metrics.get("cash_on_cash")),
        "noi": num(metrics.get("noi")),
        "dscr": num(metrics.get("dscr")),
        "total_cash_needed": num(metrics.get("total_cash_needed")),
        "user_notes": (prop.notes or "").strip() or None,
    }
    return {k: v for k, v in facts.items() if v is not None}


def _facts_block(facts: dict[str, Any]) -> str:
    lines = []
    for key, value in facts.items():
        label = key.replace("_", " ")
        if key in {"list_price", "buy_price", "market_value_override", "monthly_rent",
                   "rehab_budget", "arv", "income_value", "monthly_cash_flow", "noi",
                   "total_cash_needed"}:
            lines.append(f"- {label}: {_fmt_money(value)}")
        elif key in {"interest_rate", "down_payment_pct", "cap_rate", "cash_on_cash"}:
            lines.append(f"- {label}: {_fmt_pct(value)}")
        elif key == "deal_gap_pct":
            lines.append(f"- {label}: {_fmt_pct(value, already_pct=True)}")
        else:
            lines.append(f"- {label}: {value}")
    return "\n".join(lines)


def _template_memo(facts: dict[str, Any]) -> str:
    """Deterministic fallback — same facts, fixed prose."""
    address = facts.get("address", "This property")
    strategy = facts.get("strategy")
    buy = facts.get("buy_price")
    list_price = facts.get("list_price")
    rent = facts.get("monthly_rent")
    gap = facts.get("deal_gap_pct")
    cash_flow = facts.get("monthly_cash_flow")
    coc = facts.get("cash_on_cash")
    cash_needed = facts.get("total_cash_needed")
    income_value = facts.get("income_value")

    paragraphs: list[str] = []

    intro = f"{address} is being analyzed as a {strategy} deal" if strategy else f"{address} summary"
    bits = []
    if list_price is not None:
        bits.append(f"listed at {_fmt_money(list_price)}")
    if buy is not None:
        bits.append(f"with a target buy price of {_fmt_money(buy)}")
    if rent is not None:
        bits.append(f"and expected rent of {_fmt_money(rent)}/mo")
    paragraphs.append(f"{intro}, {', '.join(bits)}." if bits else f"{intro}.")

    if gap is not None or income_value is not None:
        gap_bits = []
        if income_value is not None:
            gap_bits.append(
                f"The income value — the price where the property's income covers its own debt — works out to {_fmt_money(income_value)}"
            )
        if gap is not None:
            direction = "below" if gap > 0 else "above"
            gap_bits.append(
                f"the asking price would need to move {_fmt_pct(abs(gap), already_pct=True)} {direction} list to close the deal gap"
            )
        paragraphs.append(". ".join(gap_bits) + ".")

    perf_bits = []
    if cash_flow is not None:
        perf_bits.append(f"projected cash flow is {_fmt_money(cash_flow)}/mo")
    if coc is not None:
        perf_bits.append(f"cash-on-cash return is {_fmt_pct(coc)}")
    if cash_needed is not None:
        perf_bits.append(f"estimated cash to close is {_fmt_money(cash_needed)}")
    if perf_bits:
        paragraphs.append(f"At the target price, {', '.join(perf_bits)}.")

    paragraphs.append(
        "These figures come from your current worksheet assumptions — rent, rate, and "
        "expense inputs are the biggest levers, so re-check them against local data "
        "before making an offer."
    )
    return "\n\n".join(paragraphs)


async def generate_memo(prop: SavedProperty) -> dict[str, Any]:
    """Return {text, source, generated_at}. Never raises — falls back to the
    template on any AI failure so the button always produces a memo."""
    facts = build_facts(prop)
    generated_at = datetime.now(UTC).isoformat()

    client = _ensure_anthropic()
    if client is not None:
        try:
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=700,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            "Write the deal memo from these facts only:\n\n"
                            + _facts_block(facts)
                        ),
                    }
                ],
            )
            text = "".join(
                block.text for block in message.content if getattr(block, "type", "") == "text"
            ).strip()
            if text:
                return {"text": text, "source": "ai", "generated_at": generated_at}
        except Exception as exc:
            logger.warning("AI deal memo failed, using template: %s", exc)

    return {"text": _template_memo(facts), "source": "template", "generated_at": generated_at}
