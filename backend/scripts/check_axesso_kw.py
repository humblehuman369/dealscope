#!/usr/bin/env python3
"""
One-off: does AXESSO ``search-by-url`` honor Zillow's ``filterState.kw`` keyword filter?

Production logs (Sept 21, Norfolk VA tile) showed every keyword query returning
the same 41 rows as the plain for-sale search. This script asks the question
directly: same tile, three calls (kw=Unlivable, kw=Cash only, no kw), and prints
the count plus the sorted zpid list for each so the sets can be compared.

Usage:
  cd backend && .venv/bin/python scripts/check_axesso_kw.py

Reads AXESSO_API_KEY (and optional AXESSO_API_KEY_SECONDARY) from the
environment or backend/.env. Never commit keys.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.zillow_client import create_zillow_client

# Norfolk, VA tile from the Sept 21 production logs.
NORTH, SOUTH, EAST, WEST = 36.90625, 36.6875, -76.09375, -76.25

KEYWORDS: list[str | None] = ["Unlivable", "Cash only", None]


def _load_key() -> tuple[str, str | None]:
    key = os.environ.get("AXESSO_API_KEY", "")
    if not key:
        try:
            from dotenv import load_dotenv

            load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
            key = os.environ.get("AXESSO_API_KEY", "")
        except ImportError:
            pass
    if not key:
        sys.exit("AXESSO_API_KEY is not set")
    return key, os.environ.get("AXESSO_API_KEY_SECONDARY") or None


def _zillow_url(keyword: str | None) -> str:
    """Mirror MapSearchService._zillow_keyword_url, with the kw filter optional."""
    filter_state: dict = {"kw": {"value": keyword}} if keyword else {}
    state = {
        "pagination": {},
        "isMapVisible": True,
        "mapBounds": {"north": NORTH, "south": SOUTH, "east": EAST, "west": WEST},
        "filterState": filter_state,
        "isListVisible": True,
    }
    encoded = urllib.parse.quote(json.dumps(state, separators=(",", ":")))
    return f"https://www.zillow.com/homes/for_sale/?searchQueryState={encoded}"


def _rows(data: dict | None) -> list[dict]:
    if not isinstance(data, dict):
        return []
    rows = data.get("results") or data.get("props") or data.get("searchResults") or []
    if not rows:
        for val in data.values():
            if isinstance(val, list) and val:
                rows = val
                break
    return [r for r in rows if isinstance(r, dict)]


async def main() -> None:
    key, secondary = _load_key()
    client = create_zillow_client(key, fallback_api_key=secondary)

    zpid_sets: dict[str, set[str]] = {}
    for keyword in KEYWORDS:
        label = f"kw={keyword!r}" if keyword else "no kw"
        resp = await client.search_by_url(_zillow_url(keyword))
        if not resp.success:
            print(f"{label}: FAILED status={resp.status_code} error={resp.error}")
            continue
        zpids = sorted(str(r.get("zpid")) for r in _rows(resp.data) if r.get("zpid") is not None)
        zpid_sets[label] = set(zpids)
        print(f"{label}: count={len(zpids)}")
        print(f"  zpids={zpids}")

    if len(zpid_sets) == len(KEYWORDS):
        sets = list(zpid_sets.values())
        identical = all(s == sets[0] for s in sets[1:])
        print(f"\nzpid sets identical across all three calls: {identical}")
        if not identical:
            labels = list(zpid_sets)
            for i in range(len(labels)):
                for j in range(i + 1, len(labels)):
                    a, b = zpid_sets[labels[i]], zpid_sets[labels[j]]
                    print(f"  {labels[i]} vs {labels[j]}: shared={len(a & b)} only_a={len(a - b)} only_b={len(b - a)}")


if __name__ == "__main__":
    asyncio.run(main())
