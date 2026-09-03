"""Throwaway diagnostic: why 2406 River Hammock Ln, Fort Pierce FL is not
flagged pre-foreclosure on detail nor returned by the map pre-FC filter.

Calls AXESSO directly (bypasses app.core.config, which currently fails to
validate on this machine due to unrelated extra .env keys).
"""

import asyncio
import json
import math
import os
import urllib.parse
from pathlib import Path

import httpx

ENV = Path(__file__).resolve().parents[1] / ".env"
for line in ENV.read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

KEY = os.environ["AXESSO_API_KEY"]
BASE = os.environ.get("AXESSO_URL", "https://api.axesso.de/zil")
HEADERS = {"axesso-api-key": KEY}

ADDRESS = "2406 River Hammock Ln, Fort Pierce, FL 34981"


async def get(client, endpoint, params):
    r = await client.get(f"{BASE}/{endpoint}", params=params, headers=HEADERS, timeout=60)
    print(f"  [{endpoint}] HTTP {r.status_code}")
    try:
        return r.json()
    except Exception:
        print("  non-json:", r.text[:300])
        return {}


def radius_to_bbox(lat, lng, radius_miles):
    delta_lat = radius_miles / 69.0
    delta_lng = radius_miles / (69.0 * max(math.cos(math.radians(lat)), 0.01))
    return lat + delta_lat, lat - delta_lat, lng + delta_lng, lng - delta_lng


def distressed_url(north, south, east, west, statuses):
    fs = {}
    if "auction" in statuses:
        fs["auc"] = {"value": True}
    if "foreclosure" in statuses:
        fs["fore"] = {"value": True}
    if "pre-foreclosure" in statuses:
        fs["pre"] = {"value": True}
    fs.update(
        {
            "fsba": {"value": False},
            "fsbo": {"value": False},
            "nc": {"value": False},
            "cmsn": {"value": False},
        }
    )
    state = {
        "pagination": {},
        "isMapVisible": True,
        "mapBounds": {
            "north": round(north, 6),
            "south": round(south, 6),
            "east": round(east, 6),
            "west": round(west, 6),
        },
        "filterState": fs,
        "isListVisible": True,
    }
    return "https://www.zillow.com/homes/for_sale/?searchQueryState=" + urllib.parse.quote(
        json.dumps(state, separators=(",", ":"))
    )


def dig(obj, needle, path="", out=None, depth=0):
    """Find every key whose name contains `needle`, anywhere in the payload."""
    if out is None:
        out = []
    if depth > 6:
        return out
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{path}.{k}"
            if needle in k.lower():
                out.append((p, v))
            dig(v, needle, p, out, depth + 1)
    elif isinstance(obj, list):
        for i, v in enumerate(obj[:5]):
            dig(v, needle, f"{path}[{i}]", out, depth + 1)
    return out


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        print("=" * 74)
        print("STEP 1 — search-by-address (how PropertyService finds the zpid)")
        print("=" * 74)
        sba = await get(client, "search-by-address", {"address": ADDRESS})
        print(json.dumps(sba, indent=2)[:1500])

        zpid = None
        for p, v in dig(sba, "zpid"):
            if v:
                zpid = v
                print(f"  found zpid at {p} = {v}")
                break

        lat = lng = None
        for p, v in dig(sba, "latitude"):
            if isinstance(v, (int, float)):
                lat = v
                break
        for p, v in dig(sba, "longitude"):
            if isinstance(v, (int, float)):
                lng = v
                break
        print("  lat/lng:", lat, lng)

        print()
        print("=" * 74)
        print("STEP 2 — property-v2 detail payload: distress-related fields")
        print("=" * 74)
        params = {"zpid": str(zpid)} if zpid else {"url": f"https://www.zillow.com/homes/{ADDRESS.replace(' ', '-')}_rb/"}
        det = await get(client, "property-v2", params)
        inner = det.get("propertyDetails") or det.get("property") or det
        for k in (
            "zpid",
            "homeStatus",
            "keystoneHomeStatus",
            "hdpTypeDimension",
            "listingSubType",
            "foreclosureTypes",
            "price",
            "zestimate",
            "livingArea",
            "daysOnZillow",
            "streetAddress",
        ):
            if isinstance(inner, dict) and k in inner:
                print(f"  {k} = {json.dumps(inner[k])[:400]}")
        print("\n  --- deep scan: keys matching 'foreclos' ---")
        for p, v in dig(det, "foreclos"):
            print(f"  {p} = {json.dumps(v)[:300]}")
        print("\n  --- deep scan: keys matching 'auction' ---")
        for p, v in dig(det, "auction"):
            print(f"  {p} = {json.dumps(v)[:300]}")
        print("\n  --- deep scan: keys matching 'status' ---")
        for p, v in dig(det, "status"):
            print(f"  {p} = {json.dumps(v)[:200]}")

        if lat is None:
            lat, lng = 27.3897, -80.3760

        print()
        print("=" * 74)
        print("STEP 3 — map pre-foreclosure bucket (exact prod URL builder)")
        print("=" * 74)
        n, s, e, w = radius_to_bbox(lat, lng, 5.0)
        url = distressed_url(n, s, e, w, {"pre-foreclosure"})
        print("  URL:", url[:220], "...")
        res = await get(client, "search-by-url", {"url": url})
        print("  top-level keys:", list(res.keys())[:25] if isinstance(res, dict) else type(res))
        for k in ("totalResultCount", "resultsPerPage", "totalPages", "categoryTotals", "message", "error"):
            if isinstance(res, dict) and k in res:
                print(f"  {k} = {json.dumps(res[k])[:250]}")
        rows = []
        if isinstance(res, dict):
            rows = res.get("results") or res.get("props") or res.get("searchResults") or []
            if not rows:
                for v in res.values():
                    if isinstance(v, list) and v:
                        rows = v
                        break
        print("  row count:", len(rows))
        hit = [r for r in rows if "River Hammock" in json.dumps(r.get("address") or r.get("streetAddress") or "")]
        print("  TARGET PRESENT:", bool(hit))
        if rows:
            print("\n  sample row:", json.dumps(rows[0], indent=2)[:1200])
            print("\n  addresses returned:")
            for r in rows[:20]:
                print("   -", json.dumps(r.get("address") or r.get("streetAddress"))[:100])
        if hit:
            print("\n  TARGET ROW:", json.dumps(hit[0], indent=2)[:1200])

        print()
        print("=" * 74)
        print("STEP 4 — control: same viewport WITHOUT disabling fsba/fsbo/nc/cmsn")
        print("=" * 74)
        state = {
            "pagination": {},
            "isMapVisible": True,
            "mapBounds": {"north": round(n, 6), "south": round(s, 6), "east": round(e, 6), "west": round(w, 6)},
            "filterState": {"pre": {"value": True}},
            "isListVisible": True,
        }
        url2 = "https://www.zillow.com/homes/for_sale/?searchQueryState=" + urllib.parse.quote(
            json.dumps(state, separators=(",", ":"))
        )
        res2 = await get(client, "search-by-url", {"url": url2})
        rows2 = []
        if isinstance(res2, dict):
            rows2 = res2.get("results") or res2.get("props") or res2.get("searchResults") or []
            if not rows2:
                for v in res2.values():
                    if isinstance(v, list) and v:
                        rows2 = v
                        break
        print("  row count:", len(rows2))
        hit2 = [r for r in rows2 if "River Hammock" in json.dumps(r.get("address") or r.get("streetAddress") or "")]
        print("  TARGET PRESENT:", bool(hit2))
        if hit2:
            print("  TARGET ROW:", json.dumps(hit2[0], indent=2)[:1200])


asyncio.run(main())
