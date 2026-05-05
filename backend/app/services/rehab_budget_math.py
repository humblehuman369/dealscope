"""
Rehab line pricing — mirrors frontend/src/lib/analytics.ts REHAB_CATEGORIES.
Used to validate / seed server-side budgets from estimator selections.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class RehabItemSpec:
    category_id: str
    item_id: str
    name: str
    low: Decimal
    mid: Decimal
    high: Decimal


# fmt: off
_REHAB_ITEMS: dict[str, RehabItemSpec] = {
    "cabinets": RehabItemSpec("kitchen", "cabinets", "Cabinets", Decimal("3000"), Decimal("8000"), Decimal("20000")),
    "countertops": RehabItemSpec("kitchen", "countertops", "Countertops", Decimal("1500"), Decimal("4000"), Decimal("10000")),
    "appliances": RehabItemSpec("kitchen", "appliances", "Appliances Package", Decimal("2000"), Decimal("5000"), Decimal("15000")),
    "backsplash": RehabItemSpec("kitchen", "backsplash", "Backsplash", Decimal("400"), Decimal("1200"), Decimal("3000")),
    "sink_faucet": RehabItemSpec("kitchen", "sink_faucet", "Sink & Faucet", Decimal("300"), Decimal("800"), Decimal("2000")),
    "full_bath": RehabItemSpec("bathroom", "full_bath", "Full Bath Remodel", Decimal("5000"), Decimal("12000"), Decimal("30000")),
    "half_bath": RehabItemSpec("bathroom", "half_bath", "Half Bath Remodel", Decimal("2500"), Decimal("6000"), Decimal("15000")),
    "vanity": RehabItemSpec("bathroom", "vanity", "Vanity & Sink", Decimal("300"), Decimal("800"), Decimal("2500")),
    "toilet": RehabItemSpec("bathroom", "toilet", "Toilet", Decimal("150"), Decimal("400"), Decimal("1000")),
    "tub_shower": RehabItemSpec("bathroom", "tub_shower", "Tub/Shower", Decimal("500"), Decimal("2000"), Decimal("6000")),
    "lvp": RehabItemSpec("flooring", "lvp", "Luxury Vinyl Plank", Decimal("3"), Decimal("6"), Decimal("10")),
    "hardwood": RehabItemSpec("flooring", "hardwood", "Hardwood", Decimal("6"), Decimal("12"), Decimal("20")),
    "tile": RehabItemSpec("flooring", "tile", "Tile", Decimal("5"), Decimal("10"), Decimal("20")),
    "carpet": RehabItemSpec("flooring", "carpet", "Carpet", Decimal("2"), Decimal("5"), Decimal("10")),
    "interior_paint": RehabItemSpec("paint", "interior_paint", "Interior Paint", Decimal("1.5"), Decimal("3"), Decimal("5")),
    "exterior_paint": RehabItemSpec("paint", "exterior_paint", "Exterior Paint", Decimal("2000"), Decimal("5000"), Decimal("12000")),
    "drywall_repair": RehabItemSpec("paint", "drywall_repair", "Drywall Repair", Decimal("200"), Decimal("500"), Decimal("1500")),
    "hvac": RehabItemSpec("systems", "hvac", "HVAC System", Decimal("4000"), Decimal("8000"), Decimal("15000")),
    "water_heater": RehabItemSpec("systems", "water_heater", "Water Heater", Decimal("800"), Decimal("1500"), Decimal("3500")),
    "electrical_panel": RehabItemSpec("systems", "electrical_panel", "Electrical Panel", Decimal("1500"), Decimal("3000"), Decimal("6000")),
    "plumbing_repipe": RehabItemSpec("systems", "plumbing_repipe", "Plumbing Repipe", Decimal("4000"), Decimal("8000"), Decimal("15000")),
    "roof": RehabItemSpec("exterior", "roof", "Roof Replacement", Decimal("8000"), Decimal("15000"), Decimal("30000")),
    "siding": RehabItemSpec("exterior", "siding", "Siding", Decimal("5000"), Decimal("12000"), Decimal("25000")),
    "windows": RehabItemSpec("exterior", "windows", "Windows", Decimal("300"), Decimal("600"), Decimal("1200")),
    "front_door": RehabItemSpec("exterior", "front_door", "Front Door", Decimal("500"), Decimal("1500"), Decimal("4000")),
    "landscaping": RehabItemSpec("exterior", "landscaping", "Landscaping", Decimal("1000"), Decimal("3000"), Decimal("10000")),
    "permits": RehabItemSpec("other", "permits", "Permits", Decimal("500"), Decimal("1500"), Decimal("5000")),
    "dumpster": RehabItemSpec("other", "dumpster", "Dumpster Rental", Decimal("400"), Decimal("600"), Decimal("1000")),
    "cleaning": RehabItemSpec("other", "cleaning", "Deep Cleaning", Decimal("200"), Decimal("500"), Decimal("1000")),
    "staging": RehabItemSpec("other", "staging", "Staging", Decimal("500"), Decimal("2000"), Decimal("5000")),
}
# fmt: on


def unit_cost_for_tier(spec: RehabItemSpec, tier: str, cost_override: Decimal | None) -> Decimal:
    if cost_override is not None:
        return cost_override
    if tier == "low":
        return spec.low
    if tier == "mid":
        return spec.mid
    if tier == "high":
        return spec.high
    raise ValueError(f"Invalid tier: {tier}")


def compute_lines_from_selections(
    selections: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], Decimal]:
    """
    Returns (line dicts for ORM, subtotal ex contingency).
    Each selection: itemId, quantity, tier, costOverride optional.
    """
    lines: list[dict[str, Any]] = []
    subtotal = Decimal("0")
    sort_order = 0
    for sel in selections:
        item_id = sel.get("itemId") or sel.get("item_id")
        if not item_id or item_id not in _REHAB_ITEMS:
            continue
        spec = _REHAB_ITEMS[item_id]
        qty = Decimal(str(sel.get("quantity", 1)))
        tier = str(sel.get("tier", "mid"))
        override = sel.get("costOverride")
        if override is not None:
            co = Decimal(str(override))
        else:
            co = None
        unit = unit_cost_for_tier(spec, tier, co)
        amount = (unit * qty).quantize(Decimal("0.01"))
        subtotal += amount
        lines.append(
            {
                "category_id": spec.category_id,
                "item_id": spec.item_id,
                "label": spec.name,
                "tier": tier,
                "quantity": qty,
                "unit_cost": unit,
                "estimate_amount": amount,
                "sort_order": sort_order,
            }
        )
        sort_order += 1
    return lines, subtotal


def grand_total(subtotal: Decimal, contingency_pct: Decimal) -> Decimal:
    cont = (subtotal * contingency_pct).quantize(Decimal("0.01"))
    return (subtotal + cont).quantize(Decimal("0.01"))
