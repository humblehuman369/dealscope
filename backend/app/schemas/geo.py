"""Schemas for /api/geo location lookup endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ZipLocationResponse(BaseModel):
    """A ZIP resolved to its state and county.

    ``county`` is null for PO-box-only and single-point ZIPs, which have no
    Census ZCTA. Clients must not present a county for those.
    """

    zip: str = Field(serialization_alias="zip")
    state: str
    county: str | None = None
    counties: list[str] = []

    model_config = {"populate_by_name": True}
