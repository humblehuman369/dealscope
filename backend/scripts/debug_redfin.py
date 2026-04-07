#!/usr/bin/env python3
"""
Diagnostic script: test the Redfin RapidAPI pipeline step-by-step.

Usage:
  REDFIN_API_KEY=<key> python backend/scripts/debug_redfin.py "9211 Clipper Cir, West Palm Beach, FL 33411"

Or set the key in backend/.env and run:
  cd backend && python scripts/debug_redfin.py "9211 Clipper Cir, West Palm Beach, FL 33411"
"""
import asyncio
import json
import os
import sys

import httpx

RAPIDAPI_HOST = os.environ.get("RAPIDAPI_HOST", "redfin-com-data.p.rapidapi.com")
API_KEY = os.environ.get("REDFIN_API_KEY", "")

if not API_KEY:
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
        API_KEY = os.environ.get("REDFIN_API_KEY", "")
    except ImportError:
        pass

if not API_KEY:
    print("ERROR: REDFIN_API_KEY not set. Pass it via env var or backend/.env")
    sys.exit(1)


def headers():
    return {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
        "Accept": "application/json",
    }


async def main(address: str):
    base = f"https://{RAPIDAPI_HOST}"
    print(f"\n{'='*70}")
    print(f"REDFIN DIAGNOSTIC — {address}")
    print(f"Host: {RAPIDAPI_HOST}")
    print(f"API Key: {API_KEY[:6]}...{API_KEY[-4:]}")
    print(f"{'='*70}\n")

    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
        # Step 1: auto-complete
        print("[Step 1] GET /properties/auto-complete")
        print(f"  query = {address!r}")
        try:
            resp = await client.get(
                f"{base}/properties/auto-complete",
                headers=headers(),
                params={"query": address},
            )
            print(f"  HTTP {resp.status_code}")
            if resp.status_code != 200:
                print(f"  Body: {resp.text[:500]}")
                print("\n  DIAGNOSIS: Non-200 from autocomplete — check API key validity / quota")
                return

            ac_data = resp.json()
            print(f"  Response keys: {list(ac_data.keys()) if isinstance(ac_data, dict) else type(ac_data).__name__}")
            print(f"  Full response (truncated):\n{json.dumps(ac_data, indent=2, default=str)[:2000]}")

        except Exception as e:
            print(f"  ERROR: {e}")
            return

        # Extract URL
        url_path = _extract_url(ac_data)
        print(f"\n  Extracted URL path: {url_path}")
        if not url_path:
            print("  No URL from primary query — trying suffix variants...")
            for variant in _address_suffix_variants(address):
                print(f"\n  [Retry] query = {variant!r}")
                try:
                    retry_resp = await client.get(
                        f"{base}/properties/auto-complete",
                        headers=headers(),
                        params={"query": variant},
                    )
                    print(f"  HTTP {retry_resp.status_code}")
                    if retry_resp.status_code == 200:
                        retry_data = retry_resp.json()
                        url_path = _extract_url(retry_data)
                        print(f"  Extracted URL path: {url_path}")
                        if url_path:
                            print(f"  SUCCESS: suffix variant {variant!r} matched")
                            break
                except Exception as e:
                    print(f"  ERROR: {e}")

        if not url_path:
            print("\n  DIAGNOSIS: No URL found from any variant.")
            print("  The address may not match any Redfin property, or")
            print("  the response format has changed from what the parser expects.")
            return

        # Step 2: details
        print(f"\n[Step 2] GET /properties/details")
        print(f"  url = {url_path!r}")
        try:
            resp = await client.get(
                f"{base}/properties/details",
                headers=headers(),
                params={"url": url_path},
            )
            print(f"  HTTP {resp.status_code}")
            if resp.status_code != 200:
                print(f"  Body: {resp.text[:500]}")
                print("\n  DIAGNOSIS: Non-200 from details — URL path may be invalid")
                return

            det_data = resp.json()
            print(f"  Response keys: {list(det_data.keys()) if isinstance(det_data, dict) else type(det_data).__name__}")
            print(f"  Full response (truncated):\n{json.dumps(det_data, indent=2, default=str)[:3000]}")

        except Exception as e:
            print(f"  ERROR: {e}")
            return

        # Parse
        parsed = _parse_details(det_data)
        print(f"\n[Result] Parsed estimates:")
        print(f"  redfin_estimate:        {parsed.get('redfin_estimate')}")
        print(f"  redfin_rental_estimate: {parsed.get('redfin_rental_estimate')}")

        if parsed.get("redfin_estimate") or parsed.get("redfin_rental_estimate"):
            print("\n  STATUS: SUCCESS — estimates found")
        else:
            print("\n  DIAGNOSIS: Parsed dict empty — details response shape doesn't match parser")


_SUFFIX_SWAPS = {
    "Cir": ["Ct", "Circle"], "Ct": ["Cir", "Court"],
    "Circle": ["Court", "Cir"], "Court": ["Circle", "Ct"],
    "St": ["Street"], "Street": ["St"],
    "Dr": ["Drive"], "Drive": ["Dr"],
    "Rd": ["Road"], "Road": ["Rd"],
    "Ave": ["Avenue"], "Avenue": ["Ave"],
    "Ln": ["Lane"], "Lane": ["Ln"],
    "Blvd": ["Boulevard"], "Boulevard": ["Blvd"],
    "Pl": ["Place"], "Place": ["Pl"],
    "Ter": ["Terrace"], "Terrace": ["Ter"],
    "Pkwy": ["Parkway"], "Parkway": ["Pkwy"],
    "Way": ["Wy"], "Wy": ["Way"],
}


def _address_suffix_variants(address):
    import re
    parts = address.split(",", 1)
    street, rest = parts[0], ("," + parts[1] if len(parts) > 1 else "")
    variants = []
    for suffix, alts in _SUFFIX_SWAPS.items():
        pattern = re.compile(r"\b" + re.escape(suffix) + r"\b", re.IGNORECASE)
        if pattern.search(street):
            for alt in alts:
                new_street = pattern.sub(alt, street, count=1)
                if new_street != street:
                    variants.append(new_street + rest)
    return variants


def _extract_url(data):
    """Same logic as RedfinClient._extract_url_from_autocomplete"""
    if not isinstance(data, dict):
        return None

    def _scan_categories(categories):
        for cat in categories:
            if not isinstance(cat, dict):
                continue
            rows = cat.get("rows")
            if not isinstance(rows, list):
                continue
            for row in rows:
                if isinstance(row, dict) and row.get("url"):
                    return str(row["url"])
        return None

    top = data.get("data")
    if isinstance(top, list):
        return _scan_categories(top)
    if isinstance(top, dict):
        for key in ("data", "sections", "categories"):
            nested = top.get(key)
            if isinstance(nested, list):
                result = _scan_categories(nested)
                if result:
                    return result
        rows = top.get("rows")
        if isinstance(rows, list):
            for row in rows:
                if isinstance(row, dict) and row.get("url"):
                    return str(row["url"])
    return None


def _parse_details(data):
    """Same logic as RedfinClient._parse_details_response"""
    result = {}
    if not isinstance(data, dict):
        return result
    payload = data.get("data")
    if not isinstance(payload, dict):
        return result

    def _safe_float(v):
        if v is None:
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    atf = payload.get("aboveTheFold")
    if isinstance(atf, dict):
        addr_info = atf.get("addressSectionInfo")
        if isinstance(addr_info, dict):
            avm = addr_info.get("avmInfo")
            if isinstance(avm, dict):
                result["redfin_estimate"] = _safe_float(avm.get("predictedValue"))
            if result.get("redfin_estimate") is None:
                price_info = addr_info.get("priceInfo")
                if isinstance(price_info, dict):
                    result["redfin_estimate"] = _safe_float(price_info.get("amount"))

    rental = payload.get("rental-estimate") or payload.get("rentalEstimate")
    if isinstance(rental, dict):
        rental_info = rental.get("rentalEstimateInfo")
        if isinstance(rental_info, dict) and rental_info.get("shouldShow", True):
            result["redfin_rental_estimate"] = _safe_float(rental_info.get("predictedValue"))

    return result


if __name__ == "__main__":
    addr = sys.argv[1] if len(sys.argv) > 1 else "9211 Clipper Cir, West Palm Beach, FL 33411"
    asyncio.run(main(addr))
