#!/usr/bin/env python3
"""
End-to-end proof for the EXPIRED feature: pull RentCast "Inactive" (delisted)
candidates for an area, then validate each against Redfin's CURRENT status, and
report the breakdown — how many delisted candidates are actually SOLD / ACTIVE /
PENDING (false positives) vs genuinely OFF-MARKET (real expired/withdrawn leads).

Run via Railway so both API keys are injected (never printed):
  PYTHONPATH=. railway run python3 scripts/verify_expired_pipeline.py --city "Akron" --state OH
  PYTHONPATH=. railway run python3 scripts/verify_expired_pipeline.py --lat 41.08 --lng -81.52 --radius 5
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from collections import Counter
from datetime import UTC, datetime

DAYS_PER_YEAR = 365.25


def _key(name: str) -> str:
    v = os.environ.get(name, "")
    if not v:
        try:
            from dotenv import load_dotenv

            load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
            v = os.environ.get(name, "")
        except ImportError:
            pass
    return v


def _within_days(value, max_days: int) -> bool:
    if not value:
        return False
    s = str(value).strip()
    for cand in (s.replace("Z", "+00:00"), s[:10]):
        try:
            dt = datetime.fromisoformat(cand)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            return 0 <= (datetime.now(UTC) - dt).days <= max_days
        except (ValueError, TypeError):
            continue
    return False


def _classify(token: str | None, display: str | None) -> str:
    t = (token or "").lower()
    d = (display or "").lower()
    if "sold" in t or "closed" in d or "sold" in d:
        return "SOLD"
    if "pend" in t or "pend" in d or "contract" in d or "contingent" in d:
        return "PENDING"
    if t in ("forsale", "comingsoon", "active") or "for sale" in d or "active" in d or "coming soon" in d:
        return "ACTIVE/RELISTED"
    if not token and not display:
        return "UNKNOWN (no Redfin status)"
    return "OFF-MARKET (lead)"


def _redfin_status(det_data) -> tuple[str | None, str | None]:
    payload = det_data.get("data") if isinstance(det_data, dict) else None
    payload = payload if isinstance(payload, dict) else (det_data if isinstance(det_data, dict) else {})
    atf = payload.get("aboveTheFold") if isinstance(payload, dict) else {}
    addr = atf.get("addressSectionInfo") if isinstance(atf, dict) else {}
    status = addr.get("status") if isinstance(addr, dict) else None
    if isinstance(status, dict):
        return status.get("longerDefinitionToken"), status.get("displayValue")
    if isinstance(status, str):
        return None, status
    return None, None


async def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--city")
    ap.add_argument("--state")
    ap.add_argument("--zip", dest="zip_code")
    ap.add_argument("--lat", type=float)
    ap.add_argument("--lng", type=float)
    ap.add_argument("--radius", type=float, default=5.0)
    ap.add_argument("--days", type=int, default=120, help="removedDate recency window")
    ap.add_argument("--pull", type=int, default=200, help="how many RentCast inactive listings to pull")
    ap.add_argument("--validate", type=int, default=30, help="how many candidates to validate on Redfin")
    ap.add_argument("--concurrency", type=int, default=6)
    args = ap.parse_args()

    rc_key, rf_key = _key("RENTCAST_API_KEY"), _key("REDFIN_API_KEY")
    if not rc_key or not rf_key:
        print(f"ERROR: missing keys (RentCast={'ok' if rc_key else 'MISSING'}, Redfin={'ok' if rf_key else 'MISSING'})")
        return 1

    from app.services.api_clients import RedfinClient, RentCastClient

    rentcast = RentCastClient(api_key=rc_key)
    redfin = RedfinClient(api_key=rf_key, rapidapi_host=os.environ.get("RAPIDAPI_HOST", "redfin-com-data.p.rapidapi.com"))

    loc = {}
    if args.city:
        loc["city"] = args.city
    if args.state:
        loc["state"] = args.state
    if args.zip_code:
        loc["zip_code"] = args.zip_code
    if args.lat is not None and args.lng is not None:
        loc.update(latitude=args.lat, longitude=args.lng, radius=args.radius)
    loc_desc = ", ".join(f"{k}={v}" for k, v in loc.items())

    print("=" * 72)
    print(f"EXPIRED pipeline proof — {loc_desc}")
    print(f"  removedDate window: {args.days}d   pull: {args.pull}   validate on Redfin: {args.validate}")
    print("=" * 72)

    # Step 1 — RentCast inactive (delisted) candidates
    resp = await rentcast.get_sale_listings(status="Inactive", limit=args.pull, **loc)
    if not resp.success or not resp.data:
        print(f"RentCast inactive fetch failed: success={resp.success} error={resp.error}")
        return 1
    records = resp.data if isinstance(resp.data, list) else [resp.data]
    print(f"RentCast inactive listings returned: {len(records)}")

    with_removed = [r for r in records if r.get("removedDate")]
    recent = [r for r in with_removed if _within_days(r.get("removedDate"), args.days)]
    print(f"  with removedDate: {len(with_removed)}   delisted within {args.days}d: {len(recent)}")
    if not recent:
        print("  → no recent delisted candidates; try a wider area/window.")
        return 0

    candidates = recent[: args.validate]
    print(f"  validating {len(candidates)} on Redfin...\n")

    # Step 2 — validate each candidate's CURRENT status on Redfin
    sem = asyncio.Semaphore(args.concurrency)

    async def check(rec) -> tuple[str, str, str]:
        addr = rec.get("formattedAddress") or rec.get("addressLine1") or ""
        async with sem:
            try:
                ac = await redfin.auto_complete(addr)
                url = redfin._extract_url_from_autocomplete(ac.data) if ac.success else None
                if not url:
                    return addr, "UNKNOWN (not on Redfin)", ""
                det = await redfin.get_details(url)
                if not det.success or not det.data:
                    return addr, "UNKNOWN (no details)", ""
                token, display = _redfin_status(det.data)
                return addr, _classify(token, display), display or token or ""
            except Exception as e:  # noqa: BLE001
                return addr, f"ERROR", str(e)[:40]

    results = await asyncio.gather(*[check(c) for c in candidates])

    tally: Counter = Counter()
    print(f"{'ADDRESS':<44} {'CLASSIFICATION':<24} REDFIN STATUS")
    print("-" * 72)
    for addr, klass, status in results:
        tally[klass] += 1
        print(f"{addr[:43]:<44} {klass:<24} {status}")

    print("-" * 72)
    total = len(results)
    print("BREAKDOWN:")
    for klass, n in tally.most_common():
        print(f"  {klass:<26} {n:>3}  ({100 * n / total:.0f}%)")
    leads = tally.get("OFF-MARKET (lead)", 0)
    print("-" * 72)
    print(f"REAL EXPIRED/OFF-MARKET LEADS: {leads}/{total} ({100 * leads / total:.0f}%) of validated candidates")
    print("(The rest are false positives RentCast's stale 'Inactive' flag produced.)")
    print("=" * 72)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
