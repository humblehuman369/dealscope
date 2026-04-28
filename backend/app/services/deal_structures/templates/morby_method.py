"""Morby Method — Sub2 + seller 0% 2nd when both structures are independently feasible.

Not in ``ALL_TEMPLATES``; the selector injects this when both ``sub2`` and
``seller-second-zero-balloon`` return non-null.
"""

from __future__ import annotations

from app.schemas.deal_structures import DealStructure, StructureLever
from app.services.deal_structures.context import StructureContext
from app.services.deal_structures.templates.seller_second_zero_balloon import DEFAULT_BALLOON_YEARS

FAMILY = "financing"
FAMILY_LABEL = "Creative finance"
ID = "morby-method"


def combine(sub2_result: DealStructure, seller_second_result: DealStructure, _ctx: StructureContext) -> DealStructure:
    """Merge two financing structures into one named card."""
    ranking = min(100.0, max(sub2_result.ranking_score, seller_second_result.ranking_score) + 4.0)
    monthly_savings = max(sub2_result.monthly_savings, seller_second_result.monthly_savings)
    cash_required = max(sub2_result.cash_required, seller_second_result.cash_required)

    sub_extras = (sub2_result.pre_loaded_record or {}).get("pending_extras") or {}
    ss_extras = (seller_second_result.pre_loaded_record or {}).get("pending_extras") or {}
    merged_extras: dict = {**dict(sub_extras), **dict(ss_extras)}
    merged_extras["three_paths_structure_id"] = ID

    pitch = (
        f"{sub2_result.pitch_script or ''}\n\n{seller_second_result.pitch_script or ''}".strip()
    )

    headline = "The Morby Method — Sub2 + seller carry"
    summary = (
        "Combine taking over the seller's existing loan with a 0% seller second for the equity gap—"
        "both legs lower your payment versus a single new bank loan at today's rates."
    )

    levers: list[StructureLever] = []
    for lv in sub2_result.levers[:4]:
        levers.append(
            StructureLever(
                label=f"Sub2 — {lv.label}",
                before_label=lv.before_label,
                after_label=lv.after_label,
                delta_label=lv.delta_label,
            )
        )
    for lv in seller_second_result.levers[:4]:
        levers.append(
            StructureLever(
                label=f"Seller 2nd — {lv.label}",
                before_label=lv.before_label,
                after_label=lv.after_label,
                delta_label=lv.delta_label,
            )
        )

    caveat = (
        f"{sub2_result.caveat or ''} "
        f"{seller_second_result.caveat or ''}".strip()
    )

    sel_reason = (
        "Shown because both taking over the seller's loan and a 0% seller second can work here—"
        "this bundles the pattern investors call the Morby Method."
    )

    return DealStructure(
        id=ID,
        family=FAMILY,
        family_label=FAMILY_LABEL,
        realism_label="Named pattern",
        headline=headline,
        summary=summary,
        levers=levers[:8],
        monthly_savings=round(monthly_savings, 2),
        cash_required=float(cash_required),
        ranking_score=ranking,
        pitch_script=pitch[:4000],
        caveat=caveat[:1500] or None,
        selection_reason=sel_reason,
        pre_loaded_record={
            "pending_extras": merged_extras,
            "seller_carry_amount": ss_extras.get("seller_carry_amount"),
            "seller_carry_rate": ss_extras.get("seller_carry_rate", 0.0),
            "seller_carry_term_years": ss_extras.get("seller_carry_term_years", DEFAULT_BALLOON_YEARS),
            "seller_carry_balloon_years": DEFAULT_BALLOON_YEARS,
        },
    )
