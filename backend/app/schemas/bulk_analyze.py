"""Schemas for the bulk analyze queue."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

# Ceiling on one submitted queue. Each cold property is a full provider
# fan-out, so this is the hard bound on what a single request can start.
MAX_QUEUE_SIZE = 50


class BulkAnalyzeRequest(BaseModel):
    """A queue of addresses to analyze, drained in order.

    The client holds the queue and resubmits what comes back in ``remaining``.
    That keeps each request a normal length while the work stays strictly
    sequential — and it means a run that hits the time budget resumes instead
    of losing the analyses it already paid for.
    """

    addresses: list[str] = Field(
        ...,
        min_length=1,
        max_length=MAX_QUEUE_SIZE,
        description=(
            "Full addresses in the order they should be analyzed. Addresses "
            "already analyzed in the last 30 days do not consume quota."
        ),
    )

    @field_validator("addresses")
    @classmethod
    def _clean(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        cleaned: list[str] = []
        for raw in value:
            address = raw.strip()
            if not address or address.lower() in seen:
                continue
            seen.add(address.lower())
            cleaned.append(address)
        if not cleaned:
            raise ValueError("addresses must contain at least one non-blank address")
        return cleaned


class BulkAnalyzeResult(BaseModel):
    """One analyzed property, or the reason it could not be analyzed."""

    address: str
    status: Literal["analyzed", "unavailable", "error"]

    list_price: float | None = None
    income_value: float | None = None
    target_buy_price: float | None = None
    deal_gap_amount: float | None = None
    deal_gap_percent: float | None = Field(
        default=None,
        description=(
            "(list_price - target_buy) / list_price, as a percentage. Lower is "
            "better: it is the discount off asking the deal needs to work, so "
            "zero or negative means it pencils at list."
        ),
    )
    deal_score: int | None = None
    deal_verdict: str | None = None
    monthly_rent: float | None = None
    property_id: str | None = None

    charged: bool = Field(
        default=False,
        description="Whether this property consumed one analysis from the monthly quota.",
    )
    reason: str | None = Field(
        default=None,
        description="Why the property could not be analyzed (status != 'analyzed').",
    )


class BulkAnalyzeResponse(BaseModel):
    """Ranked results for the portion of the queue this run drained."""

    results: list[BulkAnalyzeResult] = Field(
        description="Analyzed properties ranked by Deal Gap, best first, then the unanalyzable ones."
    )
    remaining: list[str] = Field(
        description=(
            "Addresses not reached in this run. Resubmit them to continue; "
            "empty when the queue was fully drained."
        )
    )
    analyses_charged: int = Field(description="Analyses consumed from the monthly quota by this run.")
    quota_exhausted: bool = Field(
        default=False,
        description="True when the run stopped because the monthly analysis quota ran out.",
    )
    notice: str | None = Field(
        default=None,
        description="Human-readable explanation when the run stopped before draining the queue.",
    )
