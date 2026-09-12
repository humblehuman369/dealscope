"""Action Plan research step — find the missing public facts.

Provider is a setting (``openai`` | ``anthropic`` | ``xai``). Only OpenAI is
built. The two functions the rest of the feature uses:

1. ``start_research`` — send a background Responses request, return the id.
2. ``poll_research`` — retrieve once; still running, or parsed JSON + usage.

If the key is missing, the provider is not built, or the call fails, the
caller ships the template plan. Never invent facts.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any, Literal

import httpx

from app.core.config import settings
from app.models.action_plan import ActionPlan, ActionPlanCase, ActionPlanStatus
from app.services.action_plan.cases import listing_from_payload
from app.services.cache_service import CacheService, get_cache_service

logger = logging.getLogger(__name__)

OPENAI_API_BASE = "https://api.openai.com/v1"

BLOCKED_DOMAINS = [
    "spokeo.com",
    "whitepages.com",
    "truepeoplesearch.com",
    "fastpeoplesearch.com",
    "beenverified.com",
    "peoplefinders.com",
    "radaris.com",
    "intelius.com",
    "smallbusinessdb.com",
    "bizapedia.com",
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "x.com",
    "twitter.com",
    "tiktok.com",
    "reddit.com",
]

# Dollars per million tokens. Web search is $10 / 1,000 calls = $0.01 each.
_MODEL_RATES: dict[str, tuple[float, float]] = {
    "gpt-5.6-luna": (0.20, 1.20),
    "gpt-5.6-terra": (2.0, 12.0),
    "gpt-5.6-sol": (4.0, 20.0),
}
_SEARCH_DOLLARS = 0.01

SYSTEM_PROMPT = """You are a research assistant for a real estate investor. You are given a property and the facts a data platform already has. Find the public facts that are MISSING so the investor knows who to call next.

How to search. Do not rely on one site. Listing history is scattered and Zillow hides old listings. Check the full MLS history on Compass, Movoto, Xome, Koolik, Trulia, and Redfin, and read the whole history table, not just the last row. A property can be listed, removed, relisted, and expire again under a different agent. The most recent agent is the one that matters most, but report every agent you find with the dates. For foreclosure filings, search the owner names plus the county plus "foreclosure" on trellis.law and unicourt.com, and search the county clerk's site. For agent and brokerage phones, use Realtor.com, Zillow agent pages, or the brokerage's own site. Do not use business directories.

Rules.
1. Every fact must come from a page you opened. Give the URL.
2. Mark a fact VERIFIED only if a page states it. Mark it UNVERIFIED if you believe it but could not open a page that says it.
3. If you cannot find something, put it in not_found. Do not guess. A wrong fact is worse than a missing one. Never invent a case number, a filing date, an auction date, a judgment, or a sale result.
4. Do not search for or report personal phone numbers, personal emails, home addresses other than the ones given, or social media of private individuals. Business numbers for agents, brokerages, lenders, law firms, and county offices are fine.
5. When two sources disagree, report both in conflicts and say which one you trust and why.
6. best_first_call is the one business contact most likely to know the current situation. Prefer the most recent listing agent. If there is none, prefer the county clerk."""

RESEARCH_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["findings", "not_found", "best_first_call", "conflicts"],
    "properties": {
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["field", "value", "status", "source_url", "note"],
                "properties": {
                    "field": {"type": "string"},
                    "value": {"type": "string"},
                    "status": {"type": "string", "enum": ["VERIFIED", "UNVERIFIED"]},
                    "source_url": {"type": ["string", "null"]},
                    "note": {"type": "string"},
                },
            },
        },
        "not_found": {"type": "array", "items": {"type": "string"}},
        "conflicts": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["field", "what_disagrees", "which_i_trust", "why"],
                "properties": {
                    "field": {"type": "string"},
                    "what_disagrees": {"type": "string"},
                    "which_i_trust": {"type": "string"},
                    "why": {"type": "string"},
                },
            },
        },
        "best_first_call": {
            "type": "object",
            "additionalProperties": False,
            "required": ["who", "role", "phone", "why"],
            "properties": {
                "who": {"type": "string"},
                "role": {"type": "string"},
                "phone": {"type": ["string", "null"]},
                "why": {"type": "string"},
            },
        },
    },
}

# Numbered find-lists per case. Same system prompt for all. bakeoff/bakeoff.py
# imports this dict so the harness tests what we ship.
CASE_TARGETS: dict[ActionPlanCase, list[str]] = {
    ActionPlanCase.ON_MARKET: [
        "The listing agent's business phone and the brokerage phone, from Realtor.com, the agent's Zillow page, or the brokerage's own site.",
        "How many days on market and every price cut, with dates, from the MLS history — not just Zillow.",
        "The agent's other active listings, if a page shows them, as a read on whether this one is a leftover.",
        "The county clerk's records phone and records request email, from the clerk's own site.",
    ],
    ActionPlanCase.ON_MARKET_STALE: [
        "The listing agent's business phone and the brokerage phone.",
        "The full price history and days on market from the MLS history table, not just Zillow.",
        "Why it is sitting: inspection issues, failed offers, or a price that never moved, if a page states it.",
        "The agent's other active listings, as a read on whether this one is a leftover.",
        "The county clerk's records phone, from the clerk's own site.",
    ],
    ActionPlanCase.EXPIRED_OR_ON_HOLD: [
        "Every agent who has listed this property, with brokerage and business phone, newest first. Flag which one is most recent.",
        "The status, price, and dates of each listing cycle: Active, On Hold, Temp Off Market, Withdrawn, Expired, Cancelled, Sold.",
        "Why it went on hold or expired, if a listing remark or MLS history states it.",
        "The county clerk's records phone and records request email, from the clerk's own site.",
    ],
    ActionPlanCase.OFF_MARKET_ABSENTEE: [
        "Every agent who has listed this property, with brokerage and business phone, newest first. Flag which one is most recent.",
        "The status, price, and dates of each listing cycle: Active, On Hold, Temp Off Market, Withdrawn, Expired, Cancelled, Sold.",
        "Any foreclosure case: plaintiff, filing date, case number, the law firm that filed it and its business phone. Do not invent a case number.",
        "The county clerk's records phone and records request email, from the clerk's own site.",
    ],
    ActionPlanCase.OFF_MARKET_OWNER_OCCUPIED: [
        "Every agent who has listed this property, with brokerage and business phone, newest first. Flag which one is most recent.",
        "The status, price, and dates of each listing cycle: Active, On Hold, Temp Off Market, Withdrawn, Expired, Cancelled, Sold.",
        "The county clerk's records phone and records request email, from the clerk's own site.",
    ],
    ActionPlanCase.PRE_FORECLOSURE: [
        "Every agent who has listed this property, with brokerage and business phone, newest first. Flag which one is most recent.",
        "The status, price, and dates of each listing cycle: Active, On Hold, Temp Off Market, Withdrawn, Expired, Cancelled, Sold.",
        "The foreclosure case: plaintiff (lender or trust), filing date, case number, the law firm that filed it and its business phone, and the original lender and recording info from the complaint if the page shows it.",
        "Any scheduled auction date on the county clerk's site or the county's auction site.",
        "The county clerk's records phone number and records request email, from the clerk's own site.",
    ],
    ActionPlanCase.FORECLOSURE_OR_AUCTION: [
        "The scheduled auction date, time, and location, from the county clerk or the county's auction site. Do not invent a date.",
        "The foreclosure case: plaintiff, filing date, case number, and the law firm that filed it and its business phone.",
        "The listing broker or auctioneer business phone, if the property is listed.",
        "The county clerk's records phone, from the clerk's own site.",
    ],
    ActionPlanCase.BANK_OWNED: [
        "The listing broker and the REO / asset manager, with business phones, from the listing or the bank's REO page.",
        "The list price, days on market, and price cuts from the MLS history.",
        "The foreclosure case that led here: plaintiff, case number, and sale result, if a page states it. Do not invent them.",
        "The county clerk's records phone, from the clerk's own site.",
    ],
    ActionPlanCase.FSBO: [
        "The owner's listing page or FSBO site, and any business number published there. Do not search for a personal cell.",
        "Every agent who has listed this property before, with brokerage and business phone, newest first.",
        "The status, price, and dates of each prior listing cycle.",
        "The county clerk's records phone, from the clerk's own site.",
    ],
}

_RUNNING_STATUSES = frozenset({"queued", "in_progress", "cancelling"})


class ResearchProvider(StrEnum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    XAI = "xai"


class ResearchUnavailable(Exception):
    """No key, provider not built, or the HTTP call could not start."""


@dataclass(frozen=True)
class ResearchStart:
    kind: Literal["started", "cached", "skipped"]
    response_id: str | None = None
    research: dict[str, Any] | None = None
    reason: str | None = None


@dataclass(frozen=True)
class ResearchPoll:
    status: Literal["running", "completed", "failed"]
    research: dict[str, Any] | None = None
    searches: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    error: str | None = None


def resolve_provider() -> ResearchProvider:
    raw = (settings.ACTION_PLAN_RESEARCH_PROVIDER or "openai").strip().lower()
    try:
        return ResearchProvider(raw)
    except ValueError:
        return ResearchProvider.OPENAI


def provider_is_built(provider: ResearchProvider) -> bool:
    return provider is ResearchProvider.OPENAI


def cache_key(
    case: ActionPlanCase,
    *,
    parcel: str | None,
    address: str | None,
) -> str | None:
    identifier = (parcel or "").strip() or (address or "").strip()
    if not identifier:
        return None
    return CacheService.generate_key(f"action-plan-research:{case.value}", identifier)


async def cached_research(
    case: ActionPlanCase,
    *,
    parcel: str | None,
    address: str | None,
) -> dict[str, Any] | None:
    key = cache_key(case, parcel=parcel, address=address)
    if not key:
        return None
    cached = await get_cache_service().get(key)
    return cached if isinstance(cached, dict) else None


async def store_cached_research(
    case: ActionPlanCase,
    research: dict[str, Any],
    *,
    parcel: str | None,
    address: str | None,
) -> None:
    key = cache_key(case, parcel=parcel, address=address)
    if not key:
        return
    await get_cache_service().set(
        key,
        research,
        ttl_seconds=settings.ACTION_PLAN_RESEARCH_CACHE_TTL_SECONDS,
    )


def estimate_cost_cents(
    model: str,
    searches: int,
    input_tokens: int,
    output_tokens: int,
) -> int:
    in_rate, out_rate = _MODEL_RATES.get(model, _MODEL_RATES["gpt-5.6-terra"])
    token_dollars = (input_tokens / 1_000_000) * in_rate + (output_tokens / 1_000_000) * out_rate
    return max(0, round((token_dollars + searches * _SEARCH_DOLLARS) * 100))


def build_property_prompt(
    payload: dict[str, Any] | None,
    case: ActionPlanCase,
    *,
    address: str | None = None,
    county: str | None = None,
    state: str | None = None,
    parcel: str | None = None,
) -> str:
    ctx = property_context(
        payload,
        case,
        address=address,
        county=county,
        state=state,
        parcel=parcel,
    )
    targets = CASE_TARGETS[case]
    numbered = "\n".join(f"{i}. {line}" for i, line in enumerate(targets, start=1))
    return (
        f"Property: {ctx['address']}\n"
        f"County: {ctx['county']}, {ctx['state']}\n"
        f"Parcel: {ctx['parcel']}\n"
        f"Status: {ctx['status_line']}\n"
        f"Owners of record: {ctx['owners']}\n"
        f"Owner mailing address: {ctx['mailing']}\n"
        f"Last known listing data: {ctx['listing_line']}\n"
        f"\nFind, in this order:\n{numbered}"
    )


def build_openai_request(
    instructions: str,
    user_input: str,
    *,
    model: str | None = None,
    background: bool = True,
    store: bool = True,
    max_tool_calls: int | None = None,
) -> dict[str, Any]:
    """Request body from docs/AI_ACTION_PLAN_OPENAI_RESEARCH.md. Field names match current docs.

    The bakeoff passes ``background=False`` so the script can wait. Production
    create uses the default ``background=True``.
    """
    return {
        "model": model or settings.ACTION_PLAN_RESEARCH_MODEL,
        "background": background,
        "store": store,
        "reasoning": {"effort": "medium"},
        "instructions": instructions,
        "input": user_input,
        "tools": [
            {
                "type": "web_search",
                "search_context_size": "high",
                "filters": {"blocked_domains": list(BLOCKED_DOMAINS)},
            }
        ],
        "max_tool_calls": max_tool_calls
        if max_tool_calls is not None
        else settings.ACTION_PLAN_RESEARCH_MAX_TOOL_CALLS,
        "text": {
            "format": {
                "type": "json_schema",
                "name": "property_research",
                "strict": True,
                "schema": RESEARCH_JSON_SCHEMA,
            }
        },
    }


def parse_research_json(output_text: str) -> dict[str, Any]:
    """Parse model JSON. Raises ValueError if the shape is unusable."""
    text = (output_text or "").strip()
    if not text:
        raise ValueError("empty research output")
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("research output is not an object")
    findings = _parse_findings(data.get("findings"))
    not_found = [str(item) for item in (data.get("not_found") or []) if str(item).strip()]
    conflicts = _parse_conflicts(data.get("conflicts"))
    best = _parse_best_first_call(data.get("best_first_call"))
    if best is None:
        raise ValueError("best_first_call missing")
    return {
        "findings": findings,
        "not_found": not_found,
        "conflicts": conflicts,
        "best_first_call": best,
    }


def count_web_searches(output: Any) -> int:
    if not isinstance(output, list):
        return 0
    return sum(1 for item in output if isinstance(item, dict) and item.get("type") == "web_search_call")


def extract_output_text(payload: dict[str, Any]) -> str:
    direct = payload.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct
    chunks: list[str] = []
    for item in payload.get("output") or []:
        if not isinstance(item, dict):
            continue
        for part in item.get("content") or []:
            if not isinstance(part, dict):
                continue
            text = part.get("text") or part.get("output_text")
            if isinstance(text, str) and text.strip():
                chunks.append(text)
    return "\n".join(chunks)


def poll_status_of(openai_status: str | None) -> Literal["running", "completed", "failed"]:
    status = (openai_status or "").strip().lower()
    if status == "completed":
        return "completed"
    if status in _RUNNING_STATUSES:
        return "running"
    return "failed"


async def start_research(
    payload: dict[str, Any] | None,
    case: ActionPlanCase,
    *,
    address: str | None = None,
    county: str | None = None,
    state: str | None = None,
    parcel: str | None = None,
) -> ResearchStart:
    """Function 1: send the background request (or skip / cache hit)."""
    cached = await cached_research(case, parcel=parcel, address=address)
    if cached:
        return ResearchStart(kind="cached", research=cached)

    provider = resolve_provider()
    if not provider_is_built(provider):
        logger.info("Action plan research provider %s is not built — shipping template", provider)
        return ResearchStart(kind="skipped", reason="provider_not_built")
    if not (settings.OPENAI_API_KEY or "").strip():
        logger.info("OPENAI_API_KEY not set — action plan research will use the template")
        return ResearchStart(kind="skipped", reason="no_key")

    prompt = build_property_prompt(
        payload,
        case,
        address=address,
        county=county,
        state=state,
        parcel=parcel,
    )
    body = build_openai_request(SYSTEM_PROMPT, prompt)
    try:
        created = await _openai_request("POST", "/responses", json_body=body)
    except Exception as exc:
        logger.warning("OpenAI research start failed: %s", exc)
        return ResearchStart(kind="skipped", reason="start_failed")

    response_id = created.get("id")
    if not isinstance(response_id, str) or not response_id:
        logger.warning("OpenAI research start returned no response id")
        return ResearchStart(kind="skipped", reason="start_failed")
    return ResearchStart(kind="started", response_id=response_id)


async def poll_research(response_id: str) -> ResearchPoll:
    """Function 2: poll once. Still running, or parsed JSON plus usage."""
    try:
        payload = await _openai_request("GET", f"/responses/{response_id}")
    except Exception as exc:
        logger.warning("OpenAI research poll failed: %s", exc)
        return ResearchPoll(status="failed", error=str(exc))

    life = poll_status_of(payload.get("status") if isinstance(payload.get("status"), str) else None)
    searches = count_web_searches(payload.get("output"))
    usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
    input_tokens = _int_or_zero(usage.get("input_tokens"))
    output_tokens = _int_or_zero(usage.get("output_tokens"))

    if life == "running":
        return ResearchPoll(
            status="running",
            searches=searches,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
    if life == "failed":
        return ResearchPoll(
            status="failed",
            searches=searches,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            error=str(payload.get("error") or payload.get("status") or "failed"),
        )

    try:
        research = parse_research_json(extract_output_text(payload))
    except (ValueError, json.JSONDecodeError) as exc:
        logger.warning("OpenAI research JSON unusable: %s", exc)
        return ResearchPoll(
            status="failed",
            searches=searches,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            error=str(exc),
        )
    return ResearchPoll(
        status="completed",
        research=research,
        searches=searches,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )


async def cancel_research(response_id: str) -> None:
    try:
        await _openai_request("POST", f"/responses/{response_id}/cancel")
    except Exception as exc:
        logger.warning("OpenAI research cancel failed: %s", exc)


async def kickoff_research(
    plan: ActionPlan,
    payload: dict[str, Any] | None,
    *,
    address: str | None = None,
    county: str | None = None,
    state: str | None = None,
    parcel: str | None = None,
) -> None:
    """Fill the plan row after the template is stored. Mutates ``plan`` in place."""
    plan.provider = resolve_provider().value
    started = await start_research(
        payload,
        plan.case,
        address=address,
        county=county,
        state=state,
        parcel=parcel,
    )
    now = datetime.now(UTC)
    if started.kind == "cached" and started.research is not None:
        _apply_completed(plan, started.research, searches=0, input_tokens=0, output_tokens=0, cost_cents=0)
        plan.updated_at = now
        return
    if started.kind == "started" and started.response_id:
        plan.provider_response_id = started.response_id
        plan.status = ActionPlanStatus.RESEARCHING
        plan.updated_at = now
        return
    plan.status = ActionPlanStatus.READY
    plan.updated_at = now


async def refresh_research(
    plan: ActionPlan,
    *,
    parcel: str | None = None,
    address: str | None = None,
) -> None:
    """Poll once (or time out). Mutates ``plan`` in place."""
    if plan.status not in {ActionPlanStatus.QUEUED, ActionPlanStatus.RESEARCHING}:
        return
    now = datetime.now(UTC)
    if _timed_out(plan, now):
        if plan.provider_response_id:
            await cancel_research(plan.provider_response_id)
        logger.info(
            "Action plan %s research hit the %ss hard stop — shipping template",
            plan.id,
            _timeout_seconds(),
        )
        plan.status = ActionPlanStatus.READY
        plan.updated_at = now
        return
    if not plan.provider_response_id:
        plan.status = ActionPlanStatus.READY
        plan.updated_at = now
        return

    polled = await poll_research(plan.provider_response_id)
    if polled.status == "running":
        plan.status = ActionPlanStatus.RESEARCHING
        if polled.searches:
            plan.searches = polled.searches
        plan.updated_at = now
        return
    if polled.status == "completed" and polled.research is not None:
        cost = estimate_cost_cents(
            settings.ACTION_PLAN_RESEARCH_MODEL,
            polled.searches,
            polled.input_tokens,
            polled.output_tokens,
        )
        _apply_completed(
            plan,
            polled.research,
            searches=polled.searches,
            input_tokens=polled.input_tokens,
            output_tokens=polled.output_tokens,
            cost_cents=cost,
        )
        await store_cached_research(plan.case, polled.research, parcel=parcel, address=address)
        plan.updated_at = now
        return
    plan.status = ActionPlanStatus.READY
    plan.searches = polled.searches or plan.searches
    plan.input_tokens = polled.input_tokens or plan.input_tokens
    plan.output_tokens = polled.output_tokens or plan.output_tokens
    plan.updated_at = now


def property_context(
    payload: dict[str, Any] | None,
    case: ActionPlanCase,
    *,
    address: str | None = None,
    county: str | None = None,
    state: str | None = None,
    parcel: str | None = None,
) -> dict[str, str]:
    payload = payload or {}
    addr = payload.get("address") if isinstance(payload.get("address"), dict) else {}
    details = payload.get("details") if isinstance(payload.get("details"), dict) else {}
    listing = listing_from_payload(payload)

    full = (
        (address or "").strip()
        or str(addr.get("full_address") or "").strip()
        or _compose_street(addr)
        or "not known"
    )
    county_text = (county or "").strip() or str(addr.get("county") or "").strip() or "not known"
    state_text = (state or "").strip() or str(addr.get("state") or "").strip() or "not known"
    parcel_text = (
        (parcel or "").strip()
        or str(details.get("parcel_id") or "").strip()
        or str(payload.get("parcel_id") or "").strip()
        or "not known"
    )
    owners = _join_names(listing.get("owner_names")) or "not known"
    mailing = str(listing.get("owner_mailing_address") or "").strip() or "not known"
    return {
        "address": full,
        "county": county_text,
        "state": state_text,
        "parcel": parcel_text,
        "owners": owners,
        "mailing": mailing,
        "listing_line": _listing_line(listing),
        "status_line": _status_line(case, listing),
    }


def _status_line(case: ActionPlanCase, listing: dict[str, Any]) -> str:
    parts: dict[ActionPlanCase, str] = {
        ActionPlanCase.ON_MARKET: "On market.",
        ActionPlanCase.ON_MARKET_STALE: "On market. Sitting (days on market or price cuts).",
        ActionPlanCase.EXPIRED_OR_ON_HOLD: "Listing expired or on hold.",
        ActionPlanCase.OFF_MARKET_ABSENTEE: "Off market. Owner mailing address differs from the property.",
        ActionPlanCase.OFF_MARKET_OWNER_OCCUPIED: "Off market. Owner-occupied.",
        ActionPlanCase.PRE_FORECLOSURE: "Off market. Pre-foreclosure flag is set.",
        ActionPlanCase.FORECLOSURE_OR_AUCTION: "Foreclosure or auction.",
        ActionPlanCase.BANK_OWNED: "Bank-owned / REO.",
        ActionPlanCase.FSBO: "For sale by owner.",
    }
    if case is ActionPlanCase.PRE_FORECLOSURE and listing.get("is_absentee_owner") is True:
        return "Off market. Pre-foreclosure flag is set. Owner mailing address differs from the property."
    return parts[case]


def _listing_line(listing: dict[str, Any]) -> str:
    bits: list[str] = []
    agent = str(listing.get("listing_agent_name") or "").strip()
    brokerage = str(listing.get("brokerage_name") or "").strip()
    if agent:
        bits.append(agent)
    if brokerage:
        bits.append(brokerage)
    price = listing.get("list_price")
    try:
        if price is not None:
            bits.append(f"${int(float(price)):,}")
    except (TypeError, ValueError):
        pass
    dom = listing.get("days_on_market")
    try:
        if dom is not None:
            bits.append(f"{int(dom)} days on market")
    except (TypeError, ValueError):
        pass
    return ", ".join(bits) if bits else "none"


def _compose_street(addr: dict[str, Any]) -> str:
    parts = [str(addr.get(k) or "").strip() for k in ("street", "city", "state", "zip_code")]
    return ", ".join(p for p in parts if p)


def _join_names(value: Any) -> str:
    if isinstance(value, list):
        names = [str(n).strip() for n in value if str(n).strip()]
        return ", ".join(names)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return ""


def _parse_findings(raw: Any) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    if not isinstance(raw, list):
        return findings
    for item in raw:
        if not isinstance(item, dict):
            continue
        field = str(item.get("field") or "").strip()
        value = str(item.get("value") or "").strip()
        if not field:
            continue
        status = str(item.get("status") or "").strip().upper()
        if status not in {"VERIFIED", "UNVERIFIED"}:
            continue
        source = item.get("source_url")
        source_url = str(source).strip() if isinstance(source, str) and source.strip() else None
        findings.append(
            {
                "field": field,
                "value": value,
                "status": status,
                "source_url": source_url,
                "note": str(item.get("note") or ""),
            }
        )
    return findings


def _parse_conflicts(raw: Any) -> list[dict[str, Any]]:
    conflicts: list[dict[str, Any]] = []
    if not isinstance(raw, list):
        return conflicts
    for item in raw:
        if not isinstance(item, dict):
            continue
        field = str(item.get("field") or "").strip()
        if not field:
            continue
        conflicts.append(
            {
                "field": field,
                "what_disagrees": str(item.get("what_disagrees") or ""),
                "which_i_trust": str(item.get("which_i_trust") or ""),
                "why": str(item.get("why") or ""),
            }
        )
    return conflicts


def _parse_best_first_call(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    who = str(raw.get("who") or "").strip()
    if not who:
        return None
    phone = raw.get("phone")
    return {
        "who": who,
        "role": str(raw.get("role") or ""),
        "phone": str(phone).strip() if isinstance(phone, str) and phone.strip() else None,
        "why": str(raw.get("why") or ""),
    }


def _apply_completed(
    plan: ActionPlan,
    research: dict[str, Any],
    *,
    searches: int,
    input_tokens: int,
    output_tokens: int,
    cost_cents: int,
) -> None:
    plan.research = research
    plan.status = ActionPlanStatus.READY
    plan.searches = searches
    plan.input_tokens = input_tokens
    plan.output_tokens = output_tokens
    plan.cost_cents = cost_cents


def _timed_out(plan: ActionPlan, now: datetime) -> bool:
    started = plan.created_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=UTC)
    return now - started >= timedelta(seconds=_timeout_seconds())


def _timeout_seconds() -> int:
    return int(settings.ACTION_PLAN_RESEARCH_TIMEOUT_SECONDS or 240)


def _int_or_zero(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


async def _openai_request(method: str, path: str, *, json_body: dict[str, Any] | None = None) -> dict[str, Any]:
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise ResearchUnavailable("OPENAI_API_KEY not set")
    url = f"{OPENAI_API_BASE}{path}"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        if method == "GET":
            response = await client.get(url, headers=headers)
        elif method == "POST":
            response = await client.post(url, headers=headers, json=json_body or {})
        else:
            raise ValueError(method)
    response.raise_for_status()
    if not response.content:
        return {}
    data = response.json()
    return data if isinstance(data, dict) else {}
