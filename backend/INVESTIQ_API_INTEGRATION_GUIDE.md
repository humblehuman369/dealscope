# InvestIQ API Integration Architecture

## Overview

This document describes the intelligent methodology for combining and normalizing data from **RentCast** and **Zillow (via AXESSO)** APIs to provide comprehensive real estate investment analysis.

## API Endpoints

### RentCast API (Primary for Property Records)
- **Base URL**: `https://api.rentcast.io/v1`
- **Authentication**: `X-Api-Key` header

| Endpoint | Purpose | Data Provided |
|----------|---------|---------------|
| `/properties` | Property records | Address, beds/baths, sqft, lot, year built, features, owner info, tax history |
| `/avm/value` | Automated Valuation | Current value estimate, value range, comparable sales |
| `/avm/rent/long-term` | Rent Estimate | Monthly rent, rent range, rental comps |
| `/markets` | Market Statistics | Median prices, days on market, inventory |
| `/listings/sale` | Sale Listings | Active listings in area |
| `/listings/rental/long-term` | Rental Listings | Active rentals in area |

### AXESSO Zillow API (Primary for Zestimates & Scores)
- **Base URL**: `https://api.axesso.de/zil`
- **Authentication**: `axesso-api-key` header

| Endpoint | Purpose | Data Provided |
|----------|---------|---------------|
| `/search-by-address` | Property Lookup | ZPID, Zestimate, Rent Zestimate, basic details |
| `/property-v2` | Full Details | Complete property profile, photos, description |
| `/price-tax-history` | History | Historical prices, tax assessments |
| `/zestimate-history` | Value Trends | Zestimate changes over time |
| `/rent-estimate` | Rental Value | Rental Zestimate with comps |
| `/similar-properties` | For Sale Comps | Similar properties currently listed |
| `/similar-rent` | Rental Comps | Similar rentals currently listed |
| `/similar-sold` | Sold Comps | Recently sold comparable properties |
| `/schools` | School Ratings | Nearby schools with ratings |
| `/accessibility-scores` | Walk Scores | Walk, transit, bike scores |
| `/market-data` | Market Stats | Local market trends |

## Data Priority Matrix

The system uses an intelligent priority matrix to determine which source to use for each data point:

| Data Category | Primary Source | Secondary | Weight (Primary/Secondary) |
|--------------|----------------|-----------|---------------------------|
| Property Records | RentCast | Zillow | 70% / 30% |
| Property Valuation (AVM) | RentCast | Zillow | 55% / 45% |
| Rent Estimates | RentCast | Zillow | 60% / 40% |
| Tax Data | RentCast | Zillow | 80% / 20% |
| Owner Information | RentCast | N/A | 100% / 0% |
| School Ratings | Zillow | N/A | 0% / 100% |
| Walk/Transit Scores | Zillow | N/A | 0% / 100% |
| Zestimate History | Zillow | N/A | 0% / 100% |
| Market Statistics | RentCast | Zillow | 60% / 40% |

## Conflict Resolution

When both sources provide the same data point with different values:

1. **Calculate Variance**: `|value1 - value2| / value1 * 100`
2. **If Variance < 15%**: Use primary source value, flag as HIGH confidence
3. **If Variance >= 15%**: Use weighted average, flag as MEDIUM confidence, mark as conflict

### Example:
```
RentCast AVM: $4,500,000
Zillow Zestimate: $4,200,000
Variance: 6.7% (< 15%)
Result: Use RentCast value ($4,500,000) with HIGH confidence
```

```
RentCast AVM: $6,000,000
Zillow Zestimate: $4,200,000
Variance: 30% (> 15%)
Result: Weighted merge (55% * $6M + 45% * $4.2M = $5,190,000) with MEDIUM confidence
Field flagged for manual review
```

## Data Fetch Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROPERTY ADDRESS INPUT                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │         PARALLEL FETCH          │
            │                                 │
    ┌───────▼───────┐               ┌─────────▼─────────┐
    │   RENTCAST    │               │   AXESSO/ZILLOW   │
    │               │               │                   │
    │ • properties  │               │ • search-by-addr  │
    │ • avm/value   │               │ • property-v2     │
    │ • avm/rent    │               │ • price-tax-hist  │
    │ • markets     │               │ • similar-*       │
    │ • listings    │               │ • schools         │
    │               │               │ • access-scores   │
    └───────┬───────┘               └─────────┬─────────┘
            │                                 │
            └────────────────┬────────────────┘
                             │
                    ┌────────▼────────┐
                    │   NORMALIZER    │
                    │                 │
                    │ • Field mapping │
                    │ • Conflict res  │
                    │ • Provenance    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  INVESTMENT     │
                    │  CALCULATOR     │
                    │                 │
                    │ • Cap Rate      │
                    │ • GRM           │
                    │ • Cash Flow     │
                    │ • CoC ROI       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  NORMALIZED     │
                    │  PROPERTY DATA  │
                    │                 │
                    │ + provenance    │
                    │ + quality score │
                    │ + metrics       │
                    └─────────────────┘
```

## Normalized Data Schema

### Core Fields

| Field | Type | Primary Source |
|-------|------|----------------|
| `property_id` | String | RentCast |
| `zpid` | String | Zillow |
| `formatted_address` | String | RentCast |
| `city`, `state`, `zip_code` | String | RentCast |
| `property_type` | String | RentCast |
| `bedrooms` | Integer | RentCast |
| `bathrooms` | Float | RentCast |
| `square_footage` | Integer | RentCast |
| `lot_size` | Integer | RentCast |
| `year_built` | Integer | RentCast |

### Valuation Fields

| Field | Type | Description |
|-------|------|-------------|
| `current_value_avm` | Float | **Best estimate** (merged if conflict) |
| `rentcast_avm` | Float | RentCast AVM (for comparison) |
| `zestimate` | Float | Zillow Zestimate (for comparison) |
| `value_range_low` | Float | RentCast confidence range |
| `value_range_high` | Float | RentCast confidence range |

### Rental Fields

| Field | Type | Description |
|-------|------|-------------|
| `monthly_rent_estimate` | Float | **Best estimate** (merged if conflict) |
| `rentcast_rent` | Float | RentCast rent estimate |
| `rent_zestimate` | Float | Zillow rent Zestimate |
| `rent_range_low` | Float | RentCast confidence range |
| `rent_range_high` | Float | RentCast confidence range |

### Investment Metrics (Calculated)

| Metric | Formula |
|--------|---------|
| `gross_rent_multiplier` | `value / (rent * 12)` |
| `estimated_cap_rate` | `(NOI / value) * 100` |
| `price_per_sqft` | `value / sqft` |
| `rent_per_sqft` | `rent / sqft` |
| `estimated_monthly_cash_flow` | `rent - expenses - mortgage` |
| `estimated_cash_on_cash_roi` | `(annual_cash_flow / cash_invested) * 100` |

## Data Quality Scoring

The system calculates a data quality score (0-100%) based on:

1. **Critical Fields (60% weight)**:
   - Address, property type, beds/baths, sqft
   - Current value, monthly rent
   - Annual tax, last sale price

2. **Important Fields (30% weight)**:
   - Year built, lot size
   - Value/rent ranges
   - Tax assessed value

3. **Nice-to-Have Fields (10% weight)**:
   - Walk score, school ratings
   - Pool, garage
   - Owner info

### Penalties
- Each conflict field: -2% from score

## File Structure

```
backend/app/services/
├── api_clients.py           # Original RentCast client
├── zillow_client.py          # NEW: Comprehensive AXESSO Zillow client
├── data_normalizer.py        # NEW: Data merging and normalization
├── unified_property_service.py  # NEW: Main orchestration service
└── calculators.py            # Investment calculations
```

## Usage Example

```python
from app.services.unified_property_service import create_unified_service

# Create service with API keys
service = create_unified_service(
    rentcast_api_key="your-rentcast-key",
    rentcast_url="https://api.rentcast.io/v1",
    axesso_api_key="your-axesso-key",
    axesso_url="https://api.axesso.de/zil"
)

# Fetch comprehensive property data
result = await service.get_property("953 Banyan Dr, Delray Beach, FL 33483")

# Access normalized data
normalized = result["normalized"]
print(f"Value: ${normalized['current_value_avm']:,.0f}")
print(f"Rent: ${normalized['monthly_rent_estimate']:,.0f}")

# Access investment metrics
metrics = result["investment_metrics"]
print(f"Cap Rate: {metrics['estimated_cap_rate']}%")
print(f"GRM: {metrics['gross_rent_multiplier']}")

# Access data quality info
quality = result["data_quality"]
print(f"Quality Score: {quality['score']}%")
print(f"Conflicts: {quality['conflict_fields']}")

# Export to CSV
await service.export_to_csv(address, "property_report.csv")
```

## Investor Advantages

1. **Comprehensive Data**: Combines the best of both RentCast (property records, tax data, owner info) and Zillow (Zestimates, schools, walk scores)

2. **Valuation Comparison**: See both RentCast AVM and Zillow Zestimate side-by-side to identify discrepancies

3. **Conflict Detection**: Automatic flagging when data sources disagree significantly

4. **Investment Metrics**: Pre-calculated cap rate, GRM, cash flow estimates

5. **Data Quality Visibility**: Know exactly how complete and reliable your data is

6. **Provenance Tracking**: Every field shows its source and confidence level

## Environment Variables

```bash
# RentCast
RENTCAST_API_KEY=your-rentcast-api-key
RENTCAST_URL=https://api.rentcast.io/v1

# AXESSO (Zillow)
AXESSO_API_KEY=your-axesso-api-key
AXESSO_URL=https://api.axesso.de/zil
```

