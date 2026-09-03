"""
Shared ZIP market cache, harvested from traffic we already pay for.

Every property search calls RentCast ``/markets`` for the property's ZIP and
then folds the answer into that one property's response, where it dies. But
that payload describes the whole ZIP, not the property — median sale price,
median rent, and a ``dataByBedrooms`` breakdown that the normalizer drops
entirely.

So we write it into a long-TTL ZIP-keyed store on the way past. Organic
traffic then populates the table at zero marginal cost, and map search can put
a rent-versus-price screen on pins without buying a single extra call for any
ZIP an investor has already looked at.

Two rules this module exists to enforce:

- **It is a ZIP screen, not a valuation.** ``basis`` records whether the rent
  came from the property's own bedroom bucket or from the ZIP as a whole, so
  the UI can say which. Nothing here is a property-level estimate and callers
  must not present it as one.
- **Nothing is derived when the data is absent.** A ZIP with no rent data
  yields ``None``, never a ratio applied to price.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Literal

from pydantic import BaseModel

from app.services.cache_service import get_cache_service

logger = logging.getLogger(__name__)

CACHE_PREFIX = "zipmarket:v1:"

# ZIP-level medians move on the scale of months, and the whole point is that a
# harvested entry outlives the property search that paid for it.
ZIP_MARKET_TTL_SECONDS = 30 * 24 * 3600

# Ceiling on on-demand fetches for one map search. A viewport spans roughly 1
# to 15 ZIPs; this bounds the pathological case (a zoomed-out view straddling
# dozens) rather than the normal one.
MAX_ON_DEMAND_ZIP_FETCHES = 12

RentBasis = Literal["bedroom", "zip"]


class ZipMarketSnapshot(BaseModel):
    """Medians for one ZIP, as reported by RentCast ``/markets``."""

    zip_code: str
    median_sale_price: float | None = None
    median_rent: float | None = None
    # Bedroom count → median rent / median sale price for that bucket. Keys are
    # strings because this round-trips through JSON.
    rent_by_bedrooms: dict[str, float] = {}
    sale_price_by_bedrooms: dict[str, float] = {}

    def rent_for(self, bedrooms: int | None) -> tuple[float | None, RentBasis | None]:
        """Median rent for ``bedrooms``, falling back to the ZIP-wide median.

        The second element says which one it is, so the UI can label the
        screen at the precision it actually has.
        """
        if bedrooms is not None:
            matched = self.rent_by_bedrooms.get(str(int(bedrooms)))
            if matched:
                return matched, "bedroom"
        if self.median_rent:
            return self.median_rent, "zip"
        return None, None


def _num(value: Any) -> float | None:
    """Coerce a provider value to a positive float, or None."""
    if value is None or isinstance(value, bool):
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num <= 0 or num != num or num in (float("inf"), float("-inf")):
        return None
    return num


def _by_bedrooms(section: Any, field: str) -> dict[str, float]:
    """Pull ``field`` out of a RentCast ``dataByBedrooms`` array."""
    if not isinstance(section, dict):
        return {}
    buckets = section.get("dataByBedrooms")
    if not isinstance(buckets, list):
        return {}
    out: dict[str, float] = {}
    for bucket in buckets:
        if not isinstance(bucket, dict):
            continue
        beds = bucket.get("bedrooms")
        value = _num(bucket.get(field))
        if value is None:
            continue
        try:
            out[str(int(beds))] = value
        except (TypeError, ValueError):
            continue
    return out


def extract_snapshot(zip_code: str, market_statistics: Any) -> ZipMarketSnapshot | None:
    """Build a snapshot from a raw RentCast ``/markets`` payload.

    Returns ``None`` when the payload carries neither a sale nor a rent
    median — an entry with nothing in it is worse than a miss, because it
    would suppress the on-demand fetch that could fill it.
    """
    if not zip_code or not isinstance(market_statistics, dict):
        return None

    sale = market_statistics.get("saleData")
    rental = market_statistics.get("rentalData")

    snapshot = ZipMarketSnapshot(
        zip_code=zip_code,
        median_sale_price=_num(sale.get("medianPrice")) if isinstance(sale, dict) else None,
        median_rent=_num(rental.get("medianRent")) if isinstance(rental, dict) else None,
        rent_by_bedrooms=_by_bedrooms(rental, "medianRent"),
        sale_price_by_bedrooms=_by_bedrooms(sale, "medianPrice"),
    )
    if snapshot.median_sale_price is None and snapshot.median_rent is None and not snapshot.rent_by_bedrooms:
        return None
    return snapshot


def normalize_zip(zip_code: Any) -> str | None:
    """Five-digit ZIP, or None."""
    if zip_code is None:
        return None
    digits = str(zip_code).strip()[:5]
    return digits if len(digits) == 5 and digits.isdigit() else None


async def harvest(zip_code: Any, market_statistics: Any) -> None:
    """Write a ``/markets`` payload we already paid for into the ZIP store.

    Best-effort and never raises: this runs inside the property-search path,
    where a cache write failure must not cost the user their analysis.
    """
    normalized = normalize_zip(zip_code)
    if not normalized:
        return
    snapshot = extract_snapshot(normalized, market_statistics)
    if snapshot is None:
        return
    try:
        cache = get_cache_service()
        await cache.set(
            f"{CACHE_PREFIX}{normalized}",
            snapshot.model_dump(mode="json"),
            ttl_seconds=ZIP_MARKET_TTL_SECONDS,
        )
    except Exception as exc:  # pragma: no cover - cache is optional infrastructure
        logger.warning("ZIP market harvest failed for %s: %s", normalized, exc)


async def read_many(zip_codes: set[str]) -> dict[str, ZipMarketSnapshot]:
    """Read snapshots already in the store. Never fetches."""
    if not zip_codes:
        return {}
    cache = get_cache_service()
    out: dict[str, ZipMarketSnapshot] = {}
    for zip_code in zip_codes:
        try:
            raw = await cache.get(f"{CACHE_PREFIX}{zip_code}")
        except Exception:  # pragma: no cover - cache is optional infrastructure
            continue
        if not raw:
            continue
        try:
            out[zip_code] = ZipMarketSnapshot(**raw)
        except Exception:
            continue
    return out


async def ensure(zip_codes: set[str], rentcast: Any) -> dict[str, ZipMarketSnapshot]:
    """Snapshots for ``zip_codes``, fetching only the ones not yet harvested.

    Bounded by :data:`MAX_ON_DEMAND_ZIP_FETCHES`. Which ZIPs get fetched when
    the cap bites is arbitrary, and deliberately so — the alternative is
    ranking them, and any ranking would just move the same limit around while
    every fetch here permanently populates the shared store for everyone.
    """
    known = await read_many(zip_codes)
    missing = sorted(zip_codes - known.keys())
    if not missing or rentcast is None:
        return known

    to_fetch = missing[:MAX_ON_DEMAND_ZIP_FETCHES]
    if len(missing) > len(to_fetch):
        logger.info(
            "ZIP market: %d ZIPs unharvested, fetching %d (cap)",
            len(missing),
            len(to_fetch),
        )

    responses = await asyncio.gather(
        *(rentcast.get_market_statistics(zip_code=z) for z in to_fetch),
        return_exceptions=True,
    )

    for zip_code, response in zip(to_fetch, responses, strict=True):
        if isinstance(response, Exception):
            logger.warning("ZIP market fetch failed for %s: %s", zip_code, response)
            continue
        if not getattr(response, "success", False) or not getattr(response, "data", None):
            continue
        snapshot = extract_snapshot(zip_code, response.data)
        if snapshot is None:
            continue
        known[zip_code] = snapshot
        await harvest(zip_code, response.data)

    return known
