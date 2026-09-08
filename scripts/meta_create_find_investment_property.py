#!/usr/bin/env python3
"""
Create the Meta ad set `find-investment-property` inside campaign
`for-listicles`, with three ads (hook A/B/C), from the Marketing API.
Everything is created PAUSED. Review in Ads Manager, then switch on.

Source of truth for copy: docs/marketing/FIND_INVESTMENT_PROPERTY_LISTICLE.md §3.
Rules: docs/marketing/LISTICLE_LANDING_PAGES.md §5.

Needs a system-user token with ads_management + ads_read, assigned to the ad
account (Manage campaigns) and to the Facebook Page (the CAPI token has
neither). Never commit the token.

  export META_ADS_TOKEN=...          # system user token, ads_management + ads_read
  export META_AD_ACCOUNT_ID=act_...  # from Ads Manager URL or /me/adaccounts
  export META_PAGE_ID=...            # Facebook Page the ads post as
  export META_PIXEL_ID=1656758246065791
  export META_IG_ACTOR_ID=...        # optional: Instagram account id for IG placements
  python3 scripts/meta_create_find_investment_property.py [--dry-run] [--budget 2000]

Budget is in cents per day (2000 = $20/day, the runbook default).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

API = "https://graph.facebook.com/v21.0"
SLUG = "find-investment-property"
CAMPAIGN_NAME = "for-listicles"
LANDING = f"https://dealgapiq.com/for/{SLUG}"
CREATIVE_PATH = os.path.join(os.path.dirname(__file__), "..", "docs", "marketing", "assets", "fb-ad-not-for-sale-1080.png")
DESCRIPTION = "Free Discovery on any address. No signup. No card."

# Headlines are counted (<=40) in the spec doc. Primary text = spec §3.
ADS = [
    {
        "content": "hookA",
        "headline": "The best deal here isn't for sale",
        "primary": (
            "The best deal on this map isn't listed.\n\n"
            "Search & Discover shows homes by how long the owner has held them, whether they live there, "
            "and whether the home is on the market at all. Turn on Absentee and 30+ years and you are looking "
            "at a list no listing site can make. Pick a pin, run the address, get the verdict free."
        ),
    },
    {
        "content": "hookB",
        "headline": "Every pin is a number, not a photo",
        "primary": (
            "9 reasons investors hunt on Search & Discover instead of a listing site\n\n"
            "Every pin on the map is a price and a rent-to-price number, not a photo. Filter for foreclosures, "
            "expired listings, and owners who have held 20 years and don't live there. Then run the address "
            "and get the verdict free."
        ),
    },
    {
        "content": "hookC",
        "headline": "Free Discovery on any address. No signup.",
        "primary": (
            "Paste any US address. In 15 seconds you get the price where the deal works, the Deal Gap to the "
            "asking price, and four ways to close it. Free. No account. No card."
        ),
    },
]

# Interest stack from the spec. Names are looked up live; missing ones are skipped and reported.
INTERESTS = [
    "Real estate investing",
    "BiggerPockets",
    "Foreclosure",
    "Landlord",
    "Rental property",
    "Real estate entrepreneur",
    "Wholesaling",
]


def env(name: str, required: bool = True) -> str:
    v = os.environ.get(name, "")
    if required and not v:
        sys.exit(f"missing env {name}")
    return v


TOKEN = env("META_ADS_TOKEN")
ACCOUNT = env("META_AD_ACCOUNT_ID")
PAGE_ID = env("META_PAGE_ID")
PIXEL_ID = env("META_PIXEL_ID")
IG_ID = env("META_IG_ACTOR_ID", required=False)


def call(method: str, path: str, params: dict | None = None, dry: bool = False):
    params = dict(params or {})
    params["access_token"] = TOKEN
    url = f"{API}/{path}"
    data = urllib.parse.urlencode({k: (json.dumps(v) if isinstance(v, (dict, list)) else v) for k, v in params.items()}).encode()
    if dry and method == "POST":
        safe = {k: v for k, v in params.items() if k != "access_token"}
        print(f"DRY {method} {path} {json.dumps(safe)[:300]}")
        return {"id": f"dry_{path.split('/')[-1]}"}
    req = urllib.request.Request(url, data=data if method == "POST" else None, method=method)
    if method == "GET":
        req = urllib.request.Request(f"{url}?{data.decode()}", method="GET")
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        sys.exit(f"{method} {path} failed: {body}")


def upload_image(dry: bool) -> str:
    """Upload the creative as an ad image; returns its hash."""
    if dry:
        print(f"DRY upload {CREATIVE_PATH}")
        return "dry_hash"
    import base64
    with open(CREATIVE_PATH, "rb") as f:
        b = f.read()
    res = call("POST", f"{ACCOUNT}/adimages", {"bytes": base64.b64encode(b).decode(), "name": f"{SLUG}-not-for-sale-1080.png"})
    images = res.get("images", {})
    return next(iter(images.values()))["hash"]


def find_campaign() -> str | None:
    res = call("GET", f"{ACCOUNT}/campaigns", {"fields": "id,name,effective_status", "limit": 200})
    for c in res.get("data", []):
        if c["name"] == CAMPAIGN_NAME:
            return c["id"]
    return None


def resolve_interests() -> list[dict]:
    out, missing = [], []
    for name in INTERESTS:
        res = call("GET", "search", {"type": "adinterest", "q": name, "limit": 5})
        hit = next((d for d in res.get("data", []) if d["name"].lower() == name.lower()), None)
        if hit:
            out.append({"id": hit["id"], "name": hit["name"]})
        else:
            missing.append(name)
    if missing:
        print("interests not found, skipped:", ", ".join(missing))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--budget", type=int, default=2000, help="daily budget in cents")
    a = ap.parse_args()
    dry = a.dry_run

    campaign_id = find_campaign()
    if campaign_id:
        print("campaign exists:", campaign_id)
    else:
        campaign_id = call("POST", f"{ACCOUNT}/campaigns", {
            "name": CAMPAIGN_NAME,
            "objective": "OUTCOME_TRAFFIC",
            "status": "PAUSED",
            "buying_type": "AUCTION",
            "special_ad_categories": [],   # analysis software, not housing; see launch kit §2.4
        }, dry)["id"]
        print("campaign created:", campaign_id)

    interests = resolve_interests()
    targeting = {
        "geo_locations": {"countries": ["US"]},
        "age_min": 25,
        "age_max": 64,
        "targeting_automation": {"advantage_audience": 0},
    }
    if interests:
        targeting["flexible_spec"] = [{"interests": interests}]

    adset_id = call("POST", f"{ACCOUNT}/adsets", {
        "name": SLUG,                                   # = utm_campaign, joins to PostHog by eye
        "campaign_id": campaign_id,
        "status": "PAUSED",
        "daily_budget": a.budget,
        "billing_event": "IMPRESSIONS",
        "optimization_goal": "LANDING_PAGE_VIEWS",      # switch to LEAD_GENERATION/OFFSITE_CONVERSIONS at ~50 Leads/week
        "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
        "promoted_object": {"pixel_id": PIXEL_ID, "custom_event_type": "LEAD"},
        "targeting": targeting,
        "attribution_spec": [{"event_type": "CLICK_THROUGH", "window_days": 7}, {"event_type": "VIEW_THROUGH", "window_days": 1}],
    }, dry)["id"]
    print("ad set created (paused):", adset_id)

    image_hash = upload_image(dry)

    for ad in ADS:
        url = f"{LANDING}?utm_source=meta&utm_medium=paid_social&utm_campaign={SLUG}&utm_content={ad['content']}"
        link_data = {
            "image_hash": image_hash,
            "link": url,
            "message": ad["primary"],
            "name": ad["headline"],
            "description": DESCRIPTION,
            "call_to_action": {"type": "LEARN_MORE", "value": {"link": url}},
        }
        story = {"page_id": PAGE_ID, "link_data": link_data}
        if IG_ID:
            story["instagram_actor_id"] = IG_ID
        creative_id = call("POST", f"{ACCOUNT}/adcreatives", {
            "name": f"{SLUG}-{ad['content']}",
            "object_story_spec": story,
        }, dry)["id"]
        ad_id = call("POST", f"{ACCOUNT}/ads", {
            "name": f"{SLUG}-{ad['content']}",
            "adset_id": adset_id,
            "creative": {"creative_id": creative_id},
            "status": "PAUSED",
        }, dry)["id"]
        print(f"ad {ad['content']} created (paused): {ad_id}  -> {url}")

    print("\nDone. Everything is PAUSED. Review in Ads Manager, confirm the pixel shows Active, then switch the ad set on.")


if __name__ == "__main__":
    main()
