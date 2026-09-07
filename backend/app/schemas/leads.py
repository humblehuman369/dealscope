"""Schemas for anonymous verdict-email capture."""

from typing import Any

from pydantic import BaseModel, EmailStr, Field


class VerdictEmailRequest(BaseModel):
    email: EmailStr
    address: str = Field(..., min_length=3, max_length=500)
    property_id: str | None = Field(default=None, max_length=64)
    income_value: float | None = None
    target_buy: float | None = None
    deal_gap: float | None = None
    attribution: dict[str, Any] | None = None
    consent: bool = True
    event_id: str | None = Field(default=None, max_length=64)
    fbp: str | None = Field(default=None, max_length=200)
    fbc: str | None = Field(default=None, max_length=200)


class VerdictEmailResponse(BaseModel):
    ok: bool = True
    deduped: bool = False


class CapiEventRequest(BaseModel):
    event_name: str = Field(..., max_length=64)
    event_id: str = Field(..., min_length=8, max_length=64)
    event_source_url: str | None = Field(default=None, max_length=2048)
    analytics_consent: bool = True
    fbp: str | None = Field(default=None, max_length=200)
    fbc: str | None = Field(default=None, max_length=200)


class CapiEventResponse(BaseModel):
    ok: bool = True
