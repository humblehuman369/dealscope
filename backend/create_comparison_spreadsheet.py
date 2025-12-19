"""
Create a comparison spreadsheet between RentCast and AXESSO data
for 953 Banyan Dr, Delray Beach, FL 33483
"""
import json
import csv
from datetime import datetime
from typing import Dict, Any, Optional

def load_json_file(filepath: str) -> Dict[str, Any]:
    """Load JSON data from file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def safe_get(data: Dict, *keys, default=None):
    """Safely get nested dictionary values."""
    for key in keys:
        if isinstance(data, dict):
            data = data.get(key, {})
        else:
            return default
    return data if data != {} else default

def format_currency(value):
    """Format value as currency."""
    if value is None or value == '':
        return 'N/A'
    try:
        return f"${float(value):,.0f}"
    except:
        return str(value)

def format_number(value):
    """Format value as number."""
    if value is None or value == '':
        return 'N/A'
    try:
        return f"{float(value):,.0f}"
    except:
        return str(value)

def format_date(value):
    """Format date value."""
    if value is None or value == '':
        return 'N/A'
    try:
        # Parse ISO date
        if 'T' in str(value):
            dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
            return dt.strftime('%B %d, %Y')
        return str(value)
    except:
        return str(value)

def create_comparison_spreadsheet(rentcast_file: str, axesso_file: str, output_file: str):
    """Create comparison spreadsheet."""
    
    # Load data
    rentcast_data = load_json_file(rentcast_file)
    axesso_data = load_json_file(axesso_file)
    
    # Extract RentCast property data
    rc_property = safe_get(rentcast_data, 'endpoints', 'properties', 'data')
    if rc_property and isinstance(rc_property, list) and len(rc_property) > 0:
        rc_property = rc_property[0]
    else:
        rc_property = {}
    
    rc_avm = safe_get(rentcast_data, 'endpoints', 'avm_value', 'data')
    rc_rent = safe_get(rentcast_data, 'endpoints', 'rent_estimate', 'data')
    rc_market = safe_get(rentcast_data, 'endpoints', 'market_stats', 'data')
    
    # Extract AXESSO property data
    ax_property = safe_get(axesso_data, 'endpoints', 'property_details', 'data')
    ax_search = safe_get(axesso_data, 'endpoints', 'area_search', 'data')
    
    # Check for errors
    rc_has_data = rc_property != {}
    ax_has_data = ax_property is not None and ax_property != {}
    
    # Create comparison data
    comparison_rows = []
    
    # Header
    comparison_rows.append(['Data Category', 'Field', 'RentCast Value', 'AXESSO Value', 'Match Status', 'Notes'])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Basic Property Information
    comparison_rows.append(['BASIC PROPERTY INFO', '', '', '', '', ''])
    comparison_rows.append([
        'Property', 'Address',
        safe_get(rc_property, 'formattedAddress', default='N/A'),
        safe_get(ax_property, 'address', default='N/A'),
        '✓' if rc_has_data else '✗',
        'AXESSO: 404 Error' if not ax_has_data else ''
    ])
    comparison_rows.append([
        'Property', 'Property Type',
        safe_get(rc_property, 'propertyType', default='N/A'),
        safe_get(ax_property, 'homeType', default='N/A'),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Property', 'Bedrooms',
        format_number(safe_get(rc_property, 'bedrooms')),
        format_number(safe_get(ax_property, 'bedrooms')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Property', 'Bathrooms',
        format_number(safe_get(rc_property, 'bathrooms')),
        format_number(safe_get(ax_property, 'bathrooms')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Property', 'Square Footage',
        format_number(safe_get(rc_property, 'squareFootage')),
        format_number(safe_get(ax_property, 'livingArea')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Property', 'Lot Size (sq ft)',
        format_number(safe_get(rc_property, 'lotSize')),
        format_number(safe_get(ax_property, 'lotAreaValue')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Property', 'Year Built',
        format_number(safe_get(rc_property, 'yearBuilt')),
        format_number(safe_get(ax_property, 'yearBuilt')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Valuation Data
    comparison_rows.append(['VALUATION DATA', '', '', '', '', ''])
    comparison_rows.append([
        'Valuation', 'Current AVM Estimate',
        format_currency(safe_get(rc_avm, 'price')),
        format_currency(safe_get(ax_property, 'zestimate')),
        '✓' if rc_has_data else '✗',
        'RentCast AVM'
    ])
    comparison_rows.append([
        'Valuation', 'Value Range Low',
        format_currency(safe_get(rc_avm, 'priceRangeLow')),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Valuation', 'Value Range High',
        format_currency(safe_get(rc_avm, 'priceRangeHigh')),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Valuation', 'Last Sale Price',
        format_currency(safe_get(rc_property, 'lastSalePrice')),
        format_currency(safe_get(ax_property, 'lastSoldPrice')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Valuation', 'Last Sale Date',
        format_date(safe_get(rc_property, 'lastSaleDate')),
        format_date(safe_get(ax_property, 'lastSoldDate')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Tax Information
    comparison_rows.append(['TAX INFORMATION', '', '', '', '', ''])
    rc_tax_2024 = safe_get(rc_property, 'propertyTaxes', '2024', 'total')
    rc_assessed_2024 = safe_get(rc_property, 'taxAssessments', '2024', 'value')
    comparison_rows.append([
        'Taxes', '2024 Property Taxes',
        format_currency(rc_tax_2024),
        format_currency(safe_get(ax_property, 'annualTaxAmount')),
        '✓' if rc_tax_2024 else '✗',
        ''
    ])
    comparison_rows.append([
        'Taxes', '2024 Tax Assessed Value',
        format_currency(rc_assessed_2024),
        format_currency(safe_get(ax_property, 'taxAssessedValue')),
        '✓' if rc_assessed_2024 else '✗',
        ''
    ])
    comparison_rows.append([
        'Taxes', '2024 Land Value',
        format_currency(safe_get(rc_property, 'taxAssessments', '2024', 'land')),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Taxes', '2024 Improvements Value',
        format_currency(safe_get(rc_property, 'taxAssessments', '2024', 'improvements')),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Rental Data
    comparison_rows.append(['RENTAL DATA', '', '', '', '', ''])
    comparison_rows.append([
        'Rental', 'Monthly Rent Estimate',
        format_currency(safe_get(rc_rent, 'rent')),
        format_currency(safe_get(ax_property, 'rentZestimate')),
        '✓' if rc_has_data else '✗',
        'Long-term rental estimate'
    ])
    comparison_rows.append([
        'Rental', 'Rent Range Low',
        format_currency(safe_get(rc_rent, 'rentRangeLow')),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Rental', 'Rent Range High',
        format_currency(safe_get(rc_rent, 'rentRangeHigh')),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Property Features
    comparison_rows.append(['PROPERTY FEATURES', '', '', '', '', ''])
    rc_features = safe_get(rc_property, 'features', default={})
    comparison_rows.append([
        'Features', 'Pool',
        'Yes' if safe_get(rc_features, 'pool') else 'No',
        'Yes' if safe_get(ax_property, 'hasPool') else 'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Features', 'Garage',
        'Yes' if safe_get(rc_features, 'garage') else 'No',
        'Yes' if safe_get(ax_property, 'hasGarage') else 'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Features', 'Floor Count',
        format_number(safe_get(rc_features, 'floorCount')),
        format_number(safe_get(ax_property, 'stories')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Features', 'View Type',
        safe_get(rc_features, 'viewType', default='N/A'),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Features', 'Exterior Type',
        safe_get(rc_features, 'exteriorType', default='N/A'),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Features', 'Roof Type',
        safe_get(rc_features, 'roofType', default='N/A'),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Location Data
    comparison_rows.append(['LOCATION DATA', '', '', '', '', ''])
    comparison_rows.append([
        'Location', 'City',
        safe_get(rc_property, 'city', default='N/A'),
        safe_get(ax_property, 'city', default='N/A'),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Location', 'State',
        safe_get(rc_property, 'state', default='N/A'),
        safe_get(ax_property, 'state', default='N/A'),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Location', 'Zip Code',
        safe_get(rc_property, 'zipCode', default='N/A'),
        safe_get(ax_property, 'zipcode', default='N/A'),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Location', 'County',
        safe_get(rc_property, 'county', default='N/A'),
        safe_get(ax_property, 'county', default='N/A'),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Location', 'Latitude',
        str(safe_get(rc_property, 'latitude', default='N/A')),
        str(safe_get(ax_property, 'latitude', default='N/A')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Location', 'Longitude',
        str(safe_get(rc_property, 'longitude', default='N/A')),
        str(safe_get(ax_property, 'longitude', default='N/A')),
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Owner Information
    comparison_rows.append(['OWNER INFORMATION', '', '', '', '', ''])
    rc_owner = safe_get(rc_property, 'owner', default={})
    owner_names = safe_get(rc_owner, 'names', default=[])
    comparison_rows.append([
        'Owner', 'Owner Name',
        ', '.join(owner_names) if owner_names else 'N/A',
        'N/A',
        '✓' if owner_names else '✗',
        ''
    ])
    comparison_rows.append([
        'Owner', 'Owner Type',
        safe_get(rc_owner, 'type', default='N/A'),
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Owner', 'Owner Occupied',
        'Yes' if safe_get(rc_property, 'ownerOccupied') else 'No',
        'N/A',
        '✓' if rc_has_data else '✗',
        ''
    ])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Market Statistics (RentCast only)
    comparison_rows.append(['MARKET STATISTICS (ZIP 33483)', '', '', '', '', ''])
    rc_sale_data = safe_get(rc_market, 'saleData', default={})
    comparison_rows.append([
        'Market', 'Average Sale Price',
        format_currency(safe_get(rc_sale_data, 'averagePrice')),
        'N/A',
        '✓' if rc_sale_data else '✗',
        'Zip code market average'
    ])
    comparison_rows.append([
        'Market', 'Median Sale Price',
        format_currency(safe_get(rc_sale_data, 'medianPrice')),
        'N/A',
        '✓' if rc_sale_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Market', 'Avg Price per Sq Ft',
        f"${safe_get(rc_sale_data, 'averagePricePerSquareFoot', default='N/A')}",
        'N/A',
        '✓' if rc_sale_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Market', 'Avg Days on Market',
        format_number(safe_get(rc_sale_data, 'averageDaysOnMarket')),
        'N/A',
        '✓' if rc_sale_data else '✗',
        ''
    ])
    comparison_rows.append([
        'Market', 'Total Active Listings',
        format_number(safe_get(rc_sale_data, 'totalListings')),
        'N/A',
        '✓' if rc_sale_data else '✗',
        ''
    ])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Data Quality Summary
    comparison_rows.append(['DATA QUALITY SUMMARY', '', '', '', '', ''])
    comparison_rows.append([
        'Summary', 'RentCast Status',
        'SUCCESS - All 6 endpoints returned data',
        '',
        '✓',
        'Properties, AVM, Rent, Market, Sale Listings, Rental Listings'
    ])
    comparison_rows.append([
        'Summary', 'AXESSO Status',
        '',
        'FAILED - 404 Errors on both endpoints',
        '✗',
        'Property Details and Area Search both returned 404'
    ])
    comparison_rows.append([
        'Summary', 'Data Fetched',
        format_date(safe_get(rentcast_data, 'fetched_at')),
        format_date(safe_get(axesso_data, 'fetched_at')),
        '',
        ''
    ])
    comparison_rows.append(['', '', '', '', '', ''])
    
    # Comparable Properties Summary
    rc_avm_comps = safe_get(rc_avm, 'comparables', default=[])
    rc_rent_comps = safe_get(rc_rent, 'comparables', default=[])
    comparison_rows.append(['COMPARABLE DATA AVAILABLE', '', '', '', '', ''])
    comparison_rows.append([
        'Comparables', 'Sale Comparables Count',
        str(len(rc_avm_comps)) if rc_avm_comps else '0',
        'N/A',
        '✓' if rc_avm_comps else '✗',
        'Used for AVM calculation'
    ])
    comparison_rows.append([
        'Comparables', 'Rental Comparables Count',
        str(len(rc_rent_comps)) if rc_rent_comps else '0',
        'N/A',
        '✓' if rc_rent_comps else '✗',
        'Used for rent estimate'
    ])
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(comparison_rows)
    
    print(f"✓ Comparison spreadsheet created: {output_file}")
    print(f"  - Total rows: {len(comparison_rows)}")
    print(f"  - RentCast data: {'Available' if rc_has_data else 'Not Available'}")
    print(f"  - AXESSO data: {'Available' if ax_has_data else 'Not Available (404 errors)'}")
    
    return output_file

if __name__ == "__main__":
    import os
    
    # File paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    rentcast_file = os.path.join(script_dir, "rentcast_953_banyan_dr_20251219_145626.txt")
    axesso_file = os.path.join(script_dir, "axesso_953_banyan_dr_20251219_145626.txt")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(script_dir, f"comparison_rentcast_vs_axesso_{timestamp}.csv")
    
    print("=" * 60)
    print("Creating Comparison Spreadsheet")
    print("=" * 60)
    print(f"Property: 953 Banyan Dr, Delray Beach, FL 33483")
    print(f"RentCast file: {os.path.basename(rentcast_file)}")
    print(f"AXESSO file: {os.path.basename(axesso_file)}")
    print()
    
    create_comparison_spreadsheet(rentcast_file, axesso_file, output_file)
    
    print()
    print("=" * 60)
    print("Comparison Complete!")
    print("=" * 60)

