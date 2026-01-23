#!/usr/bin/env python3
"""
Test script to explore AXESSO market-data API endpoint.
Documents available fields for market statistics comparison with RentCast.

Run: python test_axesso_market_data.py
"""
import asyncio
import os
import json
from dotenv import load_dotenv
import httpx

# Load environment variables
load_dotenv()

AXESSO_API_KEY = os.getenv("AXESSO_API_KEY", "")
AXESSO_URL = os.getenv("AXESSO_URL", "https://api.axesso.de/zil")

# Test locations
TEST_LOCATIONS = [
    "33483",           # Delray Beach, FL zip code
    "Delray Beach, FL",  # City, State
]

# Fields we're looking for (similar to RentCast saleData)
MARKET_FIELDS_OF_INTEREST = [
    "daysOnMarket",
    "medianDaysOnMarket",
    "averageDaysOnMarket",
    "totalListings",
    "newListings",
    "inventory",
    "medianPrice",
    "averagePrice",
    "pricePerSquareFoot",
    "marketTrends",
    "hotMarket",
    "absorption",
]


async def get_market_data(location: str) -> dict:
    """Get market data from AXESSO market-data endpoint."""
    headers = {
        "axesso-api-key": AXESSO_API_KEY,
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{AXESSO_URL}/market-data"
        response = await client.get(url, headers=headers, params={"location": location})
        
        print(f"\n  Status: {response.status_code}")
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  Error: {response.text[:200]}")
            return {}


def extract_relevant_fields(data: dict, prefix: str = "") -> dict:
    """Recursively extract all potentially relevant market fields."""
    found_fields = {}
    
    if not isinstance(data, dict):
        return found_fields
    
    for key, value in data.items():
        full_key = f"{prefix}.{key}" if prefix else key
        
        # Check if this is a field of interest
        key_lower = key.lower()
        if any(term.lower() in key_lower for term in MARKET_FIELDS_OF_INTEREST):
            found_fields[full_key] = value
        
        # Also look for any field containing certain keywords
        if any(term in key_lower for term in ["days", "listing", "price", "market", "inventory", "trend"]):
            if full_key not in found_fields:
                found_fields[full_key] = value
        
        # Recurse into nested dicts
        if isinstance(value, dict):
            nested = extract_relevant_fields(value, full_key)
            found_fields.update(nested)
        elif isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
            # Check first item in list
            nested = extract_relevant_fields(value[0], f"{full_key}[0]")
            found_fields.update(nested)
    
    return found_fields


def print_section(title: str, data: dict):
    """Pretty print a section of data."""
    print(f"\n{'='*60}")
    print(f" {title}")
    print('='*60)
    for key, value in sorted(data.items()):
        # Truncate long values
        str_value = str(value)
        if len(str_value) > 80:
            str_value = str_value[:77] + "..."
        print(f"  {key}: {str_value}")


async def main():
    print("\n" + "="*70)
    print(" AXESSO MARKET-DATA API FIELD EXPLORATION")
    print(" Comparing with RentCast saleData fields")
    print("="*70)
    
    if not AXESSO_API_KEY:
        print("\n❌ ERROR: AXESSO_API_KEY not configured in environment")
        print("   Please set AXESSO_API_KEY in your .env file")
        return
    
    print(f"\n✓ AXESSO API Key: {AXESSO_API_KEY[:8]}...{AXESSO_API_KEY[-4:]}")
    print(f"✓ Base URL: {AXESSO_URL}")
    
    for location in TEST_LOCATIONS:
        print(f"\n\n{'#'*70}")
        print(f" Testing location: {location}")
        print('#'*70)
        
        print("\n→ Calling market-data endpoint...")
        market_data = await get_market_data(location)
        
        if market_data:
            # Save full response for reference
            output_file = f"axesso_market_data_{location.replace(' ', '_').replace(',', '')}.json"
            with open(output_file, "w") as f:
                json.dump(market_data, f, indent=2, default=str)
            print(f"  ✓ Full response saved to: {output_file}")
            
            # Extract relevant fields
            relevant_fields = extract_relevant_fields(market_data)
            if relevant_fields:
                print_section("MARKET DATA FIELDS", relevant_fields)
            else:
                print("\n  ⚠ No relevant market fields found in response")
                print(f"\n  Response keys: {list(market_data.keys())[:10]}")
        else:
            print("  ❌ No data returned from endpoint")
    
    print("\n\n" + "="*70)
    print(" COMPARISON SUMMARY")
    print("="*70)
    print("""
    RentCast saleData provides:
    - averageDaysOnMarket    ✓ (we extract this)
    - medianDaysOnMarket     ✓ (we extract this)
    - minDaysOnMarket        ✓ (we extract this)
    - maxDaysOnMarket        ✓ (we extract this)
    - newListings            ✓ (we extract this)
    - totalListings          ✓ (we extract this)
    - dataByPropertyType     (breakdown by property type)
    - dataByBedrooms         (breakdown by bedroom count)
    
    If AXESSO has similar fields, they can be merged for cross-validation.
    """)
    print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
