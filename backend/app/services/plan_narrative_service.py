"""
Plan narrative — the two sentences and the seller pitch for a Make It Work plan.

Hybrid AI: the deal-structures engine has already done every calculation. Claude
only turns the chosen structure + the user's wizard answers into plain English,
under a strict instruction to use the numbers it was handed and nothing else.
When Claude is unavailable (no key, timeout, error, malformed reply) the same
facts flow through a deterministic template, so the wizard never blocks on AI.

Results are cached in Redis for 24h keyed by a hash of the inputs — the same
plan asked twice costs one model call.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from typing import Any

from app.core.config import settings
from app.schemas.plans import PlanNarrativeRequest, PlanNarrativeResponse
from app.services.cache_service import get_cache_service

logger = logging.getLogger(__name__)

AI_TIMEOUT_SECONDS = 6.0
CACHE_TTL_SECONDS = 86_400
MODEL = "claude-sonnet-4-20250514"

_anthropic_client = None
_anthropic_checked = False


def _ensure_anthropic():
    """Lazy-load the Anthropic client on first use (mirrors deal_memo_service)."""
    global _anthropic_client, _anthropic_checked

    if _anthropic_checked:
        return _anthropic_client

    _anthropic_checked = True
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        logger.info("ANTHROPIC_API_KEY not set — plan narratives will use the template fallback")
        return None

    try:
        import anthropic

        _anthropic_client = anthropic.Anthropic(api_key=api_key, timeout=AI_TIMEOUT_SECONDS, max_retries=0)
        return _anthropic_client
    except Exception as exc:
        logger.error("Anthropic client init failed: %s", exc)
        return None


SYSTEM_PROMPT = """You help a first-time real estate investor understand one plan for closing the gap between a property's asking price and the price at which it cash flows. You will be given the plan's numbers and the investor's three answers about their cash, priority, and openness to creative terms.

Rules:
- Use ONLY the numbers provided. Never invent figures, market conditions, or comparables.
- Speak to the investor directly ("you"). Plain language, no jargon without a two-word explanation.
- Do not use headers, bullets, or markdown.

Return strict JSON with exactly two keys:
{"summary": "<two sentences: what the plan does and why it fits their answers>", "pitch": "<what the investor says to the seller or agent to open the conversation, 120 words max, first person, confident and respectful>"}"""


CASH_LABELS = {
    "under_25k": "under $25K to put in",
    "25_75k": "$25K to $75K to put in",
    "75_150k": "$75K to $150K to put in",
    "150k_plus": "$150K or more to put in",
    "low_money_down": "as little cash down as possible",
}
PRIORITY_LABELS = {
    "cash_flow": "monthly cash flow",
    "lowest_price": "the lowest price",
    "least_cash": "the least cash out of pocket",
    "fastest_close": "a fast, simple close",
}
TERMS_LABELS = {
    "simple": "a plain bank loan with no seller terms",
    "seller_financing": "seller financing if it pencils",
    "anything": "whatever terms get it done",
}


def _fmt_money(val: float | None) -> str:
    return f"${val:,.0f}" if val is not None else "N/A"


def build_facts(req: PlanNarrativeRequest) -> dict[str, Any]:
    """One place for the facts both the prompt and the template use."""
    answers = req.wizard_answers
    return {
        "address": req.address,
        "plan": req.family_label,
        "family": req.family,
        "headline": req.headline,
        "bullets": list(req.bullets),
        "levers": [{"label": lv.label, "before": lv.before_label, "after": lv.after_label} for lv in req.levers],
        "monthly_savings": req.monthly_savings,
        "cash_required": req.cash_required,
        "list_price": req.list_price,
        "target_buy_price": req.target_buy_price,
        "investor_cash": CASH_LABELS.get(answers.cash or "", None),
        "investor_priority": PRIORITY_LABELS.get(answers.priority or "", None),
        "investor_terms": TERMS_LABELS.get(answers.terms or "", None),
        "owner_occupy": answers.owner_occupy,
    }


def _facts_block(facts: dict[str, Any]) -> str:
    lines = [
        f"- property: {facts['address']}",
        f"- plan: {facts['plan']} — {facts['headline']}",
    ]
    for b in facts["bullets"]:
        lines.append(f"- {b}")
    for lv in facts["levers"]:
        arrow = f"{lv['before']} → {lv['after']}" if lv["before"] else lv["after"]
        lines.append(f"- {lv['label']}: {arrow}")
    lines.append(f"- monthly improvement vs asking-price baseline: {_fmt_money(facts['monthly_savings'])}/mo")
    lines.append(f"- estimated cash to close: {_fmt_money(facts['cash_required'])}")
    if facts["list_price"] is not None:
        lines.append(f"- asking / market price: {_fmt_money(facts['list_price'])}")
    if facts["target_buy_price"] is not None:
        lines.append(f"- target buy (price where it cash flows): {_fmt_money(facts['target_buy_price'])}")
    if facts["investor_cash"]:
        lines.append(f"- investor has {facts['investor_cash']}")
    if facts["investor_priority"]:
        lines.append(f"- investor cares most about {facts['investor_priority']}")
    if facts["investor_terms"]:
        lines.append(f"- investor is open to {facts['investor_terms']}")
    if facts["owner_occupy"] is not None:
        lines.append(f"- investor would live in the property: {'yes' if facts['owner_occupy'] else 'no'}")
    return "\n".join(lines)


def _template_narrative(facts: dict[str, Any]) -> PlanNarrativeResponse:
    """Deterministic fallback — same facts, fixed prose."""
    plan = facts["plan"]
    savings = _fmt_money(facts["monthly_savings"])
    cash = _fmt_money(facts["cash_required"])
    priority = facts["investor_priority"]
    family = facts["family"]

    if family == "price":
        what = f"This plan closes the gap on price: you buy at {facts['levers'][0]['after'] if facts['levers'] else 'the Target Buy'} instead of asking."
    elif family == "income":
        what = "This plan closes the gap on income: the rent is verified or lifted so the property carries itself at the asking price."
    elif family == "financing":
        what = "This plan closes the gap with terms: the seller carries part of the price so your loan payment drops without a price fight."
    elif family == "blended":
        what = "This plan blends a small price move, a modest rent lift, and seller help so no single ask has to carry the whole gap."
    else:
        what = f"The {plan} plan changes the deal so the property pays for itself."

    fit = f"It improves your monthly position by about {savings} with roughly {cash} to close"
    fit += f", which lines up with your focus on {priority}." if priority else "."
    summary = f"{what} {fit}"

    if family == "price":
        pitch = (
            f"I like the property and I want to make this simple for you. Based on what it rents for and what it costs to carry, "
            f"the number that works for me is {facts['levers'][0]['after'] if facts['levers'] else 'below asking'}. "
            "I can move quickly and keep the contingencies clean if we can meet there."
        )
    elif family == "income":
        pitch = (
            "I like the property and my offer depends on the rent it can actually earn. "
            "Can you share the current lease and rent roll? If the numbers support the rent I'm underwriting, "
            "I can be at your price and close on your timeline."
        )
    elif family == "financing":
        pitch = (
            "I can pay your price. What I need is a little help on terms: you carry a second for part of it, "
            "paid back in a few years, and I bring a conventional first for the rest. "
            "You get your number, I get a payment that works, and we both avoid a long negotiation."
        )
    elif family == "blended":
        pitch = (
            "I want to make this work for both of us, so I'm not asking for one big concession. "
            "A small adjustment on price, a short seller-held note for part of it, and I handle the rest. "
            "Each piece is modest, and together they get us to a deal I can close."
        )
    else:
        pitch = "I like the property and I'd like to find a structure that works for both of us. Can we talk through the numbers?"

    return PlanNarrativeResponse(summary=summary, pitch=pitch, source="template")


def cache_key(req: PlanNarrativeRequest) -> str:
    payload = req.model_dump(mode="json")
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()[:24]
    return f"plan_narrative:{digest}"


def _parse_ai_json(text: str) -> tuple[str, str] | None:
    """Accept a bare JSON object or one wrapped in prose/code fences."""
    cleaned = text.strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        data = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError:
        return None
    summary = str(data.get("summary", "")).strip()
    pitch = str(data.get("pitch", "")).strip()
    if not summary or not pitch:
        return None
    return summary, pitch


def _call_claude(client, facts: dict[str, Any]) -> tuple[str, str] | None:
    message = client.messages.create(
        model=MODEL,
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": "Write the summary and pitch from these facts only:\n\n" + _facts_block(facts),
            }
        ],
    )
    text = "".join(block.text for block in message.content if getattr(block, "type", "") == "text")
    return _parse_ai_json(text)


async def generate_narrative(req: PlanNarrativeRequest) -> PlanNarrativeResponse:
    """Return the narrative. Never raises — falls back to the template on any AI failure."""
    cache = get_cache_service()
    key = cache_key(req)
    try:
        cached = await cache.get(key)
        if isinstance(cached, dict) and cached.get("summary") and cached.get("pitch"):
            return PlanNarrativeResponse(**cached)
    except Exception as exc:  # cache is best-effort
        logger.debug("plan narrative cache read failed: %s", exc)

    facts = build_facts(req)
    result: PlanNarrativeResponse | None = None

    client = _ensure_anthropic()
    if client is not None:
        try:
            parsed = await asyncio.wait_for(asyncio.to_thread(_call_claude, client, facts), timeout=AI_TIMEOUT_SECONDS)
            if parsed:
                result = PlanNarrativeResponse(summary=parsed[0], pitch=parsed[1], source="ai")
        except TimeoutError:
            logger.warning("AI plan narrative timed out after %.0fs, using template", AI_TIMEOUT_SECONDS)
        except Exception as exc:
            logger.warning("AI plan narrative failed, using template: %s", exc)

    if result is None:
        result = _template_narrative(facts)

    try:
        await cache.set(key, result.model_dump(mode="json"), ttl_seconds=CACHE_TTL_SECONDS)
    except Exception as exc:
        logger.debug("plan narrative cache write failed: %s", exc)
    return result
