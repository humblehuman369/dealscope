"""Rewrite the stored plan from research findings via Claude.

Copies the Anthropic client + JSON-parse pattern from
``plan_narrative_service.py``, with a 60-second timeout. On any failure
(no key, timeout, bad JSON) the template plan is returned unchanged, then
UNVERIFIED findings are still attached as "confirm this" tasks.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from app.core.config import settings
from app.models.action_plan import ActionPlanCase
from app.models.contact import ContactRole
from app.services.action_plan.cases import CASE_LABELS

logger = logging.getLogger(__name__)

WRITER_TIMEOUT_SECONDS = 60.0
MODEL = "claude-sonnet-4-20250514"

_CONTACT_FIELD_HINTS = (
    "agent",
    "broker",
    "attorney",
    "lawyer",
    "firm",
    "lender",
    "plaintiff",
    "trustee",
    "clerk",
    "phone",
    "manager",
    "reo",
    "auctioneer",
)

_anthropic_client = None
_anthropic_checked = False

SYSTEM_PROMPT = """You write the next-move plan for a real estate investor. You are given the case, the facts the platform already has, the research findings and conflicts, and the no-AI template plan.

Return strict JSON with exactly these keys:
{"summary": "<two or three sentences>", "tasks": [{"title": "...", "notes": "<who to call and what to ask>", "due_offset_days": null}], "contacts": [{"name": "...", "role": "listing_agent", "company": null, "phone": null, "email": null, "notes": null}]}

Rules.
1. Use ONLY the facts and findings given. Never invent a phone, email, case number, filing date, auction date, judgment, or sale result.
2. Speak to the investor ("you"). Short. Same voice as the template.
3. Three to seven tasks, ordered. Each task names who to call and what to ask in notes.
4. A finding marked VERIFIED may be treated as known. A finding marked UNVERIFIED must not be assumed. For each UNVERIFIED finding, include a task whose title is exactly "Confirm this: {field with underscores turned into spaces}" and do not write any other task that treats that value as true.
5. When findings conflict, say so in the summary. Do not pick a side as certain.
6. Contacts only from known facts and VERIFIED business numbers (agents, brokerages, lenders, law firms, county offices). Never a personal owner phone or email.
7. Contact role must be one of: seller, listing_agent, buyer_agent, lender, contractor, inspector, attorney, title_company, insurance, property_manager, other.
8. Do not use headers, bullets, or markdown outside the JSON."""


def confirm_task_title(field: str) -> str:
    return f"Confirm this: {_human_field(field)}"


def _human_field(field: str) -> str:
    return " ".join(str(field or "").replace("_", " ").split()).strip() or "this fact"


def _ensure_anthropic():
    """Lazy-load a dedicated Anthropic client (60s timeout, no retries)."""
    global _anthropic_client, _anthropic_checked

    if _anthropic_checked:
        return _anthropic_client

    _anthropic_checked = True
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        logger.info("ANTHROPIC_API_KEY not set — action plan writer will use the template")
        return None

    try:
        import anthropic

        _anthropic_client = anthropic.Anthropic(
            api_key=api_key, timeout=WRITER_TIMEOUT_SECONDS, max_retries=0
        )
        return _anthropic_client
    except Exception as exc:
        logger.error("Action plan writer Anthropic client init failed: %s", exc)
        return None


def _parse_ai_json(text: str) -> dict[str, Any] | None:
    cleaned = (text or "").strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        data = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    summary = str(data.get("summary") or "").strip()
    tasks = _parse_tasks(data.get("tasks"))
    if not summary or not tasks:
        return None
    return {
        "summary": summary,
        "tasks": tasks,
        "contacts": _parse_contacts(data.get("contacts")),
    }


def _parse_tasks(raw: Any) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if not isinstance(raw, list):
        return items
    for item in raw:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        due = item.get("due_offset_days")
        try:
            due_offset = int(due) if due is not None and str(due).strip() != "" else None
        except (TypeError, ValueError):
            due_offset = None
        notes = item.get("notes")
        items.append(
            {
                "title": title,
                "notes": str(notes).strip() if notes else None,
                "due_offset_days": due_offset,
            }
        )
    return items


def _parse_contacts(raw: Any) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if not isinstance(raw, list):
        return items
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        items.append(
            {
                "name": name,
                "role": _coerce_role(item.get("role")),
                "company": _str_or_none(item.get("company")),
                "phone": _str_or_none(item.get("phone")),
                "email": _str_or_none(item.get("email")),
                "notes": _str_or_none(item.get("notes")),
            }
        )
    return items


def _coerce_role(raw: Any) -> str:
    value = str(raw or "").strip().lower()
    try:
        return ContactRole(value).value
    except ValueError:
        return ContactRole.OTHER.value


def _str_or_none(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def role_from_finding(field: str, research_role: str | None = None) -> ContactRole:
    blob = f"{field} {research_role or ''}".lower()
    if "attorney" in blob or "lawyer" in blob or "law firm" in blob or "law_firm" in blob:
        return ContactRole.ATTORNEY
    if "lender" in blob or "plaintiff" in blob or "trustee" in blob:
        return ContactRole.LENDER
    if "agent" in blob or "broker" in blob or "reo" in blob or "auctioneer" in blob:
        return ContactRole.LISTING_AGENT
    if "seller" in blob or "owner" in blob:
        return ContactRole.SELLER
    return ContactRole.OTHER


def finding_is_contact(field: str) -> bool:
    blob = (field or "").lower()
    return any(hint in blob for hint in _CONTACT_FIELD_HINTS)


def finding_contact(finding: dict[str, Any]) -> dict[str, Any] | None:
    field = str(finding.get("field") or "")
    if not finding_is_contact(field):
        return None
    value = str(finding.get("value") or "").strip()
    status = str(finding.get("status") or "").upper()
    if status not in {"VERIFIED", "UNVERIFIED"}:
        return None
    name, company, phone = _split_contact_value(field, value)
    if not name:
        return None
    notes = _verification_notes(status, finding.get("source_url"), finding.get("note"))
    return {
        "name": name,
        "role": role_from_finding(field).value,
        "company": company,
        "phone": phone,
        "email": None,
        "notes": notes,
    }


def _split_contact_value(field: str, value: str) -> tuple[str, str | None, str | None]:
    if _looks_like_phone(value):
        return _human_field(field).title(), None, value
    name = value
    company = None
    if "," in value:
        left, right = value.split(",", 1)
        if left.strip() and right.strip():
            name, company = left.strip(), right.strip()
    if "phone" in field.lower() and not _looks_like_phone(value):
        return name, company, None
    return name, company, None


def _looks_like_phone(value: str) -> bool:
    digits = "".join(ch for ch in value if ch.isdigit())
    return 10 <= len(digits) <= 11


def _verification_notes(status: str, source_url: Any, note: Any) -> str:
    lines = [status]
    url = _str_or_none(source_url)
    if url:
        lines.append(url)
    extra = _str_or_none(note)
    if extra:
        lines.append(extra)
    return "\n".join(lines)


def confirm_tasks_from_research(research: dict[str, Any] | None) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    if not isinstance(research, dict):
        return tasks
    for item in research.get("findings") or []:
        if not isinstance(item, dict):
            continue
        if str(item.get("status") or "").upper() != "UNVERIFIED":
            continue
        field = str(item.get("field") or "").strip()
        if not field:
            continue
        tasks.append(
            {
                "title": confirm_task_title(field),
                "notes": _verification_notes(
                    "UNVERIFIED",
                    item.get("source_url"),
                    item.get("note") or "Do not treat this as known until you confirm it.",
                ),
                "due_offset_days": 1,
            }
        )
    return tasks


def contacts_from_research(research: dict[str, Any] | None) -> list[dict[str, Any]]:
    contacts: list[dict[str, Any]] = []
    if not isinstance(research, dict):
        return contacts

    def add(item: dict[str, Any] | None) -> None:
        if not item:
            return
        key = (item["name"].strip().lower(), item["role"])
        for existing in contacts:
            if (existing["name"].strip().lower(), existing["role"]) == key:
                if not existing.get("phone") and item.get("phone"):
                    existing["phone"] = item["phone"]
                return
        contacts.append(item)

    for finding in research.get("findings") or []:
        if isinstance(finding, dict):
            add(finding_contact(finding))

    best = research.get("best_first_call")
    if isinstance(best, dict) and best.get("who"):
        role = role_from_finding(str(best.get("role") or ""), str(best.get("role") or "")).value
        add(
            {
                "name": str(best["who"]).strip(),
                "role": role if role != ContactRole.OTHER.value else role_from_finding("listing_agent").value,
                "company": None,
                "phone": _str_or_none(best.get("phone")),
                "email": None,
                "notes": _str_or_none(best.get("why")),
            }
        )
    return contacts


def merge_research_into_plan(plan: dict[str, Any], research: dict[str, Any] | None) -> dict[str, Any]:
    """Attach confirm-this tasks and research contacts without dropping the plan."""
    merged = dict(plan)
    tasks = list(merged.get("tasks") or [])
    existing_titles = {
        str(item.get("title") or "").strip().lower()
        for item in tasks
        if isinstance(item, dict)
    }
    for task in confirm_tasks_from_research(research):
        if task["title"].lower() not in existing_titles:
            tasks.append(task)
            existing_titles.add(task["title"].lower())
    merged["tasks"] = tasks

    contacts = list(merged.get("contacts") or [])
    existing_keys = {
        (str(item.get("name") or "").strip().lower(), str(item.get("role") or ""))
        for item in contacts
        if isinstance(item, dict) and item.get("name")
    }
    for contact in contacts_from_research(research):
        key = (contact["name"].lower(), contact["role"])
        if key in existing_keys:
            continue
        contacts.append(contact)
        existing_keys.add(key)
    merged["contacts"] = contacts
    return merged


def _user_prompt(
    case: ActionPlanCase,
    template: dict[str, Any],
    research: dict[str, Any] | None,
) -> str:
    payload = {
        "case": case.value,
        "case_label": CASE_LABELS.get(case, case.value),
        "known_facts": template.get("facts") or [],
        "template_summary": template.get("summary") or "",
        "template_tasks": template.get("tasks") or [],
        "template_contacts": template.get("contacts") or [],
        "findings": (research or {}).get("findings") or [],
        "conflicts": (research or {}).get("conflicts") or [],
        "not_found": (research or {}).get("not_found") or [],
        "best_first_call": (research or {}).get("best_first_call"),
    }
    return (
        "Write the final action plan from these facts only. "
        "Return JSON.\n\n"
        + json.dumps(payload, default=str)
    )


def _call_claude(
    client: Any,
    case: ActionPlanCase,
    template: dict[str, Any],
    research: dict[str, Any] | None,
) -> dict[str, Any] | None:
    message = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _user_prompt(case, template, research)}],
    )
    text = "".join(block.text for block in message.content if getattr(block, "type", "") == "text")
    return _parse_ai_json(text)


def _with_template_shell(template: dict[str, Any], written: dict[str, Any]) -> dict[str, Any]:
    return {
        **template,
        "summary": written["summary"],
        "tasks": written["tasks"],
        "contacts": written["contacts"],
        "source": "ai",
    }


async def write_plan(
    *,
    case: ActionPlanCase,
    template: dict[str, Any],
    research: dict[str, Any] | None,
) -> dict[str, Any]:
    """Return the final plan JSON. Never raises — template on any AI failure."""
    fallback = dict(template) if isinstance(template, dict) else {}
    client = _ensure_anthropic()
    if client is None:
        return merge_research_into_plan(fallback, research)

    try:
        parsed = await asyncio.wait_for(
            asyncio.to_thread(_call_claude, client, case, fallback, research),
            timeout=WRITER_TIMEOUT_SECONDS,
        )
        if parsed:
            return merge_research_into_plan(_with_template_shell(fallback, parsed), research)
    except TimeoutError:
        logger.warning("Action plan writer timed out after %.0fs, using template", WRITER_TIMEOUT_SECONDS)
    except Exception as exc:
        logger.warning("Action plan writer failed, using template: %s", exc)

    return merge_research_into_plan(fallback, research)
