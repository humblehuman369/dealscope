#!/usr/bin/env python3
"""
Test script for InvestIQ Unified Property Service

Demonstrates the complete data pipeline:
1. Fetch data from RentCast and AXESSO (Zillow)
2. Normalize and merge data
3. Calculate investment metrics
4. Export to CSV and JSON
"""
import asyncio
import os
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent to path for imports
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.unified_property_service import create_unified_service
from app.services.zillow_client import create_zillow_client


async def test_zillow_endpoints(address: str):
    """Test individual Zillow endpoints to verify API is working."""
    print("\n" + "="*60)
    print("TESTING AXESSO ZILLOW API ENDPOINTS")
    print("="*60)
    
    api_key = os.getenv("AXESSO_API_KEY", "")
    if not api_key:
        print("❌ AXESSO_API_KEY not configured")
        return
    
    client = create_zillow_client(api_key)
    
    # Test search-by-address
    print(f"\n📍 Testing search-by-address for: {address}")
    result = await client.search_by_address(address)
    print(f"   Status: {'✅ Success' if result.success else '❌ Failed'}")
    if result.success:
        print(f"   ZPID: {result.zpid or 'Not found in response'}")
        if result.data:
            print(f"   Data keys: {list(result.data.keys()) if isinstance(result.data, dict) else 'array'}")
    else:
        print(f"   Error: {result.error}")
    
    # If we got a zpid, test more endpoints
    zpid = result.zpid
    if not zpid and result.data:
        if isinstance(result.data, dict):
            zpid = result.data.get('zpid')
        elif isinstance(result.data, list) and len(result.data) > 0:
            zpid = result.data[0].get('zpid')
    
    if zpid:
        print(f"\n📊 Testing property-v2 with zpid: {zpid}")
        details = await client.get_property_details(zpid=zpid)
        print(f"   Status: {'✅ Success' if details.success else '❌ Failed'}")
        if details.error:
            print(f"   Error: {details.error}")
        
        print(f"\n💰 Testing price-tax-history")
        history = await client.get_price_tax_history(zpid=zpid)
        print(f"   Status: {'✅ Success' if history.success else '❌ Failed'}")
        
        print(f"\n🏠 Testing similar-properties")
        similar = await client.get_similar_for_sale(zpid=zpid)
        print(f"   Status: {'✅ Success' if similar.success else '❌ Failed'}")
        
        print(f"\n🎓 Testing schools")
        schools = await client.get_nearby_schools(zpid=zpid)
        print(f"   Status: {'✅ Success' if schools.success else '❌ Failed'}")
        
        print(f"\n🚶 Testing accessibility-scores")
        scores = await client.get_accessibility_scores(zpid=zpid)
        print(f"   Status: {'✅ Success' if scores.success else '❌ Failed'}")
    else:
        print("\n⚠️  No ZPID found, skipping detailed endpoint tests")
    
    return result


async def test_full_pipeline(address: str):
    """Test the complete unified service pipeline."""
    print("\n" + "="*60)
    print("TESTING UNIFIED PROPERTY SERVICE")
    print("="*60)
    
    rentcast_key = os.getenv("RENTCAST_API_KEY", "")
    rentcast_url = os.getenv("RENTCAST_URL", "https://api.rentcast.io/v1")
    axesso_key = os.getenv("AXESSO_API_KEY", "")
    axesso_url = os.getenv("AXESSO_URL", "https://api.axesso.de/zil")
    
    if not rentcast_key:
        print("❌ RENTCAST_API_KEY not configured")
        return
    
    print(f"\n📍 Property: {address}")
    print(f"   RentCast API: {'✅ Configured' if rentcast_key else '❌ Missing'}")
    print(f"   AXESSO API: {'✅ Configured' if axesso_key else '❌ Missing'}")
    
    # Create service
    service = create_unified_service(
        rentcast_api_key=rentcast_key,
        rentcast_url=rentcast_url,
        axesso_api_key=axesso_key,
        axesso_url=axesso_url
    )
    
    # Fetch data
    print("\n⏳ Fetching property data from all sources...")
    start = datetime.now()
    
    try:
        result = await service.get_property(address)
        elapsed = (datetime.now() - start).total_seconds()
        print(f"✅ Data fetched in {elapsed:.2f}s")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Display results
    normalized = result["normalized"]
    metrics = result["investment_metrics"]
    quality = result["data_quality"]
    metadata = result["metadata"]
    
    print("\n" + "-"*40)
    print("NORMALIZED PROPERTY DATA")
    print("-"*40)
    
    print(f"\n📍 Address: {normalized.get('formatted_address', 'N/A')}")
    print(f"   Type: {normalized.get('property_type', 'N/A')}")
    print(f"   Beds: {normalized.get('bedrooms', 'N/A')} | Baths: {normalized.get('bathrooms', 'N/A')}")
    print(f"   Sq Ft: {normalized.get('square_footage', 'N/A'):,}" if normalized.get('square_footage') else "   Sq Ft: N/A")
    print(f"   Year Built: {normalized.get('year_built', 'N/A')}")
    
    print(f"\n💰 VALUATIONS")
    print(f"   Current AVM: ${normalized.get('current_value_avm') or 0:,.0f}")
    print(f"   RentCast AVM: ${normalized.get('rentcast_avm') or 0:,.0f}")
    print(f"   Zillow Zestimate: ${normalized.get('zestimate') or 0:,.0f}" if normalized.get('zestimate') else "   Zillow Zestimate: N/A")
    print(f"   Value Range: ${normalized.get('value_range_low') or 0:,.0f} - ${normalized.get('value_range_high') or 0:,.0f}")
    
    print(f"\n🏠 RENTAL")
    print(f"   Monthly Rent: ${normalized.get('monthly_rent_estimate') or 0:,.0f}")
    print(f"   RentCast Rent: ${normalized.get('rentcast_rent') or 0:,.0f}")
    print(f"   Zillow Rent: ${normalized.get('rent_zestimate') or 0:,.0f}" if normalized.get('rent_zestimate') else "   Zillow Rent: N/A")
    print(f"   Rent Range: ${normalized.get('rent_range_low') or 0:,.0f} - ${normalized.get('rent_range_high') or 0:,.0f}")
    
    print(f"\n📊 TAX")
    print(f"   Annual Tax: ${normalized.get('annual_property_tax') or 0:,.0f}")
    print(f"   Assessed Value: ${normalized.get('tax_assessed_value') or 0:,.0f}")
    
    print(f"\n🚶 SCORES (from Zillow)")
    print(f"   Walk Score: {normalized.get('walk_score', 'N/A')}")
    print(f"   Transit Score: {normalized.get('transit_score', 'N/A')}")
    print(f"   Bike Score: {normalized.get('bike_score', 'N/A')}")
    print(f"   School Rating: {normalized.get('school_rating_avg', 'N/A')}")
    
    print("\n" + "-"*40)
    print("INVESTMENT METRICS")
    print("-"*40)
    
    for key, value in metrics.items():
        if isinstance(value, dict):
            continue
        if isinstance(value, float):
            if "pct" in key or "roi" in key or "rate" in key:
                print(f"   {key}: {value}%")
            elif value > 100:
                print(f"   {key}: ${value:,.0f}")
            else:
                print(f"   {key}: {value:.2f}")
        else:
            print(f"   {key}: {value}")
    
    print("\n" + "-"*40)
    print("DATA QUALITY")
    print("-"*40)
    print(f"   Quality Score: {quality['score']}%")
    print(f"   Missing Fields: {quality['missing_fields'] or 'None'}")
    print(f"   Conflict Fields: {quality['conflict_fields'] or 'None'}")
    
    summary = quality.get('provenance_summary', {})
    if summary:
        print(f"   Data by Source: {summary.get('by_source', {})}")
        print(f"   Data by Confidence: {summary.get('by_confidence', {})}")
    
    print("\n" + "-"*40)
    print("EXPORTING DATA")
    print("-"*40)
    
    # Export to files
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    csv_path = os.path.join(output_dir, f"investiq_property_report_{timestamp}.csv")
    json_path = os.path.join(output_dir, f"investiq_property_data_{timestamp}.json")
    
    await service.export_to_csv(address, csv_path)
    print(f"   ✅ CSV: {csv_path}")
    
    await service.export_to_json(address, json_path)
    print(f"   ✅ JSON: {json_path}")
    
    return result


async def main():
    """Main test entry point."""
    print("\n" + "="*60)
    print("INVESTIQ UNIFIED DATA SERVICE TEST")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Test property
    address = "953 Banyan Dr, Delray Beach, FL 33483"
    
    # First test Zillow endpoints directly
    await test_zillow_endpoints(address)
    
    # Then test full pipeline
    await test_full_pipeline(address)
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())

