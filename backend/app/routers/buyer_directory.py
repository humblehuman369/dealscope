"""Paid-only Cash Buyer Directory API."""

from __future__ import annotations

from pydantic import BaseModel

from fastapi import APIRouter

from app.core.deps import PaidProUser
from app.services.buyer_directory_service import list_buyers


router = APIRouter(prefix="/api/v1/buyer-directory", tags=["Buyer Directory"])


class BuyerDirectoryRecord(BaseModel):
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


class BuyerDirectoryResponse(BaseModel):
    buyers: list[BuyerDirectoryRecord]


@router.get("", response_model=BuyerDirectoryResponse, summary="List paid cash buyers")
async def get_buyer_directory(_: PaidProUser):
    """Return full buyer contact records for active paid Pro subscribers only."""
    return BuyerDirectoryResponse(buyers=list_buyers())
