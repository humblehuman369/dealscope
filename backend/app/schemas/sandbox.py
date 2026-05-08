"""Activation Arc Phase 0 (B2) — schemas for the Build Your Deal sandbox.

Compact request/response shapes designed for slider responsiveness on the
verdict page. The sandbox endpoint recomputes the Deal Gap, motivating tier,
cash flow, and cash-to-close given user adjustments — without re-running the
six-strategy verdict pipeline. See ``app.services.sandbox`` for the math and
``docs/feature-plans/ACTIVATION_ARC.md`` §5 for the doctrine.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class SandboxAdjustments(BaseModel):
    """User's slider state — partial overrides applied to the base verdict input.

    Each field is optional; when None the corresponding base value is used.
    Designed to be sent on every slider drag; keeping the payload small lets
    the endpoint hit ≤100ms p95 even on 4G mobile.
    """

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    price: float | None = Field(
        None, ge=0, le=100_000_000, description="Adjusted purchase price (dollars)"
    )
    monthly_rent: float | None = Field(
        None, ge=0, le=1_000_000, description="Adjusted monthly rent (dollars)"
    )
    down_payment_pct: float | None = Field(
        None, ge=0, le=1, description="Adjusted down-payment fraction (e.g. 0.25 = 25%)"
    )
    seller_carry_amount: float | None = Field(
        None,
        ge=0,
        le=100_000_000,
        description=(
            "Dollars carried by the seller as a 0%-interest second note. "
            "Reduces buyer cash to close one-for-one without affecting the "
            "bank loan amount or monthly P&I."
        ),
    )


class SandboxBaseInputs(BaseModel):
    """Resolved property + assumption inputs for the sandbox recompute.

    Mirrors the relevant fields of ``IQVerdictInput`` after assumption
    resolution. The frontend caches the verdict response and replays these
    same values on every slider drag — the sandbox endpoint never reads from
    the DB or external APIs, which keeps it fast and pure.
    """

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    list_price: float = Field(..., ge=0, le=100_000_000)
    monthly_rent: float = Field(..., ge=0, le=1_000_000)
    property_taxes_annual: float = Field(0, ge=0, le=10_000_000)
    insurance_annual: float = Field(0, ge=0, le=10_000_000)

    down_payment_pct: float = Field(0.20, ge=0, le=1)
    interest_rate: float = Field(0.065, ge=0, le=0.30)
    loan_term_years: int = Field(30, ge=1, le=50)
    closing_costs_pct: float = Field(0.03, ge=0, le=0.20)

    vacancy_rate: float = Field(0.05, ge=0, le=1)
    maintenance_pct: float = Field(0.05, ge=0, le=1)
    management_pct: float = Field(0.08, ge=0, le=1)
    capex_pct: float = Field(0.05, ge=0, le=1)
    utilities_annual: float = Field(0, ge=0, le=1_000_000)
    other_annual_expenses: float = Field(0, ge=0, le=10_000_000)

    buy_discount_pct: float = Field(
        0.05,
        ge=0,
        le=0.50,
        description="Target buy discount below Income Value (matches IQVerdictInput)",
    )

    is_listed: bool = True


class SandboxRequest(BaseModel):
    """Recompute the Deal Gap given the user's slider adjustments.

    The ``base`` block carries the resolved property + assumption inputs;
    ``adjustments`` carries the user's slider state. Pure function — no DB,
    no external calls; safe to invoke on every slider drag.
    """

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    base: SandboxBaseInputs
    adjustments: SandboxAdjustments


# Motivating-tier labels — kept in sync with the frontend ``MotivatingDealLabel``
# union in components/iq-verdict/types.ts. Locked here so the API contract is
# explicit even though the value is also derivable from deal_gap_pct.
MotivatingLabel = Literal[
    "Cash-Flow Deal",
    "Negotiable Deal",
    "Near Deal",
    "Potential Deal",
    "Structured Deal",
    "Reset Deal",
]


class SandboxResponse(BaseModel):
    """Recomputed gap + tier label + cash-flow + cash-required.

    Compact output — frontend renders this directly into the slider
    component's live readout. The motivating label is computed server-side
    so the frontend doesn't need to re-derive the tier from the gap.
    """

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    deal_gap_pct: float = Field(
        ..., description="Adjusted Deal Gap %. Negative = positive gap (price below income value)."
    )
    motivating_label: MotivatingLabel = Field(
        ..., description="Tier label corresponding to the recomputed gap."
    )
    monthly_cash_flow: float = Field(
        ..., description="Monthly cash flow at the adjusted parameters (NOI/12 minus monthly P&I)."
    )
    monthly_pi: float = Field(
        ..., description="Monthly P&I on the bank loan at the adjusted parameters."
    )
    cash_required: float = Field(
        ...,
        description=(
            "Total buyer cash to close: down payment + closing costs - seller carry. "
            "Seller carry reduces this one-for-one."
        ),
    )
    income_value: float = Field(
        ..., description="Recomputed Income Value (price at which cash flow = 0)."
    )
    target_buy_price: float = Field(
        ..., description="Recomputed Target Buy = Income Value × (1 - buy_discount_pct)."
    )
