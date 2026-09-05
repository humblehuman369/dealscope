"""Schemas for the Make It Work plan endpoints (narrative, claim, magic link)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class WizardAnswers(BaseModel):
    cash: str | None = None
    priority: str | None = None
    terms: str | None = None
    owner_occupy: bool | None = Field(None, alias="ownerOccupy")

    model_config = {"populate_by_name": True}


class PlanLever(BaseModel):
    label: str = Field(..., max_length=80)
    before_label: str = Field("", max_length=80)
    after_label: str = Field("", max_length=120)


class PlanNarrativeRequest(BaseModel):
    address: str = Field(..., max_length=300)
    family: str = Field(..., max_length=30)
    family_label: str = Field(..., max_length=80)
    headline: str = Field(..., max_length=200)
    bullets: list[str] = Field(default_factory=list, max_length=6)
    levers: list[PlanLever] = Field(default_factory=list, max_length=6)
    monthly_savings: float = 0.0
    cash_required: float = 0.0
    list_price: float | None = None
    target_buy_price: float | None = None
    wizard_answers: WizardAnswers = Field(default_factory=WizardAnswers)

    @field_validator("bullets")
    @classmethod
    def _trim_bullets(cls, v: list[str]) -> list[str]:
        return [b[:200] for b in v]


class PlanNarrativeResponse(BaseModel):
    summary: str
    pitch: str
    source: Literal["ai", "template"]


class BreakevenWayInput(BaseModel):
    """One row of the Breakeven Analysis section, as the frontend already shows it."""

    family: Literal["price", "income", "financing", "capital_stack"]
    name: str = Field(..., max_length=40)
    change_pct: float | None = None
    change_amount: float | None = None
    result_amount: float
    result_label: str = Field(..., max_length=40)
    closes_gap_alone: bool = True
    terms_note: str | None = Field(None, max_length=160)
    rating: Literal["high", "medium", "low", "your_call"] | None = None
    reasons: list[str] = Field(default_factory=list, max_length=8)
    cash_required: float | None = Field(None, description="Cash to close under this lever")

    @field_validator("reasons")
    @classmethod
    def _trim_reasons(cls, v: list[str]) -> list[str]:
        return [r[:200] for r in v]


class BreakevenNarrativeRequest(BaseModel):
    address: str = Field(..., max_length=300)
    list_price: float | None = None
    target_buy_price: float | None = None
    income_value: float | None = None
    gap_amount: float | None = None
    gap_pct: float | None = None
    monthly_shortfall: float | None = None
    baseline_cash_required: float | None = None
    ways: list[BreakevenWayInput] = Field(default_factory=list, max_length=4)
    blend_recommendation: str | None = Field(None, max_length=600)


class BreakevenNarrativeResponse(BaseModel):
    """The one thing the numbers can't supply: what to actually do.

    Deliberately not a per-lever paragraph. Each row already shows its own
    change, result, and likelihood; restating those in prose is what made the
    section read like notes. This is sequencing and a walk-away instead.
    """

    move: str = Field(..., description="The opening play and the order of asks")
    walk_away: str = Field(..., description="The line past which this stops being a deal")
    source: Literal["ai", "template"]


class PlanScenario(BaseModel):
    """Mirror of the frontend ``ScenarioPayloadV1``."""

    v: int = 1
    structure_id: str = Field(..., alias="structureId", max_length=80)
    family: str = Field(..., max_length=30)
    label: str = Field("", max_length=120)
    levers: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class PlanAddressParts(BaseModel):
    street: str = Field(..., max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=10)
    zip: str | None = Field(None, max_length=20)


class PlanClaimRequest(BaseModel):
    email: EmailStr
    address: str = Field(..., max_length=500)
    address_parts: PlanAddressParts
    zpid: str | None = Field(None, max_length=50)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    property_snapshot: dict[str, Any] = Field(default_factory=dict)
    scenario: PlanScenario | None = None
    wizard_answers: WizardAnswers = Field(default_factory=WizardAnswers)
    narrative: PlanNarrativeResponse | None = None


class PlanClaimResponse(BaseModel):
    status: Literal["accepted"] = "accepted"
    message: str = "If that address is valid, your plan is on its way."


class MagicLinkConsumeRequest(BaseModel):
    token: str = Field(..., min_length=16, max_length=256)


class MagicLinkConsumeResponse(BaseModel):
    redirect: str
    access_token: str | None = None
    refresh_token: str | None = None
