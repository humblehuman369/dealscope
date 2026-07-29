"""Schemas for /api/buyers cash buyer directory endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class BuyerOut(BaseModel):
    id: int
    initials: str
    accent: str
    company: str
    owner: str
    street: str
    city: str
    state: str
    zip: str
    phone: str
    email: str
    website: str
    coverage: list[str]
    description: str
    deals: int
    years: int
    response: str
    strategies: list[str]
    buyerType: str | None = None


class BuyerListResponse(BaseModel):
    buyers: list[BuyerOut]
    total: int
    page: int
    limit: int
    totalPages: int = Field(serialization_alias="totalPages")

    model_config = {"populate_by_name": True}


class StateCount(BaseModel):
    state: str
    count: int


class BuyerStatsResponse(BaseModel):
    total: int
    byState: list[StateCount] = Field(serialization_alias="byState")

    model_config = {"populate_by_name": True}
