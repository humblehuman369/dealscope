import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

// Demo property data for fallback
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
    arv: 465000,
    arv_flip: 450000
  },
  rentals: {
    monthly_rent_ltr: 2100,
    rent_range_low: 1950,
    rent_range_high: 2250,
    average_daily_rate: 250,
    occupancy_rate: 0.82
  },
  market: {
    property_taxes_annual: 4500,
    hoa_fees_monthly: 0
  },
  data_quality: {
    completeness_score: 85.0,
    missing_fields: [],
    conflict_fields: []
  },
  fetched_at: new Date().toISOString()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params
  
  // Try to call the backend API first
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${propertyId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (backendResponse.ok) {
      const data = await backendResponse.json()
      return NextResponse.json(data)
    }
    
    // If backend returns 404, check for demo property
    if (backendResponse.status === 404 && propertyId === 'demo-fl-12345') {
      return NextResponse.json(DEMO_PROPERTY)
    }
    
    // Return the backend error
    if (backendResponse.status === 404) {
      return NextResponse.json(
        { detail: 'Property not found' },
        { status: 404 }
      )
    }
    
    console.warn(`Backend API returned ${backendResponse.status}`)
  } catch (backendError) {
    console.warn('Backend API unavailable:', backendError)
  }
  
  // Fallback: Demo property check
  if (propertyId === 'demo-fl-12345') {
    return NextResponse.json(DEMO_PROPERTY)
  }
  
  // For other properties, return 404 (they need to be searched first)
  return NextResponse.json(
    { detail: 'Property not found' },
    { status: 404 }
  )
}

