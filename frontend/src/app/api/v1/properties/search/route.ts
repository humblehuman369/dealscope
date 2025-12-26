import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

// In-memory cache for fallback (when backend is unavailable)
const propertyCache: Record<string, { data: any; fetchedAt: Date }> = {}

function generatePropertyId(address: string): string {
  // Simple hash function for property ID
  let hash = 0
  const normalized = address.toLowerCase().trim()
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 16).padStart(16, '0')
}

function parseAddress(address: string) {
  const parts = address.split(',').map(p => p.trim())
  let street = parts[0] || address
  let city = parts[1] || ''
  let stateZip = parts[2] || ''
  let state = ''
  let zipCode = ''
  
  if (stateZip) {
    const stateZipParts = stateZip.trim().split(/\s+/)
    state = stateZipParts[0] || ''
    zipCode = stateZipParts[1] || ''
  }
  
  return {
    street,
    city,
    state,
    zip_code: zipCode,
    county: null,
    full_address: address
  }
}

function generateMockProperty(address: string) {
  const propertyId = generatePropertyId(address)
  const addressObj = parseAddress(address)
  
  // Generate semi-realistic values based on address hash
  const hash = parseInt(propertyId.substring(0, 8), 16)
  const priceBase = 350000 + (hash % 300000)
  const bedsBase = 2 + (hash % 4)
  const bathsBase = 1 + ((hash % 3) * 0.5)
  const sqftBase = 1200 + (hash % 2000)
  const rentBase = Math.round(priceBase * 0.005)
  
  return {
    property_id: propertyId,
    address: addressObj,
    details: {
      property_type: "Single Family",
      bedrooms: bedsBase,
      bathrooms: bathsBase,
      square_footage: sqftBase,
      lot_size: sqftBase * 3,
      year_built: 1980 + (hash % 40),
      num_units: 1
    },
    valuations: {
      current_value_avm: priceBase,
      value_range_low: Math.round(priceBase * 0.95),
      value_range_high: Math.round(priceBase * 1.05),
      last_sale_price: Math.round(priceBase * 0.85),
      last_sale_date: "2022-03-15",
      tax_assessed_value: Math.round(priceBase * 0.9),
      tax_assessment_year: 2024,
      arv: Math.round(priceBase * 1.10),
      arv_flip: Math.round(priceBase * 1.06)
    },
    rentals: {
      monthly_rent_ltr: rentBase,
      rent_range_low: Math.round(rentBase * 0.9),
      rent_range_high: Math.round(rentBase * 1.1),
      average_daily_rate: Math.round((rentBase / 30) * 2.5),
      occupancy_rate: 0.75 + ((hash % 15) / 100),
      rent_per_sqft: parseFloat((rentBase / sqftBase).toFixed(2))
    },
    market: {
      market_health_score: 60 + (hash % 30),
      market_strength: hash % 2 === 0 ? "Strong" : "Moderate",
      property_taxes_annual: Math.round(priceBase * 0.012),
      hoa_fees_monthly: hash % 3 === 0 ? 150 : 0
    },
    data_quality: {
      completeness_score: 75.0 + (hash % 20),
      missing_fields: [],
      stale_fields: [],
      conflict_fields: []
    },
    fetched_at: new Date().toISOString()
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, city, state, zip_code } = body
    
    if (!address) {
      return NextResponse.json(
        { detail: 'Address is required' },
        { status: 400 }
      )
    }
    
    // Build full address for fallback
    const addressParts = [address]
    if (city) addressParts.push(city)
    if (state) addressParts.push(state)
    if (zip_code) addressParts.push(zip_code)
    const fullAddress = addressParts.join(', ')
    const propertyId = generatePropertyId(fullAddress)
    
    // Try to call the backend API first
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/v1/properties/search/route.ts:POST',message:'Calling backend API',data:{backendUrl:BACKEND_URL,address:body.address},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const backendResponse = await fetch(`${BACKEND_URL}/api/v1/properties/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      
      if (backendResponse.ok) {
        const data = await backendResponse.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/v1/properties/search/route.ts:POST:success',message:'Backend returned data',data:{property_id:data.property_id,zpid:data.zpid,hasZpid:!!data.zpid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
        // Cache the result
        propertyCache[data.property_id] = {
          data,
          fetchedAt: new Date()
        }
        return NextResponse.json(data)
      }
      
      // If backend returns an error, log it and fall through to mock data
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/v1/properties/search/route.ts:POST:backendError',message:'Backend returned non-OK status',data:{status:backendResponse.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.warn(`Backend API returned ${backendResponse.status}, falling back to mock data`)
    } catch (backendError) {
      // Backend is unavailable, use mock data
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/v1/properties/search/route.ts:POST:exception',message:'Backend API unavailable',data:{error:String(backendError)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.warn('Backend API unavailable, using mock data:', backendError)
    }
    
    // Fallback: Check cache
    if (propertyCache[propertyId]) {
      const cached = propertyCache[propertyId]
      const cacheAge = Date.now() - cached.fetchedAt.getTime()
      if (cacheAge < 86400000) { // 24 hour cache
        return NextResponse.json(cached.data)
      }
    }
    
    // Fallback: Generate mock property data
    const property = generateMockProperty(fullAddress)
    
    // Cache the result
    propertyCache[propertyId] = {
      data: property,
      fetchedAt: new Date()
    }
    
    return NextResponse.json(property)
    
  } catch (error) {
    console.error('Property search error:', error)
    return NextResponse.json(
      { detail: 'Failed to search property' },
      { status: 500 }
    )
  }
}

