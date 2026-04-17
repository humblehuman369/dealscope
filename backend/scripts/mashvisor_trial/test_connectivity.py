#!/usr/bin/env python3
"""
Quick connectivity test for Mashvisor via RapidAPI.
Tests multiple URL structures to find the working one.

Usage:
  MASHVISOR_RAPIDAPI_KEY=<key> python backend/scripts/mashvisor_trial/test_connectivity.py
"""

import asyncio
import json
import os
import sys

import httpx


async def main():
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    except ImportError:
        pass

    api_key = os.environ.get("MASHVISOR_RAPIDAPI_KEY", "")
    host = os.environ.get("MASHVISOR_RAPIDAPI_HOST", "mashvisor-api.p.rapidapi.com")

    if not api_key:
        print("ERROR: MASHVISOR_RAPIDAPI_KEY not set")
        sys.exit(1)

    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": host,
        "Accept": "application/json",
    }

    url_patterns = [
        ("Pattern A: /v1.1/client/...", f"https://{host}/v1.1/client/city/list"),
        ("Pattern B: /city/list (no prefix)", f"https://{host}/city/list"),
        ("Pattern C: /client/city/list", f"https://{host}/client/city/list"),
        ("Pattern D: /v2/city/list", f"https://{host}/v2/city/list"),
    ]

    params = {"state": "FL"}

    print(f"Host: {host}")
    print(f"Key:  {api_key[:6]}...{api_key[-4:]}")
    print(f"{'='*60}\n")

    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
        for label, url in url_patterns:
            print(f"[{label}]")
            print(f"  GET {url}?state=FL")
            try:
                resp = await client.get(url, headers=headers, params=params)
                print(f"  Status: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"  Response keys: {list(data.keys()) if isinstance(data, dict) else type(data).__name__}")
                    preview = json.dumps(data, indent=2, default=str)[:500]
                    print(f"  Preview:\n{preview}")
                    print(f"\n  >>> THIS PATTERN WORKS <<<")

                    print(f"\n  Now testing property lookup...")
                    prop_url = url.replace("/city/list", "/rento-calculator/lookup")
                    prop_resp = await client.get(prop_url, headers=headers, params={
                        "state": "TX", "city": "Austin", "zip_code": "78701",
                        "resource": "airbnb", "beds": 3,
                    })
                    print(f"  Rento lookup status: {prop_resp.status_code}")
                    if prop_resp.status_code == 200:
                        prop_data = prop_resp.json()
                        content = prop_data.get("content", {})
                        if isinstance(content, dict):
                            print(f"  median_occupancy_rate: {content.get('median_occupancy_rate')}")
                            print(f"  median_night_rate: {content.get('median_night_rate')}")
                            print(f"  sample_size: {content.get('sample_size')}")
                            print(f"  city_insights_fallback: {content.get('city_insights_fallback')}")
                    return
                else:
                    print(f"  Body: {resp.text[:200]}")
            except Exception as e:
                print(f"  Error: {e}")
            print()

        print("\nNo working URL pattern found. Check:")
        print("  1. API key is valid and trial is active")
        print("  2. Host is correct (mashvisor-api.p.rapidapi.com)")
        print("  3. RapidAPI subscription is active")


if __name__ == "__main__":
    asyncio.run(main())
