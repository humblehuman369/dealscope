"""Schemas for the admin traffic board (``/api/v1/admin/traffic``)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class TrafficOverview(BaseModel):
    visitors: float | None = None
    views: float | None = None
    sessions: float | None = None
    session_duration_s: float | None = None
    bounce_rate_pct: float | None = None


class TrafficSeries(BaseModel):
    name: str
    days: list[str]
    data: list[float]
    total: float


class TrafficSource(BaseModel):
    source: str
    medium: str = ""
    campaign: str = ""
    tagged: bool
    visitors: float | None = None
    views: float | None = None
    share_pct: float | None = None


class TrafficBoard(BaseModel):
    days: int
    configured: bool
    cached: bool = False
    generated_at: datetime
    overview: TrafficOverview
    series: list[TrafficSeries]
    sources: list[TrafficSource]
    error: str | None = None
