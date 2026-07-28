"""ZIP code -> state / county resolution for directory geo search.

Backed by ``app/data/zip_crosswalk.json`` (US Census 2020 ZCTA-to-County
relationship file, topped up with USPS-only ZIPs). Rebuild it with
``backend/scripts/build_zip_crosswalk.py``.

Coverage is state-complete but county-partial: PO-box-only and single-point
ZIPs have no ZCTA and therefore no county. ``county`` is ``None`` for those —
callers must not infer a county from the state.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

ZIP_CROSSWALK_PATH = Path(__file__).resolve().parents[1] / "data" / "zip_crosswalk.json"


@dataclass(frozen=True, slots=True)
class ZipLocation:
    zip_code: str
    state: str
    county: str | None
    # A ZIP can straddle county lines; ``county`` is the largest part by land
    # area and ``counties`` lists every county it touches.
    counties: tuple[str, ...]


@lru_cache(maxsize=1)
def _load_crosswalk() -> dict[str, list[str]]:
    """Load the ZIP crosswalk once per process."""
    with ZIP_CROSSWALK_PATH.open(encoding="utf-8") as f:
        payload = json.load(f)
    zips = payload.get("zips")
    if not isinstance(zips, dict):
        raise ValueError("ZIP crosswalk must contain a 'zips' object")
    return zips


def normalize_zip(raw: str | None) -> str | None:
    """Return a 5-digit ZIP, or None when the input isn't one.

    Accepts ZIP+4 ("33460-1234") and strips surrounding whitespace. Leading
    zeros are significant, so the value stays a string throughout.
    """
    if not raw:
        return None
    candidate = raw.strip().split("-", 1)[0]
    if len(candidate) != 5 or not candidate.isdigit():
        return None
    return candidate


def resolve_zip(raw: str | None) -> ZipLocation | None:
    """Resolve a ZIP to its state and county, or None when unrecognized."""
    zip_code = normalize_zip(raw)
    if zip_code is None:
        return None

    entry = _load_crosswalk().get(zip_code)
    if not entry:
        return None

    state, *counties = entry
    return ZipLocation(
        zip_code=zip_code,
        state=state,
        county=counties[0] if counties else None,
        counties=tuple(counties),
    )


def zip_count() -> int:
    """Number of ZIPs in the crosswalk — used by health/diagnostic checks."""
    return len(_load_crosswalk())
