"""Schemas for saved map searches and their new-inventory alert schedule."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.saved_map_search import AlertFrequency

# The MapSearchRequest fields a saved search replays. Bounds and polygon are
# stored in their own columns; everything else lands in ``filters``. Listed
# explicitly rather than accepting the whole request body so a client cannot
# smuggle ``limit``/``offset`` or a future field past the alert-eligibility
# check by nesting it in a free-form blob.
STORED_FILTER_FIELDS: frozenset[str] = frozenset(
    {
        "listing_type",
        "property_type",
        "min_price",
        "max_price",
        "bedrooms",
        "bathrooms",
        "listing_statuses",
        "include_str_listings",
        "str_state",
        "str_city",
        "motivated_seller_search",
        "owner_tenure_min_years",
        "owner_tenure_max_years",
        "owner_occupancy",
        "owner_records_availability",
    }
)


class SavedMapSearchCreate(BaseModel):
    """Create a saved search from the map's current viewport and filters."""

    name: str = Field(..., min_length=1, max_length=120)
    north: float
    south: float
    east: float
    west: float
    polygon: list[list[float]] | None = Field(
        default=None,
        description="Drawn farm boundary as [[lat, lng], ...]; omit for a plain viewport.",
    )
    filters: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "MapSearchRequest filter fields to replay. Unrecognized keys are "
            f"dropped. Accepted: {', '.join(sorted(STORED_FILTER_FIELDS))}."
        ),
    )
    alert_frequency: AlertFrequency = AlertFrequency.OFF

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name cannot be blank")
        return stripped

    @field_validator("filters")
    @classmethod
    def _only_known_filters(cls, value: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in value.items() if k in STORED_FILTER_FIELDS}

    @field_validator("polygon")
    @classmethod
    def _validate_polygon(cls, value: list[list[float]] | None) -> list[list[float]] | None:
        if value is None:
            return None
        if len(value) < 3:
            raise ValueError("polygon needs at least 3 vertices")
        if any(len(point) != 2 for point in value):
            raise ValueError("polygon vertices must be [lat, lng] pairs")
        return value


class SavedMapSearchUpdate(BaseModel):
    """Rename a saved search or change its alert schedule."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    alert_frequency: AlertFrequency | None = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("name cannot be blank")
        return stripped


class SavedMapSearchResponse(BaseModel):
    """A saved search as returned to the map UI."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    north: float
    south: float
    east: float
    west: float
    polygon: list[list[float]] | None = None
    filters: dict[str, Any]
    alert_frequency: AlertFrequency
    last_alert_sent_at: datetime | None = None
    created_at: datetime

    alert_ineligible_reason: str | None = Field(
        default=None,
        description=(
            "Why this search cannot be put on an alert schedule, or null when it "
            "can. Present so the UI can explain the restriction instead of just "
            "disabling the control."
        ),
    )


class SavedMapSearchList(BaseModel):
    """All of a user's saved searches, with the per-user ceiling."""

    searches: list[SavedMapSearchResponse]
    total: int
    max_allowed: int


class SavedSearchAlertRunResult(BaseModel):
    """Cron summary. ``provider_searches`` is the number that matters — it is
    the run's provider cost, and it should stay well below ``subscribers``."""

    due: int = Field(description="Alert-enabled searches whose frequency cap had elapsed")
    provider_searches: int = Field(description="Distinct map searches actually dispatched")
    subscribers: int = Field(description="Saved searches those dispatches were fanned out to")
    seeded: int = Field(description="First-run searches that recorded a baseline without emailing")
    emails_sent: int
    errors: int
