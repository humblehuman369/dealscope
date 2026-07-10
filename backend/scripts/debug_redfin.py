#!/usr/bin/env python3
"""
Diagnostic script: test the Redfin RapidAPI pipeline step-by-step.

Usage (redfin-base RapidAPI):
  REDFIN_API_KEY=<key> python backend/scripts/debug_redfin.py "9211 Clipper Cir, West Palm Beach, FL 33411"

Or set the key in backend/.env and run:
  cd backend && python scripts/debug_redfin.py "9211 Clipper Cir, West Palm Beach, FL 33411"
"""
import asyncio
import json
import os
import sys

import httpx

RAPIDAPI_HOST = os.environ.get("RAPIDAPI_HOST", "redfin-base.p.rapidapi.com")
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
        async def _detail(location: str):
            resp = await client.get(
                f"{base}/redfin/detail",
                headers=headers(),
                params={"location": location},
            )
            print(f"  HTTP {resp.status_code}")
            if resp.status_code != 200:
                print(f"  Body: {resp.text[:500]}")
                return None
            return resp.json()

        # Step 1: detail lookup by address
        print("[Step 1] GET /redfin/detail")
        print(f"  location = {address!r}")
        try:
            det_data = await _detail(address)
        except Exception as e:
            print(f"  ERROR: {e}")
            return
        if det_data is None:
            print("\n  DIAGNOSIS: Non-200 from detail — check API key validity / quota")
            return
        print(f"  Response keys: {list(det_data.keys()) if isinstance(det_data, dict) else type(det_data).__name__}")
        print(f"  status = {det_data.get('status')}  message = {det_data.get('message')!r}")

        # Step 2: follow suggestion / suffix variants when address didn't match directly
        if not isinstance(det_data.get("data"), dict):
            suggestion_url = _extract_suggestion_url(det_data)
            print(f"\n  No direct match. Suggestion URL: {suggestion_url}")
            candidates = ([suggestion_url] if suggestion_url else []) + _address_suffix_variants(address)
            det_data = None
            for candidate in candidates:
                print(f"\n  [Retry] location = {candidate!r}")
                try:
                    retry_data = await _detail(candidate)
                except Exception as e:
                    print(f"  ERROR: {e}")
                    continue
                if retry_data and isinstance(retry_data.get("data"), dict):
                    det_data = retry_data
                    print(f"  SUCCESS: {candidate!r} matched")
                    break
                if retry_data and _extract_suggestion_url(retry_data):
                    follow = _extract_suggestion_url(retry_data)
                    print(f"  [Follow suggestion] location = {follow!r}")
                    followed = await _detail(follow)
                    if followed and isinstance(followed.get("data"), dict):
                        det_data = followed
                        print(f"  SUCCESS: suggestion for {candidate!r} matched")
                        break

        if not det_data or not isinstance(det_data.get("data"), dict):
            print("\n  DIAGNOSIS: No detail payload found from any variant.")
            print("  The address may not match any Redfin property, or")
            print("  the response format has changed from what the parser expects.")
            return

        print(f"\n  Detail response (truncated):\n{json.dumps(det_data, indent=2, default=str)[:3000]}")

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


def _extract_suggestion_url(data):
    """Same logic as RedfinClient._extract_suggestion_url"""
    if not isinstance(data, dict):
        return None
    suggestions = data.get("Suggestions")
    if not isinstance(suggestions, list):
        return None
    for item in suggestions:
        if isinstance(item, dict) and item.get("url"):
            return f"https://www.redfin.com{item['url']}"
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
