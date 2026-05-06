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


# Each template is a (title, optional notes) pair. We keep notes minimal —
# the title is the prompt; notes are reserved for genuinely non-obvious
# clarifications (none in the first cut).
TaskTemplateItem = tuple[str, str | None]


_PRE_PURCHASE_TEMPLATES: dict[str, list[TaskTemplateItem]] = {
    PropertyStatus.PROSPECTING.value: [
        ("Run cap-rate and cash-on-cash analysis", None),
        ("Pull 3 nearby comps", None),
        ("Estimate rehab budget at a high level", None),
        ("Decide your max offer", None),
        ("Decide whether to pursue (or pass)", None),
    ],
    PropertyStatus.PURSUING.value: [
        ("Reach out to listing agent or seller", None),
        ("Confirm seller motivation and timeline", None),
        ("Request property disclosures", None),
        ("Schedule a walkthrough", None),
        ("Verify rent or rehab assumptions on-site", None),
    ],
    PropertyStatus.NEGOTIATING.value: [
        ("Send written offer", None),
        ("Schedule inspection", None),
        ("Confirm financing pre-approval", None),
        ("Negotiate seller concessions", None),
        ("Set inspection-contingency deadline", None),
    ],
    PropertyStatus.UNDER_CONTRACT.value: [
        ("Wire earnest money", None),
        ("Order appraisal", None),
        ("Inspection walkthrough", None),
        ("Lock interest rate", None),
        ("Final loan approval", None),
        ("Schedule closing", None),
    ],
}


_OWNED_BASE_TEMPLATE: list[TaskTemplateItem] = [
    ("Set up utilities in your name", None),
    ("Change locks and access codes", None),
    ("Take baseline photos and video", None),
    ("Update insurance to landlord/builder policy", None),
]


_OWNED_TEMPLATES: dict[str, list[TaskTemplateItem]] = {
    # Flip
    f"flip_{FlipStage.REHAB.value.lower()}": [
        ("Get 3 contractor bids", None),
        ("Pull permits if required", None),
        ("Order materials", None),
        ("Set rehab milestones (demo, rough-in, finish)", None),
    ],
    f"flip_{FlipStage.LISTED.value.lower()}": [
        ("Stage the property", None),
        ("Schedule professional photos", None),
        ("Set first-weekend showings", None),
        ("Review price vs. market every week", None),
    ],
    # BRRRR — diverges from flip after rehab
    f"brrrr_{FlipStage.REHAB.value.lower()}": [
        ("Get 3 contractor bids", None),
        ("Pull permits if required", None),
        ("Track rehab spend against estimator", None),
        ("Plan ARV-driven scope (don't over-improve)", None),
    ],
    f"brrrr_{FlipStage.STABILIZED.value.lower()}": [
        ("Lease unit at market rent", None),
        ("Verify 30-90 day rent seasoning window", None),
        ("Gather lease + rent-roll for refi underwriting", None),
    ],
    f"brrrr_{FlipStage.REFINANCED.value.lower()}": [
        ("Confirm long-term loan terms", None),
        ("Pull cash out at closing", None),
        ("Set up DSCR-loan payment auto-pay", None),
    ],
    # Long-term rental
    f"ltr_{FlipStage.MAKE_READY.value.lower()}": [
        ("Deep clean", None),
        ("Make minor cosmetic repairs", None),
        ("List on Zillow / RentRedi / Apartments.com", None),
        ("Set tenant screening criteria", None),
    ],
    f"ltr_{FlipStage.LEASED.value.lower()}": [
        ("Sign lease", None),
        ("Collect first month + deposit", None),
        ("Set up rent collection (auto-pay if possible)", None),
    ],
    # Short-term rental
    f"str_{FlipStage.SETUP.value.lower()}": [
        ("Furnish and stage", None),
        ("Stock linens, kitchen basics, supplies", None),
        ("Set up Airbnb / VRBO listings", None),
        ("Set dynamic-pricing strategy", None),
        ("Hire a co-host or cleaner", None),
    ],
    f"str_{FlipStage.LIVE.value.lower()}": [
        ("Monitor first 10 reviews closely", None),
        ("Iterate listing photos and copy after first month", None),
        ("Track occupancy + ADR weekly", None),
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
