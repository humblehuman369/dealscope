"""Schemas for PropertyOffer CRUD."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field

from app.models.offer import OfferStatus


def _accept_bare_date(v: object) -> object:
    """The frontend's <input type=date> submits ``YYYY-MM-DD``; widen it to a
    midnight datetime so Pydantic's datetime parser accepts it."""
    if isinstance(v, str) and len(v) == 10 and v.count("-") == 2:
        return f"{v}T00:00:00"
    return v


FlexibleDatetime = Annotated[datetime, BeforeValidator(_accept_bare_date)]


class OfferCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, le=Decimal("9999999999.99"))
    status: OfferStatus = OfferStatus.SUBMITTED
    counter_amount: Decimal | None = Field(None, gt=0, le=Decimal("9999999999.99"))
    offer_date: FlexibleDatetime | None = None
    expires_at: FlexibleDatetime | None = None
    notes: str | None = Field(None, max_length=4000)


class OfferUpdate(BaseModel):
    """All fields optional — partial updates only."""

    amount: Decimal | None = Field(None, gt=0, le=Decimal("9999999999.99"))
    status: OfferStatus | None = None
    counter_amount: Decimal | None = Field(None, gt=0, le=Decimal("9999999999.99"))
    offer_date: FlexibleDatetime | None = None
    expires_at: FlexibleDatetime | None = None
    notes: str | None = Field(None, max_length=4000)


class OfferOut(BaseModel):
    id: str
    saved_property_id: str
    amount: Decimal
    counter_amount: Decimal | None
    status: OfferStatus
    offer_date: datetime
    expires_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
