import { NextResponse } from 'next/server'

// Demo property data - matching the Python backend's mock property
const DEMO_PROPERTY = {
  property_id: "demo-fl-12345",
  address: {
    street: "123 Palm Beach Way",
    city: "West Palm Beach",
    state: "FL",
    zip_code: "33486",
    county: "Palm Beach County",
    full_address: "123 Palm Beach Way, West Palm Beach, FL 33486"
  },
  details: {
    property_type: "Single Family",
    bedrooms: 4,
    bathrooms: 2.5,
    square_footage: 2450,
    lot_size: 8000,
    year_built: 1998,
    num_units: 1
  },
  valuations: {
    current_value_avm: 425000,
    value_range_low: 410000,
    value_range_high: 440000,
    last_sale_price: 385000,
    last_sale_date: "2022-06-15",
    tax_assessed_value: 380000,
    tax_assessment_year: 2024,
    arv: 465000,
    arv_flip: 450000
  },
  rentals: {
    monthly_rent_ltr: 2100,
    rent_range_low: 1950,
    rent_range_high: 2250,
    average_daily_rate: 250,
    occupancy_rate: 0.82,
    rent_per_sqft: 0.86
  },
  market: {
    market_health_score: 72,
    market_strength: "Strong",
    property_taxes_annual: 4500,
    hoa_fees_monthly: 0
  },
  data_quality: {
    completeness_score: 85.0,
    missing_fields: ["hoa_fees_monthly"],
    stale_fields: [],
    conflict_fields: []
  },
  fetched_at: new Date().toISOString()
}

export async function GET() {
  return NextResponse.json(DEMO_PROPERTY)
}

