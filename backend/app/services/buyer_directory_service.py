"""Cash buyer directory data and access helpers."""

from __future__ import annotations

import json
import logging
import time
from functools import lru_cache
from pathlib import Path
from typing import NotRequired, TypedDict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cash_buyer import CashBuyer

logger = logging.getLogger(__name__)

_CACHE_TTL_SECONDS = 300
_buyers_cache: tuple[float, tuple[BuyerRecord, ...]] | None = None


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
    buyer_type = item.get("buyerType") or item.get("buyer_type")
    if isinstance(buyer_type, str):
        buyer["buyerType"] = buyer_type
    return buyer


def row_to_buyer_record(row: CashBuyer) -> BuyerRecord:
    buyer: BuyerRecord = {
        "id": row.id,
        "initials": row.initials or "",
        "accent": row.accent or "#0EA5E9",
        "company": row.company_name,
        "owner": row.owner_name or "",
        "street": row.street or "",
        "city": row.city or "",
        "state": row.state or "",
        "zip": row.zip or "",
        "phone": row.phone,
        "email": row.email or "",
        "website": row.website or "",
        "coverage": list(row.coverage or []),
        "description": row.description or "",
        "deals": row.deals if row.deals is not None else 0,
        "years": row.years if row.years is not None else 0,
        "response": row.response_time or "",
        "strategies": list(row.strategies or []),
    }
    if row.buyer_type:
        buyer["buyerType"] = row.buyer_type
    return buyer


@lru_cache(maxsize=1)
def _load_buyers_json() -> tuple[BuyerRecord, ...]:
    """Fallback loader when Postgres has no directory rows yet."""
    with BUYERS_DATA_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Buyer directory data must be a list")
    return tuple(_normalize_buyer(item) for item in data)


async def _load_buyers_db(db: AsyncSession) -> tuple[BuyerRecord, ...]:
    result = await db.execute(
        select(CashBuyer)
        .where(CashBuyer.passes_strict_filter.is_(True))
        .order_by(CashBuyer.id)
    )
    rows = result.scalars().all()
    return tuple(row_to_buyer_record(row) for row in rows)


def _get_cached_buyers() -> tuple[BuyerRecord, ...] | None:
    global _buyers_cache
    if _buyers_cache is None:
        return None
    cached_at, buyers = _buyers_cache
    if time.monotonic() - cached_at > _CACHE_TTL_SECONDS:
        _buyers_cache = None
        return None
    return buyers


def _set_cached_buyers(buyers: tuple[BuyerRecord, ...]) -> None:
    global _buyers_cache
    _buyers_cache = (time.monotonic(), buyers)


def invalidate_buyers_cache() -> None:
    """Clear in-process buyer directory cache (e.g. after admin data refresh)."""
    global _buyers_cache
    _buyers_cache = None


async def list_buyers(db: AsyncSession) -> list[BuyerRecord]:
    """Return paid buyer records from Postgres, with JSON fallback if the table is empty."""
    cached = _get_cached_buyers()
    if cached is not None:
        return list(cached)

    try:
        buyers = await _load_buyers_db(db)
    except Exception:
        logger.exception("Failed to load cash buyers from database; trying JSON fallback")
        buyers = ()

    if not buyers and BUYERS_DATA_PATH.is_file():
        logger.warning("cash_buyers table empty — serving buyer directory from JSON fallback")
        buyers = _load_buyers_json()

    _set_cached_buyers(buyers)
    return list(buyers)
