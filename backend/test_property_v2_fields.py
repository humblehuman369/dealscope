#!/usr/bin/env python3
"""
Test script to explore AXESSO Property Details V2 API response.
Documents all available listing-related fields for investor analysis.

Run: python test_property_v2_fields.py
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

# Test addresses - mix of active listings and off-market properties
TEST_ADDRESSES = [
    "953 Banyan Dr, Delray Beach, FL 33483",  # Known property
]

# Fields we're specifically looking for
LISTING_FIELDS_OF_INTEREST = [
    # Listing Status Fields
    "homeStatus",           # FOR_SALE, FOR_RENT, OFF_MARKET, SOLD, PENDING
    "listingStatus",        # Alternative field name
    "status",               # Alternative field name
    "listingSubStatus",     # Active, Pending, Contingent, Closed, Withdrawn
    "isListedByOwner",      # FSBO indicator
    "listingSource",        # Source of listing
    
    # Price Fields
    "price",                # Current price
    "listPrice",            # Listed price
    "zestimate",            # Zillow estimate
    "rentZestimate",        # Rental estimate
    "lastSoldPrice",        # Last sale price
    
    # Seller Type Indicators
    "sellerType",           # Agent, FSBO, etc.
    "attributionInfo",      # Listing attribution
    "isForeclosure",        # Foreclosure indicator
    "isPreForeclosure",     # Pre-foreclosure indicator
    "isBankOwned",          # Bank owned/REO
    "isAuction",            # Auction listing
    "isForSaleByOwner",     # FSBO
    "isNewConstruction",    # New construction
    
    # Timing Fields
    "daysOnZillow",         # Days on market
    "timeOnZillow",         # Time string
    "dateSold",             # Sale date if sold
    "datePosted",           # Original listing date
    "listedDate",           # Listed date
    
    # Listing Agent Info
    "listingAgent",         # Agent details
    "brokerageName",        # Brokerage
    "mlsId",                # MLS ID
    
    # Additional investor-relevant fields
    "priceChange",          # Price reduction
    "priceHistory",         # Price history array
    "taxHistory",           # Tax history
    "openHouseSchedule",    # Open houses
]


async def search_by_address(address: str) -> dict:
    """Search for property by address to get ZPID."""
    headers = {
        "axesso-api-key": AXESSO_API_KEY,
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{AXESSO_URL}/search-by-address"
        response = await client.get(url, headers=headers, params={"address": address})
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Search failed: {response.status_code} - {response.text}")
            return {}


async def get_property_v2(zpid: str) -> dict:
    """Get full property details from property-v2 endpoint."""
    headers = {
        "axesso-api-key": AXESSO_API_KEY,
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{AXESSO_URL}/property-v2"
        response = await client.get(url, headers=headers, params={"zpid": zpid})
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Property-v2 failed: {response.status_code} - {response.text}")
            return {}


def extract_listing_fields(data: dict, prefix: str = "") -> dict:
    """Recursively extract all listing-related fields from response."""
    found_fields = {}
    
    if not isinstance(data, dict):
        return found_fields
    
    for key, value in data.items():
        full_key = f"{prefix}.{key}" if prefix else key
        
        # Check if this is a field of interest
        if key in LISTING_FIELDS_OF_INTEREST:
            found_fields[full_key] = value
        
        # Also look for any field containing certain keywords
        key_lower = key.lower()
        if any(term in key_lower for term in ["status", "listing", "price", "sale", "rent", "forecast", "auction", "owner"]):
            if full_key not in found_fields:
                found_fields[full_key] = value
        
        # Recurse into nested dicts
        if isinstance(value, dict):
            nested = extract_listing_fields(value, full_key)
            found_fields.update(nested)
        elif isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
            # Check first item in list
            nested = extract_listing_fields(value[0], f"{full_key}[0]")
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
    print(" AXESSO PROPERTY-V2 API FIELD EXPLORATION")
    print(" Documenting listing status, price, and seller type fields")
    print("="*70)
    
    if not AXESSO_API_KEY:
        print("\n❌ ERROR: AXESSO_API_KEY not configured in environment")
        print("   Please set AXESSO_API_KEY in your .env file")
        return
    
    print(f"\n✓ AXESSO API Key: {AXESSO_API_KEY[:8]}...{AXESSO_API_KEY[-4:]}")
    print(f"✓ Base URL: {AXESSO_URL}")
    
    for address in TEST_ADDRESSES:
        print(f"\n\n{'#'*70}")
        print(f" Testing: {address}")
        print('#'*70)
        
        # Step 1: Search by address to get ZPID
        print("\n→ Step 1: Searching by address...")
        search_result = await search_by_address(address)
        
        if not search_result:
            print("  ❌ No search results")
            continue
        
        # Extract ZPID
        zpid = search_result.get("zpid")
        print(f"  ✓ Found ZPID: {zpid}")
        
        # Show search result listing fields
        search_fields = extract_listing_fields(search_result)
        if search_fields:
            print_section("SEARCH-BY-ADDRESS LISTING FIELDS", search_fields)
        
        # Step 2: Get full property details
        if zpid:
            print("\n→ Step 2: Getting property-v2 details...")
            property_data = await get_property_v2(str(zpid))
            
            if property_data:
                # Extract all listing-related fields
                listing_fields = extract_listing_fields(property_data)
                print_section("PROPERTY-V2 LISTING FIELDS", listing_fields)
                
                # Save full response for reference
                output_file = f"property_v2_response_{zpid}.json"
                with open(output_file, "w") as f:
                    json.dump(property_data, f, indent=2, default=str)
                print(f"\n  ✓ Full response saved to: {output_file}")
                
                # Summary of key fields
                print("\n" + "-"*60)
                print(" KEY FIELDS SUMMARY")
                print("-"*60)
                
                key_fields = {
                    "homeStatus": property_data.get("homeStatus"),
                    "listingSubStatus": property_data.get("listingSubStatus"),
                    "price": property_data.get("price"),
                    "zestimate": property_data.get("zestimate"),
                    "rentZestimate": property_data.get("rentZestimate"),
                    "isForeclosure": property_data.get("isForeclosure"),
                    "isBankOwned": property_data.get("isBankOwned"),
                    "isForSaleByOwner": property_data.get("isForSaleByOwner"),
                    "daysOnZillow": property_data.get("daysOnZillow"),
                }
                
                for key, value in key_fields.items():
                    status = "✓" if value is not None else "✗"
                    print(f"  {status} {key}: {value}")
            else:
                print("  ❌ No property-v2 data returned")
    
    print("\n\n" + "="*70)
    print(" EXPLORATION COMPLETE")
    print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
