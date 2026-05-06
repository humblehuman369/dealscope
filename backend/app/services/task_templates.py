"""Stage-templated task suggestions.

Drives the "Suggest common tasks" button in the kanban TasksSlideOver. The
goal is momentum: a curious-aspiring investor opens a saved property's task
list and immediately sees a concrete next-action checklist for whatever
stage the deal is in. Templates are intentionally short (3-5 items each)
and use the user's voice, not a coach's.

Resolution:
    1. Pre-purchase  → keyed by PropertyStatus.value (e.g. "negotiating")
    2. Owned w/o flip_stage → "owned"
    3. Owned w/ flip_stage  → ``f"{strategy}_{flip_stage_value.lower()}"``,
       falling back to "owned" if no specific template exists.

Adding a strategy or stage doesn't require a migration — just append entries
here and the seed endpoint picks them up.
"""

from __future__ import annotations

from app.models.saved_property import FlipStage, PropertyStatus, SavedProperty


# Each template item is (title, notes, due_offset_days). Notes are reserved
# for non-obvious clarifications. due_offset_days is the number of days from
# stage-entry the user should plan to finish the task — we set it only where
# the deadline is real (negotiating, under contract, owned-listed). Stages
# that are exploratory (prospecting, pursuing) leave due dates blank.
TaskTemplateItem = tuple[str, str | None, int | None]


_PRE_PURCHASE_TEMPLATES: dict[str, list[TaskTemplateItem]] = {
    PropertyStatus.PROSPECTING.value: [
        ("Run cap-rate and cash-on-cash analysis", None, None),
        ("Pull 3 nearby comps", None, None),
        ("Estimate rehab budget at a high level", None, None),
        ("Decide your max offer", None, None),
        ("Decide whether to pursue (or pass)", None, 7),
    ],
    PropertyStatus.PURSUING.value: [
        ("Reach out to listing agent or seller", None, 1),
        ("Confirm seller motivation and timeline", None, 3),
        ("Request property disclosures", None, 3),
        ("Schedule a walkthrough", None, 5),
        ("Verify rent or rehab assumptions on-site", None, 7),
    ],
    PropertyStatus.NEGOTIATING.value: [
        ("Send written offer", None, 1),
        ("Schedule inspection", None, 3),
        ("Confirm financing pre-approval", None, 3),
        ("Negotiate seller concessions", None, 5),
        ("Set inspection-contingency deadline", None, 7),
    ],
    PropertyStatus.UNDER_CONTRACT.value: [
        ("Wire earnest money", None, 2),
        ("Order appraisal", None, 5),
        ("Inspection walkthrough", None, 7),
        ("Lock interest rate", None, 10),
        ("Final loan approval", None, 21),
        ("Schedule closing", None, 30),
    ],
}


_OWNED_BASE_TEMPLATE: list[TaskTemplateItem] = [
    ("Set up utilities in your name", None, 3),
    ("Change locks and access codes", None, 3),
    ("Take baseline photos and video", None, 7),
    ("Update insurance to landlord/builder policy", None, 7),
]


_OWNED_TEMPLATES: dict[str, list[TaskTemplateItem]] = {
    # Flip
    f"flip_{FlipStage.REHAB.value.lower()}": [
        ("Get 3 contractor bids", None, 7),
        ("Pull permits if required", None, 14),
        ("Order materials", None, 14),
        ("Set rehab milestones (demo, rough-in, finish)", None, 7),
    ],
    f"flip_{FlipStage.LISTED.value.lower()}": [
        ("Stage the property", None, 3),
        ("Schedule professional photos", None, 3),
        ("Set first-weekend showings", None, 5),
        ("Review price vs. market every week", None, 7),
    ],
    # BRRRR — diverges from flip after rehab
    f"brrrr_{FlipStage.REHAB.value.lower()}": [
        ("Get 3 contractor bids", None, 7),
        ("Pull permits if required", None, 14),
        ("Track rehab spend against estimator", None, 7),
        ("Plan ARV-driven scope (don't over-improve)", None, 14),
    ],
    f"brrrr_{FlipStage.STABILIZED.value.lower()}": [
        ("Lease unit at market rent", None, 14),
        ("Verify 30-90 day rent seasoning window", None, 30),
        ("Gather lease + rent-roll for refi underwriting", None, 60),
    ],
    f"brrrr_{FlipStage.REFINANCED.value.lower()}": [
        ("Confirm long-term loan terms", None, 7),
        ("Pull cash out at closing", None, 14),
        ("Set up DSCR-loan payment auto-pay", None, 30),
    ],
    # Long-term rental
    f"ltr_{FlipStage.MAKE_READY.value.lower()}": [
        ("Deep clean", None, 3),
        ("Make minor cosmetic repairs", None, 7),
        ("List on Zillow / RentRedi / Apartments.com", None, 7),
        ("Set tenant screening criteria", None, 7),
    ],
    f"ltr_{FlipStage.LEASED.value.lower()}": [
        ("Sign lease", None, 1),
        ("Collect first month + deposit", None, 1),
        ("Set up rent collection (auto-pay if possible)", None, 7),
    ],
    # Short-term rental
    f"str_{FlipStage.SETUP.value.lower()}": [
        ("Furnish and stage", None, 14),
        ("Stock linens, kitchen basics, supplies", None, 14),
        ("Set up Airbnb / VRBO listings", None, 21),
        ("Set dynamic-pricing strategy", None, 21),
        ("Hire a co-host or cleaner", None, 21),
    ],
    f"str_{FlipStage.LIVE.value.lower()}": [
        ("Monitor first 10 reviews closely", None, 30),
        ("Iterate listing photos and copy after first month", None, 30),
        ("Track occupancy + ADR weekly", None, 7),
    ],
}


def _resolve_strategy(best_strategy: str | None) -> str:
    s = (best_strategy or "").lower()
    if s in {"flip", "brrrr", "ltr", "str"}:
        return s
    # Wholesale lives in the pre-purchase pipeline; subject_to has no template
    # set yet. Default to flip — most common owned trajectory.
    return "flip"


def template_key_for(property_: SavedProperty) -> str | None:
    """Return the template-dict key for the property's current state."""
    if property_.status != PropertyStatus.OWNED:
        return property_.status.value
    if property_.flip_stage is None:
        return "owned"
    strategy = _resolve_strategy(property_.best_strategy)
    return f"{strategy}_{property_.flip_stage.value.lower()}"


def template_for(property_: SavedProperty) -> list[TaskTemplateItem]:
    """Return the template items for this property (empty if none defined)."""
    key = template_key_for(property_)
    if key is None:
        return []
    if key in _PRE_PURCHASE_TEMPLATES:
        return list(_PRE_PURCHASE_TEMPLATES[key])
    if key == "owned":
        return list(_OWNED_BASE_TEMPLATE)
    if key in _OWNED_TEMPLATES:
        return list(_OWNED_TEMPLATES[key])
    # Fall back to the generic owned-base template if a strategy/stage combo
    # isn't covered yet — better to seed something useful than nothing.
    return list(_OWNED_BASE_TEMPLATE)


def template_label_for(property_: SavedProperty) -> str:
    """Human-friendly label used by the seed-button affordance."""
    if property_.status != PropertyStatus.OWNED:
        # Title-case the status. e.g. "under_contract" → "Under Contract"
        return property_.status.value.replace("_", " ").title()
    if property_.flip_stage is None:
        return "Owned"
    strategy = _resolve_strategy(property_.best_strategy).upper()
    return f"{strategy} · {property_.flip_stage.value}"
