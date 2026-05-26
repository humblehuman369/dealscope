"""Cash buyer directory data and access helpers."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import NotRequired, TypedDict


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


def _string_value(value: object) -> str:
    return value if isinstance(value, str) else ""


def _int_value(value: object) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        value = value.strip()
        if value.isdigit():
            return int(value)
    return 0


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str) and item]


def _normalize_buyer(item: object) -> BuyerRecord:
    if not isinstance(item, dict):
        raise ValueError("Buyer directory entries must be objects")

    buyer: BuyerRecord = {
        "id": _int_value(item.get("id")),
        "initials": _string_value(item.get("initials")),
        "accent": _string_value(item.get("accent")) or "#0EA5E9",
        "company": _string_value(item.get("company")),
        "owner": _string_value(item.get("owner")),
        "street": _string_value(item.get("street")),
        "city": _string_value(item.get("city")),
        "state": _string_value(item.get("state")),
        "zip": _string_value(item.get("zip")),
        "phone": _string_value(item.get("phone")),
        "email": _string_value(item.get("email")),
        "website": _string_value(item.get("website")),
        "coverage": _string_list(item.get("coverage")),
        "description": _string_value(item.get("description")),
        "deals": _int_value(item.get("deals")),
        "years": _int_value(item.get("years")),
        "response": _string_value(item.get("response")),
        "strategies": _string_list(item.get("strategies")),
    }
    buyer_type = item.get("buyerType")
    if isinstance(buyer_type, str):
        buyer["buyerType"] = buyer_type
    return buyer


@lru_cache(maxsize=1)
def _load_buyers() -> tuple[BuyerRecord, ...]:
    """Load the paid buyer directory from backend-owned data."""
    with BUYERS_DATA_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Buyer directory data must be a list")
    return tuple(_normalize_buyer(item) for item in data)


def list_buyers() -> list[BuyerRecord]:
    """Return all paid buyer records."""
    return list(_load_buyers())
