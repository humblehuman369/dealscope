"""Cash buyer directory data and access helpers."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import NotRequired, TypedDict, cast


class BuyerRecord(TypedDict):
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
    buyerType: NotRequired[str]


BUYERS_DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "buyers.json"


@lru_cache(maxsize=1)
def _load_buyers() -> tuple[BuyerRecord, ...]:
    """Load the paid buyer directory from backend-owned data."""
    with BUYERS_DATA_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Buyer directory data must be a list")
    return tuple(cast(BuyerRecord, item) for item in data)


def list_buyers() -> list[BuyerRecord]:
    """Return all paid buyer records."""
    return list(_load_buyers())
