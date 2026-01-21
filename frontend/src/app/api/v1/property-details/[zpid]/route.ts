import { NextRequest, NextResponse } from 'next/server'

/**
 * Property Details API Route
 * 
 * Fetches comprehensive property data by proxying to the backend.
 * Uses address for property search and zpid for photos.
 * 
 * GET /api/v1/property-details/[zpid]?address=...
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

interface RouteContext {
  params: Promise<{ zpid: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { zpid } = await context.params
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  console.log('[Property Details API] Request - zpid:', zpid, 'address:', address)

  if (!zpid) {
    return NextResponse.json(
      { success: false, error: 'ZPID is required' },
      { status: 400 }
    )
  }

  try {
    // Fetch property data and photos in parallel
    const [propertyRes, photosRes] = await Promise.allSettled([
      // Fetch property data via backend search endpoint (if address available)
      address ? fetch(`${BACKEND_URL}/api/v1/properties/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      }) : Promise.resolve(null),
      // Fetch photos via backend photos endpoint
      fetch(`${BACKEND_URL}/api/v1/photos?zpid=${zpid}`),
    ])

    // Process property data
    let propertyData: Record<string, unknown> | null = null
    if (propertyRes.status === 'fulfilled' && propertyRes.value && 'ok' in propertyRes.value && propertyRes.value.ok) {
      propertyData = await propertyRes.value.json()
      console.log('[Property Details API] Property data received')
    } else {
      console.log('[Property Details API] Failed to fetch property data')
    }

    // Process photos
    let photosData: { photos?: { url?: string }[] } | null = null
    if (photosRes.status === 'fulfilled' && photosRes.value.ok) {
      photosData = await photosRes.value.json()
      console.log('[Property Details API] Photos received:', photosData?.photos?.length || 0)
    }

    if (!propertyData) {
      // If no property data from search, return error
      return NextResponse.json(
        { success: false, error: 'Property not found. Please provide a valid address.' },
        { status: 404 }
      )
    }

    // Normalize the property data
    const normalizedProperty = normalizePropertyData(propertyData, photosData, zpid)

    return NextResponse.json({
      success: true,
      data: normalizedProperty
    })

  } catch (error) {
    console.error('[Property Details API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch property data' },
      { status: 500 }
    )
  }
}

/**
 * Normalize backend API response into PropertyData format
 */
function normalizePropertyData(
  property: Record<string, unknown>,
  photos: { photos?: { url?: string }[] } | null,
  zpid: string
) {
  // Type the property data
  const p = property as {
    zpid?: string | number
    address?: {
      street?: string
      city?: string
      state?: string
      zip_code?: string
    }
    details?: {
      bedrooms?: number
      bathrooms?: number
      square_footage?: number
      year_built?: number
      property_type?: string
      lot_size?: number
      stories?: number
    }
    valuations?: {
      current_value_avm?: number
      zestimate?: number
      rent_zestimate?: number
      tax_assessed_value?: number
      arv?: number
    }
    rentals?: {
      monthly_rent_ltr?: number
      average_rent?: number
      average_daily_rate?: number
      occupancy_rate?: number
    }
    market?: {
      property_taxes_annual?: number
      hoa_fee?: number
    }
    features?: {
      heating?: string[]
      cooling?: string[]
      parking?: string[]
      flooring?: string[]
      appliances?: string[]
      interior?: string[]
      exterior?: string[]
      construction?: string[]
      roof?: string
      foundation?: string
      waterfront?: boolean
      waterfront_features?: string[]
    }
    description?: string
    listing_agent?: {
      name?: string
      phone?: string
      brokerage?: string
    }
    mls_id?: string
    list_date?: string
  }

  // Extract photos
  let images: string[] = []
  if (photos?.photos && Array.isArray(photos.photos)) {
    images = photos.photos
      .map(photo => photo.url)
      .filter((url): url is string => !!url)
  }

  // Fallback photos
  if (images.length === 0) {
    images = getPlaceholderImages()
  }

  const streetAddress = p.address?.street || ''
  const city = p.address?.city || ''
  const state = p.address?.state || ''
  const zipcode = p.address?.zip_code || ''
  const price = p.valuations?.current_value_avm || p.valuations?.zestimate || 0
  const livingArea = p.details?.square_footage || 0

  return {
    zpid: p.zpid || zpid,
    address: {
      streetAddress,
      city,
      state,
      zipcode,
    },
    price,
    listingStatus: 'FOR_SALE',
    daysOnZillow: undefined,
    views: undefined,
    saves: undefined,
    bedrooms: p.details?.bedrooms || 0,
    bathrooms: p.details?.bathrooms || 0,
    livingArea,
    lotSize: p.details?.lot_size,
    lotSizeAcres: p.details?.lot_size ? Math.round(p.details.lot_size / 43560 * 100) / 100 : undefined,
    yearBuilt: p.details?.year_built || 0,
    propertyType: p.details?.property_type || 'SINGLE_FAMILY',
    stories: p.details?.stories,
    zestimate: p.valuations?.zestimate,
    rentZestimate: p.valuations?.rent_zestimate || p.rentals?.monthly_rent_ltr,
    pricePerSqft: livingArea ? Math.round(price / livingArea) : undefined,
    annualTax: p.market?.property_taxes_annual,
    taxAssessedValue: p.valuations?.tax_assessed_value,
    taxYear: new Date().getFullYear(),
    hoaFee: p.market?.hoa_fee,
    hoaFrequency: 'monthly',
    heating: p.features?.heating || [],
    cooling: p.features?.cooling || [],
    parking: p.features?.parking || [],
    parkingSpaces: p.features?.parking?.length,
    flooring: p.features?.flooring || [],
    appliances: p.features?.appliances || [],
    interiorFeatures: p.features?.interior || [],
    exteriorFeatures: p.features?.exterior || [],
    construction: p.features?.construction || [],
    roof: p.features?.roof,
    foundation: p.features?.foundation,
    isWaterfront: p.features?.waterfront,
    waterfrontFeatures: p.features?.waterfront_features,
    latitude: undefined,
    longitude: undefined,
    description: p.description || '',
    images,
    totalPhotos: images.length,
    listingAgent: p.listing_agent,
    mlsId: p.mls_id,
    listDate: p.list_date,
    priceHistory: [],
    taxHistory: [],
    schools: []
  }
}

function getPlaceholderImages(): string[] {
  return [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=600&fit=crop',
  ]
}
