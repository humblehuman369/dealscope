"""No-AI action-plan templates, one per case.

Written like ``task_templates.py``: short checklists in the user's voice,
3–7 tasks, due dates only where a deadline is real. Contacts are filled only
from facts already on the listing — never invented phones or emails.
"""

from __future__ import annotations

from typing import Any

from app.models.action_plan import ActionPlanCase
from app.models.contact import ContactRole
from app.services.action_plan.cases import CASE_LABELS, listing_from_payload, sort_case

# (title, notes, due_offset_days) — same shape as TaskTemplateItem.
PlanTaskItem = tuple[str, str | None, int | None]


_TEMPLATES: dict[ActionPlanCase, list[PlanTaskItem]] = {
    ActionPlanCase.ON_MARKET: [
        ("Call the listing agent and ask why they're selling", None, None),
        ("Confirm list price, days on market, and any price cuts", None, None),
        ("Run the numbers at asking and at my target buy", None, None),
        ("Decide my max offer", None, None),
        ("Decide whether to pursue or pass", None, 7),
    ],
    ActionPlanCase.ON_MARKET_STALE: [
        ("Call the listing agent — this one has been sitting", None, 1),
        ("Ask how many price cuts and what the seller will actually take", None, None),
        ("Ask about inspection issues or offers that fell through", None, None),
        ("Run the numbers at asking and at a cut", None, None),
        ("Decide whether to write an offer this week", None, 3),
    ],
    ActionPlanCase.EXPIRED_OR_ON_HOLD: [
        ("Find who listed it last and call that agent", None, 1),
        ("Ask why it went on hold or expired", None, None),
        ("Confirm the seller still wants out", None, None),
        ("Mail the owner if the agent is a dead end", None, None),
        ("Decide my opening offer", None, 7),
    ],
    ActionPlanCase.OFF_MARKET_ABSENTEE: [
        ("Mail the owner at the mailing address we have", None, None),
        ("Look up the last listing agent and call them", None, None),
        ("Ask the county if there's a pre-foreclosure or tax case", None, None),
        ("Run the numbers before I spend more time on this", None, None),
        ("Decide whether to pursue or pass", None, 7),
    ],
    ActionPlanCase.OFF_MARKET_OWNER_OCCUPIED: [
        ("Mail the owner at the property", None, None),
        ("Drive by and note condition from the street", None, None),
        ("Look up the last listing and its agent", None, None),
        ("Run the numbers before I knock", None, None),
        ("Decide whether to pursue or pass", None, 7),
    ],
    ActionPlanCase.PRE_FORECLOSURE: [
        ("Call the county clerk and ask if a foreclosure case is on file", None, 1),
        ("Write down the case number, plaintiff, and next date if they have it", None, None),
        ("Call the last listing agent — they may still be in touch with the owner", None, None),
        ("Mail the owner at the mailing address", None, None),
        ("Decide whether to pursue before a sale date lands", None, 3),
    ],
    ActionPlanCase.FORECLOSURE_OR_AUCTION: [
        ("Call the county clerk for the case status and sale date", None, 1),
        ("Get the plaintiff's attorney or trustee phone from the clerk", None, None),
        ("Confirm opening bid and remaining balance if it's published", None, None),
        ("Walk the property from the street", None, None),
        ("Set my max bid before auction day", None, None),
        ("Line up cash or hard money if I'm bidding", None, 3),
    ],
    ActionPlanCase.BANK_OWNED: [
        ("Find the listing broker or REO asset manager", None, 1),
        ("Ask about as-is condition, occupancy, and how they take offers", None, None),
        ("Confirm the bank's preferred closing timeline", None, None),
        ("Run the numbers with a conservative rehab", None, None),
        ("Submit the bank's required offer package", None, 7),
    ],
    ActionPlanCase.FSBO: [
        ("Call the owner at the listing number", None, 1),
        ("Ask why they're selling without an agent", None, None),
        ("Confirm timeline and whether they'll consider terms", None, None),
        ("Run the numbers at asking", None, None),
        ("Decide my opening offer", None, 3),
    ],
}


_SUMMARIES: dict[ActionPlanCase, str] = {
    ActionPlanCase.ON_MARKET: (
        "It's listed. Call the agent, confirm the numbers, and decide if the "
        "ask is close enough to write an offer."
    ),
    ActionPlanCase.ON_MARKET_STALE: (
        "It's been sitting. The agent already knows the seller is getting tired. "
        "Call, ask what they'll take, and decide this week."
    ),
    ActionPlanCase.EXPIRED_OR_ON_HOLD: (
        "It was listed and came off. The last agent is the shortest path to the "
        "seller. If that call dies, mail the owner."
    ),
    ActionPlanCase.OFF_MARKET_ABSENTEE: (
        "The owner doesn't live there. Mail them at the mailing address, then "
        "try the last listing agent. Don't hunt for a personal phone."
    ),
    ActionPlanCase.OFF_MARKET_OWNER_OCCUPIED: (
        "Someone lives there. Mail first, drive by, and know your number before "
        "you knock."
    ),
    ActionPlanCase.PRE_FORECLOSURE: (
        "There's a pre-foreclosure flag. Call the clerk for the case, then the "
        "last agent. Mail the owner. Don't scrape a personal phone."
    ),
    ActionPlanCase.FORECLOSURE_OR_AUCTION: (
        "It's in foreclosure or heading to auction. Get the sale date from the "
        "clerk, set a max bid, and don't bid without the money lined up."
    ),
    ActionPlanCase.BANK_OWNED: (
        "The bank owns it. Find the REO broker, learn their offer process, and "
        "underwrite as-is with a conservative rehab."
    ),
    ActionPlanCase.FSBO: (
        "The owner is selling it themselves. Call the listing number, ask why "
        "there's no agent, and see if they'll talk terms."
    ),
}


def _str_or_none(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _join_names(value: Any) -> str | None:
    if isinstance(value, list):
        names = [str(n).strip() for n in value if n and str(n).strip()]
        return ", ".join(names) if names else None
    return _str_or_none(value)


def facts_from_listing(listing: dict[str, Any], *, address: str | None = None) -> list[dict[str, str]]:
    """Known facts only. Missing fields are omitted, never faked."""
    facts: list[dict[str, str]] = []

    def add(label: str, value: Any) -> None:
        text = _str_or_none(value)
        if text is None:
            return
        facts.append({"label": label, "value": text})

    add("Address", address)
    add("Listing status", listing.get("listing_status"))
    if listing.get("is_off_market") is True:
        add("On market", "No")
    elif listing.get("is_off_market") is False:
        add("On market", "Yes")
    add("Days on market", listing.get("days_on_market"))
    add("List price", listing.get("list_price"))
    add("Price cuts", listing.get("price_reduction_count"))
    add("Listing agent", listing.get("listing_agent_name"))
    add("Listing agent phone", listing.get("listing_agent_phone"))
    add("Brokerage", listing.get("brokerage_name"))
    add("Owner", _join_names(listing.get("owner_names")))
    add("Owner mailing address", listing.get("owner_mailing_address"))
    if listing.get("is_absentee_owner") is True:
        add("Absentee owner", "Yes")
    elif listing.get("is_owner_occupied") is True:
        add("Owner-occupied", "Yes")
    if listing.get("is_pre_foreclosure") is True:
        add("Pre-foreclosure", "Yes")
    if listing.get("is_foreclosure") is True:
        add("Foreclosure", "Yes")
    if listing.get("is_auction") is True:
        add("Auction", "Yes")
    if listing.get("is_bank_owned") is True:
        add("Bank-owned", "Yes")
    if listing.get("is_fsbo") is True:
        add("FSBO", "Yes")
    return facts


def contacts_from_listing(listing: dict[str, Any]) -> list[dict[str, Any]]:
    """Contacts we already have. No personal owner phone or email."""
    contacts: list[dict[str, Any]] = []
    agent_name = _str_or_none(listing.get("listing_agent_name"))
    if agent_name:
        contacts.append(
            {
                "name": agent_name,
                "role": ContactRole.LISTING_AGENT.value,
                "company": _str_or_none(listing.get("brokerage_name")),
                "phone": _str_or_none(listing.get("listing_agent_phone")),
                "email": _str_or_none(listing.get("listing_agent_email")),
                "notes": None,
            }
        )
    owner = _join_names(listing.get("owner_names"))
    if owner:
        mailing = _str_or_none(listing.get("owner_mailing_address"))
        contacts.append(
            {
                "name": owner,
                "role": ContactRole.SELLER.value,
                "company": None,
                "phone": None,
                "email": None,
                "notes": f"Mailing address: {mailing}" if mailing else "No phone on file — mail them.",
            }
        )
    return contacts


def tasks_for(case: ActionPlanCase) -> list[PlanTaskItem]:
    return list(_TEMPLATES[case])


def _task_dicts(items: list[PlanTaskItem]) -> list[dict[str, Any]]:
    return [
        {"title": title, "notes": notes, "due_offset_days": due_offset}
        for title, notes, due_offset in items
    ]


def build_template_plan(
    payload: dict[str, Any] | None,
    *,
    address: str | None = None,
    case: ActionPlanCase | None = None,
) -> dict[str, Any]:
    """Build the plan JSON stored on the action_plans row."""
    listing = listing_from_payload(payload)
    resolved = case or sort_case(payload)
    return {
        "summary": _SUMMARIES[resolved],
        "case": resolved.value,
        "case_label": CASE_LABELS[resolved],
        "facts": facts_from_listing(listing, address=address),
        "tasks": _task_dicts(tasks_for(resolved)),
        "contacts": contacts_from_listing(listing),
        "source": "template",
    }
