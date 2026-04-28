"""Schemas for the Three Paths feature — deal structures shown when Deal Gap is negative."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


StructureFamily = Literal[
    "price",
    "capital_stack",
    "financing",
    "income",
    "strategy_switch",
]


class StructureLever(BaseModel):
    """One concrete number-change row in a deal structure card."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    label: str = Field(..., description="Lever name, e.g. 'Price', 'Seller carry'")
    before_label: str = Field(..., description="Baseline value, formatted (e.g. '$410K')")
    after_label: str = Field(..., description="New value, formatted (e.g. '$385K')")
    delta_label: str | None = Field(None, description="Optional delta (e.g. '−6.1%')")


class DealStructure(BaseModel):
    """A single deal-structure card returned by the selector."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    id: str = Field(..., description="Stable structure ID (e.g. 'price-negotiation')")
    family: StructureFamily = Field(..., description="Structure family for diversity selection")
    family_label: str = Field(..., description="Short family chip label, e.g. 'Price negotiation'")
    realism_label: str = Field(..., description="Slot label, e.g. 'Most realistic'")
    headline: str = Field(..., description="Card headline (under 60 chars)")
    summary: str = Field(..., description="One-sentence summary under the levers")
    levers: list[StructureLever] = Field(default_factory=list)
    monthly_savings: float = Field(0, description="Estimated monthly cash-flow improvement vs baseline")
    cash_required: float = Field(0, description="Estimated total buyer cash at close")
    ranking_score: float = Field(0, description="0-100 realism score; higher = more plausible")
    pitch_script: str | None = Field(None, description="Negotiation script the buyer can copy/paste")
    caveat: str | None = Field(None, description="Honest one-line caveat shown in card detail")


class DealStructuresPayload(BaseModel):
    """Three Paths panel payload — included on the verdict response when Deal Gap is negative."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    paths: list[DealStructure] = Field(default_factory=list, description="Up to three selected structures")
    narrative_paragraphs: list[str] = Field(
        default_factory=list,
        description="5th-grade-level walkthrough; each item is one paragraph",
    )
    has_paths: bool = Field(False, description="True when at least one feasible structure was found")
