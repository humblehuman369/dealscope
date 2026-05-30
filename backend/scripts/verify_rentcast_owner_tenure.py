#!/usr/bin/env python3
"""
One-off: verify RentCast property-records coverage for the Owner Tenure feature.

Mirrors the production call path (lat/lng + radius + saleDateRange) and answers
the two open risks for "find properties where the owner has held 20-30 years":

  1. Does RentCast ACCEPT a large saleDateRange (e.g. 7305:10958 days)?
  2. How good is COVERAGE — what % of records actually carry lastSaleDate,
     lastSalePrice, owner, and ownerOccupied — and do the returned owner-tenure
     years actually fall inside the requested window?

Usage:
  RENTCAST_API_KEY=<key> python scripts/verify_rentcast_owner_tenure.py
  python scripts/verify_rentcast_owner_tenure.py --api-key <key> --lat 41.4993 --lng -81.6944 --radius 5
  python scripts/verify_rentcast_owner_tenure.py --city Cleveland --state OH --min-years 20 --max-years 30

Defaults to a Cleveland, OH coordinate (older housing stock = good test for
decades-old sale dates). Override location with --lat/--lng/--radius or
--city/--state/--zip.
"""
from __future__ import annotations

import argparse
import os
import statistics
import sys
from datetime import UTC, datetime

import httpx

DAYS_PER_YEAR = 365.25
BASE_URL = "https://api.rentcast.io/v1"


def _load_key(cli_key: str | None) -> str:
    key = cli_key or os.environ.get("RENTCAST_API_KEY", "")
    if not key:
        try:
            from dotenv import load_dotenv

            load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
            key = os.environ.get("RENTCAST_API_KEY", "")
        except ImportError:
            pass
    return key


def _sale_date_range(min_years: int, max_years: int | None) -> str:
    min_days = int(round(min_years * DAYS_PER_YEAR))
    if max_years is None:
        return f"{min_days}:*"
    return f"{min_days}:{int(round(max_years * DAYS_PER_YEAR))}"


def _owner_years(last_sale_date: str | None) -> float | None:
    if not last_sale_date:
        return None
    raw = str(last_sale_date).strip()
    if not raw:
        return None
    for candidate in (raw.replace("Z", "+00:00"), raw[:10]):
        try:
            parsed = datetime.fromisoformat(candidate)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=UTC)
            return round(max((datetime.now(UTC) - parsed).days, 0) / DAYS_PER_YEAR, 1)
        except (ValueError, TypeError):
            continue
    return None


def _fetch(client: httpx.Client, key: str, params: dict) -> tuple[int, list[dict] | dict | None, str | None]:
    try:
        resp = client.get(
            f"{BASE_URL}/properties",
            params=params,
            headers={"X-Api-Key": key, "Accept": "application/json"},
            timeout=30.0,
        )
    except httpx.HTTPError as exc:
        return 0, None, str(exc)
    try:
        body = resp.json()
    except ValueError:
        body = None
    if resp.status_code >= 400:
        return resp.status_code, None, resp.text[:500]
    return resp.status_code, body, None


def _pct(n: int, total: int) -> str:
    return f"{(100 * n / total):.0f}%" if total else "n/a"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--api-key", default=None)
    ap.add_argument("--lat", type=float, default=41.4993)
    ap.add_argument("--lng", type=float, default=-81.6944)
    ap.add_argument("--radius", type=float, default=5.0)
    ap.add_argument("--city", default=None)
    ap.add_argument("--state", default=None)
    ap.add_argument("--zip", dest="zip_code", default=None)
    ap.add_argument("--min-years", type=int, default=20)
    ap.add_argument("--max-years", type=int, default=30)
    ap.add_argument("--property-type", default=None)
    ap.add_argument("--limit", type=int, default=500)
    args = ap.parse_args()

    key = _load_key(args.api_key)
    if not key:
        print("ERROR: RENTCAST_API_KEY not set. Pass --api-key or set the env var / backend/.env")
        return 1

    use_area = bool(args.city or args.state or args.zip_code)
    location_params: dict = {}
    if use_area:
        if args.city:
            location_params["city"] = args.city
        if args.state:
            location_params["state"] = args.state
        if args.zip_code:
            location_params["zipCode"] = args.zip_code
        loc_desc = ", ".join(str(v) for v in location_params.values())
    else:
        location_params = {"latitude": args.lat, "longitude": args.lng, "radius": args.radius}
        loc_desc = f"lat={args.lat}, lng={args.lng}, radius={args.radius}mi"

    sale_date_range = _sale_date_range(args.min_years, args.max_years)

    print("=" * 70)
    print("RentCast Owner-Tenure coverage check")
    print("=" * 70)
    print(f"Location:        {loc_desc}")
    print(f"Tenure window:   {args.min_years}-{args.max_years} years")
    print(f"saleDateRange:   {sale_date_range}  (days ago)")
    print(f"propertyType:    {args.property_type or '(any)'}")
    print(f"limit:           {args.limit}")
    print("-" * 70)

    filtered_params = dict(location_params)
    filtered_params.update({"saleDateRange": sale_date_range, "limit": args.limit})
    if args.property_type:
        filtered_params["propertyType"] = args.property_type

    with httpx.Client() as client:
        # --- Risk 1: does the API accept the large saleDateRange? ---
        status, body, err = _fetch(client, key, filtered_params)
        print(f"[filtered]  HTTP {status}")
        if err:
            print(f"  REQUEST FAILED / REJECTED: {err}")
            print("  → If this is a 400/422, RentCast does not accept this saleDateRange value.")
            return 2

        records = body if isinstance(body, list) else (body or {}).get("properties") or []
        if not isinstance(records, list):
            records = [records]
        total = len(records)
        print(f"  ✓ accepted. Records returned: {total}")

        if total == 0:
            print("  → No records. Try a denser area (--city/--state) or wider --radius.")
            return 0

        # --- Risk 2: coverage + correctness ---
        with_sale_date = [r for r in records if r.get("lastSaleDate")]
        with_sale_price = [r for r in records if r.get("lastSalePrice") is not None]
        with_owner = [r for r in records if r.get("owner")]
        owner_occ = [r for r in records if r.get("ownerOccupied") is True]
        owner_not_occ = [r for r in records if r.get("ownerOccupied") is False]
        owner_occ_missing = [r for r in records if r.get("ownerOccupied") is None]

        years = [y for y in (_owner_years(r.get("lastSaleDate")) for r in records) if y is not None]
        in_window = [
            y for y in years if y >= args.min_years and (args.max_years is None or y <= args.max_years)
        ]
        out_of_window = [y for y in years if y not in in_window]

        print("-" * 70)
        print("COVERAGE")
        print(f"  lastSaleDate present:   {len(with_sale_date):>4} / {total}  ({_pct(len(with_sale_date), total)})")
        print(f"  lastSalePrice present:  {len(with_sale_price):>4} / {total}  ({_pct(len(with_sale_price), total)})")
        print(f"  owner present:          {len(with_owner):>4} / {total}  ({_pct(len(with_owner), total)})")
        print(f"  ownerOccupied = true:   {len(owner_occ):>4} / {total}  ({_pct(len(owner_occ), total)})")
        print(f"  ownerOccupied = false:  {len(owner_not_occ):>4} / {total}  ({_pct(len(owner_not_occ), total)})")
        print(f"  ownerOccupied missing:  {len(owner_occ_missing):>4} / {total}  ({_pct(len(owner_occ_missing), total)})")

        print("-" * 70)
        print("TENURE (years since last sale, computed from lastSaleDate)")
        if years:
            print(f"  computed for:           {len(years)} records")
            print(f"  min / mean / max:       {min(years):.1f} / {statistics.mean(years):.1f} / {max(years):.1f}")
            print(f"  inside {args.min_years}-{args.max_years}yr window:  {len(in_window)} / {len(years)}  ({_pct(len(in_window), len(years))})")
            if out_of_window:
                sample_out = sorted(set(round(y) for y in out_of_window))[:8]
                print(f"  OUTSIDE window (yrs):   {sample_out}")
                print("  → If many are outside, server-side saleDateRange filtering is loose; post-filter client-side.")
        else:
            print("  No parseable lastSaleDate values — coverage too thin in this area.")

        print("-" * 70)
        print("SAMPLE (first 8)")
        for r in records[:8]:
            addr = r.get("formattedAddress") or r.get("addressLine1") or "(no address)"
            yrs = _owner_years(r.get("lastSaleDate"))
            print(
                f"  {addr[:48]:<48} sold={str(r.get('lastSaleDate'))[:10]:<10} "
                f"tenure={yrs if yrs is not None else '?':>4} occ={r.get('ownerOccupied')} "
                f"price={r.get('lastSalePrice')}"
            )

        # --- Control: same area, no saleDateRange, to gauge total density ---
        control_params = dict(location_params)
        control_params["limit"] = args.limit
        c_status, c_body, c_err = _fetch(client, key, control_params)
        if not c_err:
            c_records = c_body if isinstance(c_body, list) else (c_body or {}).get("properties") or []
            c_total = len(c_records) if isinstance(c_records, list) else 0
            print("-" * 70)
            print(f"CONTROL (no saleDateRange): {c_total} records in same area")
            if c_total:
                print(f"  → {args.min_years}-{args.max_years}yr owners are ~{_pct(total, c_total)} of area inventory")

    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
