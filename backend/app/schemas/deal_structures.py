"""Schemas for the Three Paths feature — deal structures shown when Deal Gap is negative."""

from typing import Any, Literal

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
    "blended",
]


class StructureLever(BaseModel):
    """One concrete number-change row in a deal structure card."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    label: str = Field(..., description="Lever name, e.g. 'Price', 'Seller carry'")
    before_label: str = Field(..., description="Baseline value, formatted (e.g. '$410K')")
    after_label: str = Field(..., description="New value, formatted (e.g. '$385K')")
    delta_label: str | None = Field(None, description="Optional delta (e.g. '−6.1%')")  # noqa: RUF001 — U+2212 minus sign is deliberate display formatting


class BreakevenFact(BaseModel):
    """Structured numbers behind one way to breakeven — the UI reads these, never lever text.

    Every figure is produced by the template's own solver; nothing here is derived
    by parsing labels. ``closes_gap_alone`` is False when the template hit a cap
    (e.g. 20% seller carry) and had to lean on another lever to reach cash flow.
    """

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    change_pct: float | None = Field(None, description="Percent change needed, e.g. 33.0 = cut price 33%")
    change_amount: float | None = Field(
        None, description="Dollar change needed: price cut $, rent lift $/mo, carry $, extra down $"
    )
    result_amount: float = Field(..., description="Resulting figure: target buy, target rent, carry, down payment")
    result_label: str = Field(..., description="'Target Buy' | 'Target rent' | 'Seller financing' | 'Down payment'")
    closes_gap_alone: bool = Field(True, description="False when this lever alone could not reach cash flow")
    terms_note: str | None = Field(None, description="e.g. '0% interest, 5-yr balloon' or '35% down'")


NegotiabilityRating = Literal["high", "medium", "low", "your_call"]


class Negotiability(BaseModel):
    """How likely the seller is to agree to this lever, from real listing signals only."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    rating: NegotiabilityRating
    score: int = Field(..., ge=0, le=100)
    reasons: list[str] = Field(default_factory=list, description="Only signals actually present on this property")


class DealStructure(BaseModel):
    """A single deal-structure card returned by the selector."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    id: str = Field(..., description="Stable structure ID (e.g. 'price-negotiation')")
    family: StructureFamily = Field(..., description="Structure family for diversity selection")
    family_label: str = Field(..., description="Short family chip label, e.g. 'Price negotiation'")
    realism_label: str = Field(..., description="Slot label, e.g. 'Most realistic'")
    headline: str = Field(..., description="Card headline (under 60 chars)")
    bullets: list[str] = Field(
        default_factory=list,
        description="2-3 short action bullets shown at the top of the card (replaces headline in UI when present)",
    )
    summary: str = Field(..., description="One-sentence summary under the levers")
    levers: list[StructureLever] = Field(default_factory=list)
    monthly_savings: float = Field(0, description="Estimated monthly cash-flow improvement vs baseline")
    cash_required: float = Field(0, description="Estimated total buyer cash at close")
    ranking_score: float = Field(0, description="0-100 realism score; higher = more plausible")
    pitch_script: str | None = Field(None, description="Negotiation script the buyer can copy/paste")
    caveat: str | None = Field(None, description="Honest one-line caveat shown in card detail")
    selection_reason: str | None = Field(
        None,
        description="Why this structure was selected for this property (shown above levers)",
    )
    pre_loaded_record: dict[str, Any] = Field(
        default_factory=dict,
        description="Partial overrides for Strategy worksheet / Deal Maker (snake_case keys)",
    )
    breakeven: BreakevenFact | None = Field(None, description="Structured breakeven numbers for this way")
    negotiability: Negotiability | None = Field(None, description="Seller-agreement likelihood from listing signals")


class BreakevenSummary(BaseModel):
    """Headline numbers for the Breakeven Analysis section."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    list_price: float = Field(..., description="Asking / market anchor the gap is measured from")
    gap_amount: float = Field(..., description="List price minus Target Buy")
    gap_pct: float = Field(..., description="Gap as percent of list price")
    monthly_shortfall: float = Field(..., description="Negative monthly cash flow at list price, as a positive $")
    income_value: float = Field(..., description="Price at which cash flow is $0 (breakeven)")
    target_buy_price: float = Field(..., description="Income Value less the buy-discount cushion")


class DealStructuresPayload(BaseModel):
    """Three Paths panel payload — included on the verdict response when Deal Gap is negative."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    paths: list[DealStructure] = Field(default_factory=list, description="Up to three selected structures")
    narrative_paragraphs: list[str] = Field(
        default_factory=list,
        description="5th-grade-level walkthrough; each item is one paragraph",
    )
    has_paths: bool = Field(False, description="True when at least one feasible structure was found")
    breakeven_summary: BreakevenSummary | None = Field(None, description="Gap + shortfall for the section header")
    blend_recommendation: str | None = Field(
        None, description="Deterministic sentence: why small concessions on several levers is the probable close"
    )
