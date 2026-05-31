#!/usr/bin/env python3
"""
One-off: probe what the Redfin API (redfin-com-data RapidAPI) actually returns
for a property — to test whether Redfin can serve the expired/off-market use case.

Answers two questions empirically:
  1. CANDIDATE DISCOVERY — can Redfin search for off-market/delisted homes?
     (Spoiler from the docs: no — search only does Active/ComingSoon/Pending/Sold.
     Use --endpoint to try any search path yourself and see the statuses returned.)
  2. PER-PROPERTY VALIDATION — for a known address, does Redfin expose current
     status + a listing-history timeline (Listed / Delisted / Sold) we could use
     to validate a candidate? This is the default mode.

Usage:
  REDFIN_API_KEY=<key> python scripts/verify_redfin_listing.py "953 Banyan Dr, Delray Beach, FL 33483"

  # Raw mode — hit any redfin-com-data endpoint and dump the JSON (to test search):
  REDFIN_API_KEY=<key> python scripts/verify_redfin_listing.py \
      --endpoint properties/search-by-region --param regionId=4_3244 --param status=Active
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

import httpx


def _load_key(cli_key: str | None) -> str:
    key = cli_key or os.environ.get("REDFIN_API_KEY", "")
    if not key:
        try:
            from dotenv import load_dotenv

            load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
            key = os.environ.get("REDFIN_API_KEY", "")
        except ImportError:
            pass
    return key


def _walk_find_events(obj: object, depth: int = 0) -> list[dict]:
    """Recursively locate the first list of event-like dicts (date + price/event)."""
    if depth > 6:
        return []
    if isinstance(obj, dict):
        for key in ("events", "propertyHistory", "priceHistory"):
            v = obj.get(key)
            if isinstance(v, list) and v and isinstance(v[0], dict):
                return v
        for v in obj.values():
            found = _walk_find_events(v, depth + 1)
            if found:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = _walk_find_events(item, depth + 1)
            if found:
                return found
    return []


async def _raw_mode(args, key: str, host: str) -> int:
    params: dict[str, str] = {}
    for p in args.param or []:
        if "=" in p:
            k, v = p.split("=", 1)
            params[k] = v
    url = f"https://{host}/{args.endpoint.lstrip('/')}"
    headers = {"x-rapidapi-key": key, "x-rapidapi-host": host, "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=headers, params=params)
    print(f"GET /{args.endpoint.lstrip('/')}  params={params}  -> HTTP {resp.status_code}")
    try:
        body = resp.json()
    except ValueError:
        print(resp.text[:1000])
        return 0
    print(json.dumps(body, indent=2)[:4000])
    return 0


async def _address_mode(args, key: str, host: str) -> int:
    # Reuse the production RedfinClient (auto-complete -> details two-step).
    from app.services.api_clients import RedfinClient

    client = RedfinClient(api_key=key, rapidapi_host=host)
    print("=" * 70)
    print(f"Redfin probe: {args.address}")
    print("=" * 70)

    ac = await client.auto_complete(args.address)
    print(f"[auto-complete] success={ac.success} status={ac.status_code} error={ac.error}")
    if not ac.success or not ac.data:
        print("  → address not found on Redfin; cannot continue.")
        return 1

    url_path = client._extract_url_from_autocomplete(ac.data)
    if not url_path:
        for variant in client._address_suffix_variants(args.address):
            retry = await client.auto_complete(variant)
            if retry.success and retry.data:
                url_path = client._extract_url_from_autocomplete(retry.data)
                if url_path:
                    break
    if not url_path:
        print("  → no Redfin URL found in auto-complete response.")
        return 1
    print(f"[auto-complete] url={url_path}")

    det = await client.get_details(url_path)
    print(f"[details] success={det.success} status={det.status_code} error={det.error}")
    if not det.success or not det.data:
        return 1

    payload = det.data.get("data") if isinstance(det.data, dict) else None
    payload = payload if isinstance(payload, dict) else (det.data if isinstance(det.data, dict) else {})

    # Current status — where the listing's live state lives.
    atf = payload.get("aboveTheFold") if isinstance(payload, dict) else None
    addr_info = atf.get("addressSectionInfo") if isinstance(atf, dict) else {}
    status_fields = {}
    if isinstance(addr_info, dict):
        for k in ("homeStatus", "status", "listingStatus", "mlsStatus", "isActive", "soldDate"):
            if k in addr_info:
                status_fields[k] = addr_info[k]
        for k in ("priceInfo", "latestPriceInfo"):
            pinfo = addr_info.get(k)
            if isinstance(pinfo, dict):
                status_fields[k] = {"label": pinfo.get("label"), "amount": pinfo.get("amount")}
    print("-" * 70)
    print("CURRENT STATUS (addressSectionInfo):")
    print(json.dumps(status_fields, indent=2) if status_fields else "  (no status fields found)")

    # Listing/price history timeline — the proof of whether Redfin shows delisting.
    parsed = client._parse_details_response(det.data)
    events = _walk_find_events(payload)
    print("-" * 70)
    print(f"LISTING HISTORY ({len(events)} events):")
    for ev in events[:15]:
        desc = ev.get("eventDescription") or ev.get("eventType") or ev.get("event") or "?"
        date = ev.get("eventDate") or ev.get("date") or ev.get("mostRecentPriceDate")
        price = ev.get("price")
        if isinstance(price, dict):
            price = price.get("amount") or price.get("value")
        print(f"  {str(desc):<24} {str(date):<18} price={price}")
    if not events:
        print("  (no history events found — dumping top-level keys for inspection)")
        print("  keys:", list(payload.keys())[:30] if isinstance(payload, dict) else type(payload).__name__)

    print("-" * 70)
    print("PARSED (production extractor):", json.dumps(parsed, indent=2))
    print("=" * 70)
    print(
        "Read: a 'Delisted'/'Listed Removed' event + an off-market current status\n"
        "means Redfin CAN validate a candidate per-property. A searchable delisted\n"
        "status is NOT offered (see --endpoint to confirm against any search path)."
    )
    return 0


async def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("address", nargs="?", default=None)
    ap.add_argument("--api-key", default=None)
    ap.add_argument("--host", default=os.environ.get("RAPIDAPI_HOST", "redfin-com-data.p.rapidapi.com"))
    ap.add_argument("--endpoint", default=None, help="Raw mode: hit this redfin-com-data path and dump JSON")
    ap.add_argument("--param", action="append", help="Raw mode query param k=v (repeatable)")
    args = ap.parse_args()

    key = _load_key(args.api_key)
    if not key:
        print("ERROR: REDFIN_API_KEY not set. Pass --api-key or set the env var / backend/.env")
        return 1

    if args.endpoint:
        return await _raw_mode(args, key, args.host)
    if not args.address:
        print("ERROR: provide an address, or use --endpoint for raw mode. See --help.")
        return 1
    return await _address_mode(args, key, args.host)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
