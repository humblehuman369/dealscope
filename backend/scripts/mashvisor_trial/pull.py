#!/usr/bin/env python3
"""
Mashvisor Trial Data Pull
=========================
Pulls every Mashvisor endpoint category for a list of addresses,
saving raw JSON responses to data/mashvisor_trial/.

Usage:
  # With env vars set (or in backend/.env):
  cd backend && python scripts/mashvisor_trial/pull.py

  # Or specify addresses file:
  cd backend && python scripts/mashvisor_trial/pull.py --addresses addresses.json

Environment variables:
  MASHVISOR_RAPIDAPI_KEY  - RapidAPI key for Mashvisor
  MASHVISOR_RAPIDAPI_HOST - RapidAPI host (default: mashvisor-api.p.rapidapi.com)
  DATABASE_URL            - Postgres connection string (for address extraction)
"""

import argparse
import asyncio
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "mashvisor_trial"
BACKEND_DIR = PROJECT_ROOT / "backend"

RAPIDAPI_KEY = ""
RAPIDAPI_HOST = "mashvisor-api.p.rapidapi.com"
BASE_URL = ""

CONCURRENCY = 3
REQUEST_DELAY = 0.5
TIMEOUT = 20.0

SMALL_MARKET_ADDRESSES = [
    {"full_address": "123 Main St, Galena, IL 61036", "street": "123 Main St", "city": "Galena", "state": "IL", "zip": "61036"},
    {"full_address": "456 Elm St, Taos, NM 87571", "street": "456 Elm St", "city": "Taos", "state": "NM", "zip": "87571"},
    {"full_address": "789 Oak Ave, Eureka Springs, AR 72632", "street": "789 Oak Ave", "city": "Eureka Springs", "state": "AR", "zip": "72632"},
    {"full_address": "101 Pine Rd, Brevard, NC 28712", "street": "101 Pine Rd", "city": "Brevard", "state": "NC", "zip": "28712"},
    {"full_address": "202 Maple Dr, Moab, UT 84532", "street": "202 Maple Dr", "city": "Moab", "state": "UT", "zip": "84532"},
]


def _load_env():
    """Load env vars from backend/.env if available."""
    global RAPIDAPI_KEY, RAPIDAPI_HOST, BASE_URL
    try:
        from dotenv import load_dotenv
        env_path = BACKEND_DIR / ".env"
        if env_path.exists():
            load_dotenv(env_path)
    except ImportError:
        pass

    RAPIDAPI_KEY = os.environ.get("MASHVISOR_RAPIDAPI_KEY", "")
    RAPIDAPI_HOST = os.environ.get("MASHVISOR_RAPIDAPI_HOST", "mashvisor-api.p.rapidapi.com")
    BASE_URL = f"https://{RAPIDAPI_HOST}"

    if not RAPIDAPI_KEY:
        print("ERROR: MASHVISOR_RAPIDAPI_KEY not set.")
        print("Set it via environment variable or in backend/.env")
        sys.exit(1)


def _headers():
    return {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
        "Accept": "application/json",
    }


def _safe_filename(address: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_-]', '_', address)[:100]


async def _get(client: httpx.AsyncClient, path: str, params: dict | None = None) -> dict:
    """Make a GET request, return parsed JSON or error dict."""
    url = f"{BASE_URL}{path}"
    try:
        resp = await client.get(url, headers=_headers(), params=params)
        if resp.status_code == 200:
            return {"_status": 200, **resp.json()}
        return {"_status": resp.status_code, "_error": resp.text[:500], "_url": url, "_params": params}
    except Exception as e:
        return {"_status": -1, "_error": str(e), "_url": url, "_params": params}


def _save(category: str, label: str, data: dict):
    """Save a JSON response to the data directory."""
    cat_dir = DATA_DIR / category
    cat_dir.mkdir(parents=True, exist_ok=True)
    filepath = cat_dir / f"{label}.json"
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)


async def pull_str(client: httpx.AsyncClient, addr: dict, label: str):
    """Pull all STR analytics endpoints for an address."""
    state = addr.get("state", "")
    city = addr.get("city", "")
    zip_code = addr.get("zip", "")
    street = addr.get("street", "")
    beds_list = [2, 3]

    for beds in beds_list:
        base_params = {
            "state": state, "city": city, "zip_code": zip_code,
            "address": street, "resource": "airbnb", "beds": beds,
        }

        lookup = await _get(client, "/rento-calculator/lookup", base_params)
        _save("str", f"{label}_lookup_beds{beds}", lookup)
        await asyncio.sleep(REQUEST_DELAY)

        comps = await _get(client, "/rento-calculator/list-comps", base_params)
        _save("str", f"{label}_comps_beds{beds}", comps)
        await asyncio.sleep(REQUEST_DELAY)

        hist = await _get(client, "/rento-calculator/historical-performance",
                          {**base_params, "limit_recent_months": "false"})
        _save("str", f"{label}_historical_beds{beds}", hist)
        await asyncio.sleep(REQUEST_DELAY)

    prop_types = await _get(client, "/rento-calculator/property-types",
                            {"state": state, "zip_code": zip_code, "resource": "airbnb"})
    _save("str", f"{label}_property_types", prop_types)
    await asyncio.sleep(REQUEST_DELAY)

    nearby = await _get(client, "/rento-calculator/nearby-listings",
                        {"state": state, "zip_code": zip_code, "address": street, "resource": "airbnb"})
    _save("str", f"{label}_nearby", nearby)
    await asyncio.sleep(REQUEST_DELAY)


async def pull_regulations(client: httpx.AsyncClient, city: str, state: str):
    """Pull STR regulations for a city/state pair."""
    label = _safe_filename(f"{city}_{state}")
    reg = await _get(client, "/airbnb-property/short-term-regulatory",
                     {"state": state, "city": city})
    _save("regulatory", label, reg)
    await asyncio.sleep(REQUEST_DELAY)


async def pull_ltr(client: httpx.AsyncClient, addr: dict, label: str):
    """Pull LTR analytics endpoints for an address."""
    state = addr.get("state", "")
    city = addr.get("city", "")
    zip_code = addr.get("zip", "")
    street = addr.get("street", "")

    lookup = await _get(client, "/rento-calculator/lookup", {
        "state": state, "city": city, "zip_code": zip_code,
        "address": street, "resource": "traditional", "beds": 3,
    })
    _save("ltr", f"{label}_lookup", lookup)
    await asyncio.sleep(REQUEST_DELAY)

    for source in ["traditional", "airbnb"]:
        rates = await _get(client, "/rental-rates", {
            "state": state, "city": city, "zip_code": zip_code, "source": source,
        })
        _save("ltr", f"{label}_rates_{source}", rates)
        await asyncio.sleep(REQUEST_DELAY)


async def pull_property(client: httpx.AsyncClient, addr: dict, label: str) -> dict | None:
    """Pull property-level data. Returns the property response for downstream use."""
    state = addr.get("state", "")
    city = addr.get("city", "")
    zip_code = addr.get("zip", "")
    street = addr.get("street", "")

    prop = await _get(client, "/property", {
        "state": state, "city": city, "zip_code": zip_code, "address": street,
    })
    _save("property", f"{label}_info", prop)
    await asyncio.sleep(REQUEST_DELAY)

    pid = None
    if prop.get("_status") == 200:
        content = prop.get("content", {})
        if isinstance(content, dict):
            pid = content.get("id")
        elif isinstance(content, list) and content:
            pid = content[0].get("id") if isinstance(content[0], dict) else None

    if pid:
        investment = await _get(client, f"/property/{pid}/investment", {
            "state": state, "payment_type": "loan",
            "interest_rate": "7", "down_payment": "20", "loan_type": "1",
        })
        _save("property", f"{label}_investment", investment)
        await asyncio.sleep(REQUEST_DELAY)

        taxes = await _get(client, f"/property/{pid}/taxing", {"state": state})
        _save("property", f"{label}_taxes", taxes)
        await asyncio.sleep(REQUEST_DELAY)

        transactions = await _get(client, f"/property/{pid}/transactions", {"state": state})
        _save("property", f"{label}_transactions", transactions)
        await asyncio.sleep(REQUEST_DELAY)

        estimates = await _get(client, f"/property/estimates/{pid}", {"state": state})
        _save("property", f"{label}_estimates", estimates)
        await asyncio.sleep(REQUEST_DELAY)

        nearby = await _get(client, "/property/nearby", {
            "state": state, "city": city, "address": street,
        })
        _save("property", f"{label}_nearby", nearby)
        await asyncio.sleep(REQUEST_DELAY)

    return prop


async def pull_owner(client: httpx.AsyncClient, prop_response: dict | None, addr: dict, label: str):
    """Pull owner data using identifiers from the property response."""
    state = addr.get("state", "")

    mls_id = None
    owner_first = None
    owner_last = None

    if prop_response and prop_response.get("_status") == 200:
        content = prop_response.get("content", {})
        if isinstance(content, dict):
            mls_id = content.get("mls_id") or content.get("listing_id")
            owner = content.get("owner") or content.get("owner_name") or ""
            if isinstance(owner, str) and " " in owner:
                parts = owner.strip().split()
                owner_first = parts[0]
                owner_last = parts[-1]

    if mls_id:
        contact = await _get(client, "/owner/contact", {"mls_id": mls_id, "state": state})
        _save("owner", f"{label}_contact", contact)
        await asyncio.sleep(REQUEST_DELAY)

        if contact.get("_status") == 200:
            content = contact.get("content", {})
            if isinstance(content, dict):
                owner_first = owner_first or content.get("first_name")
                owner_last = owner_last or content.get("last_name")

    if owner_first and owner_last:
        for endpoint in ["demographics", "lifeint", "finhouse"]:
            data = await _get(client, f"/owner/{endpoint}", {
                "state": state, "first_name": owner_first, "last_name": owner_last,
            })
            _save("owner", f"{label}_{endpoint}", data)
            await asyncio.sleep(REQUEST_DELAY)


async def pull_neighborhood(client: httpx.AsyncClient, city: str, state: str):
    """Pull neighborhood/market-level data for a city/state pair."""
    label = _safe_filename(f"{city}_{state}")

    investment = await _get(client, f"/city/investment/{state}/{city}")
    _save("neighborhood", f"{label}_city_investment", investment)
    await asyncio.sleep(REQUEST_DELAY)

    top_markets = await _get(client, "/city/top-markets", {"state": state})
    _save("neighborhood", f"{label}_top_markets", top_markets)
    await asyncio.sleep(REQUEST_DELAY)

    neighborhoods = await _get(client, f"/city/neighborhoods/{state}/{city}")
    _save("neighborhood", f"{label}_neighborhoods", neighborhoods)
    await asyncio.sleep(REQUEST_DELAY)

    n_id = None
    if neighborhoods.get("_status") == 200:
        content = neighborhoods.get("content", {})
        results = content.get("results", []) if isinstance(content, dict) else content
        if isinstance(results, list) and results:
            first = results[0] if isinstance(results[0], dict) else {}
            n_id = first.get("id") or first.get("neighborhood_id")

    if n_id:
        overview = await _get(client, f"/neighborhood/{n_id}/bar", {"state": state})
        _save("neighborhood", f"{label}_overview_{n_id}", overview)
        await asyncio.sleep(REQUEST_DELAY)

        airbnb = await _get(client, f"/neighborhood/{n_id}/airbnb/details", {"state": state})
        _save("neighborhood", f"{label}_airbnb_{n_id}", airbnb)
        await asyncio.sleep(REQUEST_DELAY)

    trends = await _get(client, "/trends/cities")
    _save("neighborhood", "trends_cities", trends)
    await asyncio.sleep(REQUEST_DELAY)


async def pull_address(client: httpx.AsyncClient, addr: dict, idx: int, total: int):
    """Pull all endpoint categories for a single address."""
    full = addr.get("full_address", "unknown")
    label = _safe_filename(full)
    print(f"\n[{idx+1}/{total}] {full}")

    print("  -> STR analytics...")
    await pull_str(client, addr, label)

    print("  -> LTR analytics...")
    await pull_ltr(client, addr, label)

    print("  -> Property data...")
    prop_response = await pull_property(client, addr, label)

    print("  -> Owner data...")
    await pull_owner(client, prop_response, addr, label)


async def extract_addresses_from_db() -> list[dict]:
    """Extract addresses from the saved_properties table."""
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("WARNING: DATABASE_URL not set — using small-market samples only")
        return []

    try:
        import asyncpg
    except ImportError:
        try:
            import psycopg
        except ImportError:
            print("WARNING: Neither asyncpg nor psycopg installed — using small-market samples only")
            return []

    sync_url = db_url
    if sync_url.startswith("postgres://"):
        sync_url = sync_url.replace("postgres://", "postgresql://", 1)
    for driver in ["+psycopg", "+asyncpg", "+psycopg2"]:
        sync_url = sync_url.replace(driver, "")

    try:
        import psycopg
        conn = psycopg.connect(sync_url)
        cur = conn.execute("""
            SELECT DISTINCT ON (full_address)
                full_address, address_street, address_city, address_state, address_zip, zpid
            FROM saved_properties
            WHERE full_address IS NOT NULL AND address_state IS NOT NULL
            ORDER BY full_address, created_at DESC
            LIMIT 50
        """)
        rows = cur.fetchall()
        conn.close()
        addresses = []
        for row in rows:
            addresses.append({
                "full_address": row[0],
                "street": row[1] or "",
                "city": row[2] or "",
                "state": row[3] or "",
                "zip": row[4] or "",
                "zpid": row[5] or "",
            })
        print(f"Extracted {len(addresses)} addresses from saved_properties")
        return addresses
    except Exception as e:
        print(f"WARNING: DB extraction failed: {e}")
        print("Falling back to small-market samples only")
        return []


async def main():
    parser = argparse.ArgumentParser(description="Mashvisor Trial Data Pull")
    parser.add_argument("--addresses", type=str, help="Path to addresses JSON file")
    parser.add_argument("--skip-db", action="store_true", help="Skip database extraction")
    parser.add_argument("--limit", type=int, default=55, help="Max addresses to process")
    parser.add_argument("--category", type=str, default="all",
                        choices=["all", "str", "ltr", "property", "owner", "neighborhood", "regulatory"],
                        help="Pull only a specific category")
    args = parser.parse_args()

    _load_env()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print(f"{'='*70}")
    print(f"MASHVISOR TRIAL DATA PULL")
    print(f"Host: {RAPIDAPI_HOST}")
    print(f"Key:  {RAPIDAPI_KEY[:6]}...{RAPIDAPI_KEY[-4:]}")
    print(f"Data: {DATA_DIR}")
    print(f"{'='*70}")

    if args.addresses:
        with open(args.addresses) as f:
            addresses = json.load(f)
        print(f"Loaded {len(addresses)} addresses from {args.addresses}")
    elif args.skip_db:
        addresses = []
    else:
        addresses = await extract_addresses_from_db()

    addresses.extend(SMALL_MARKET_ADDRESSES)

    seen = set()
    unique = []
    for a in addresses:
        key = a.get("full_address", "")
        if key and key not in seen:
            seen.add(key)
            unique.append(a)
    addresses = unique[:args.limit]

    print(f"\nTotal addresses to process: {len(addresses)}")

    city_state_pairs = set()
    for a in addresses:
        city, state = a.get("city", ""), a.get("state", "")
        if city and state:
            city_state_pairs.add((city, state))

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(TIMEOUT, connect=10.0),
        limits=httpx.Limits(max_connections=CONCURRENCY, max_keepalive_connections=CONCURRENCY),
    ) as client:

        # Quick connectivity test
        print("\n[Test] Checking Mashvisor API connectivity...")
        test = await _get(client, "/city/list", {"state": "FL"})
        if test.get("_status") != 200:
            print(f"  FAILED (status {test.get('_status')}): {test.get('_error', '')[:200]}")
            print("\n  Check: API key valid? Trial active? Host correct?")
            _save("_meta", "connectivity_FAILED", test)
            sys.exit(1)
        else:
            print("  OK — API is reachable")
            _save("_meta", "connectivity_test", test)

        if args.category in ("all", "regulatory"):
            print(f"\n--- STR Regulations ({len(city_state_pairs)} city/state pairs) ---")
            for city, state in sorted(city_state_pairs):
                print(f"  -> {city}, {state}")
                await pull_regulations(client, city, state)

        if args.category in ("all", "neighborhood"):
            print(f"\n--- Neighborhood/Market ({len(city_state_pairs)} cities) ---")
            for city, state in sorted(city_state_pairs):
                print(f"  -> {city}, {state}")
                await pull_neighborhood(client, city, state)

        for idx, addr in enumerate(addresses):
            if args.category == "all":
                await pull_address(client, addr, idx, len(addresses))
            elif args.category == "str":
                print(f"\n[{idx+1}/{len(addresses)}] {addr.get('full_address', '?')} (STR only)")
                await pull_str(client, addr, _safe_filename(addr.get("full_address", "unknown")))
            elif args.category == "ltr":
                print(f"\n[{idx+1}/{len(addresses)}] {addr.get('full_address', '?')} (LTR only)")
                await pull_ltr(client, addr, _safe_filename(addr.get("full_address", "unknown")))
            elif args.category == "property":
                print(f"\n[{idx+1}/{len(addresses)}] {addr.get('full_address', '?')} (Property only)")
                await pull_property(client, addr, _safe_filename(addr.get("full_address", "unknown")))
            elif args.category == "owner":
                print(f"\n[{idx+1}/{len(addresses)}] {addr.get('full_address', '?')} (Owner only)")
                label = _safe_filename(addr.get("full_address", "unknown"))
                prop = await pull_property(client, addr, label)
                await pull_owner(client, prop, addr, label)

    total_files = sum(1 for _ in DATA_DIR.rglob("*.json"))
    print(f"\n{'='*70}")
    print(f"DONE — {total_files} JSON files saved to {DATA_DIR}")
    print(f"{'='*70}")

    manifest = {
        "pulled_at": datetime.now(timezone.utc).isoformat(),
        "total_addresses": len(addresses),
        "city_state_pairs": sorted([f"{c}, {s}" for c, s in city_state_pairs]),
        "total_files": total_files,
        "addresses": addresses,
    }
    _save("_meta", "manifest", manifest)


if __name__ == "__main__":
    asyncio.run(main())
