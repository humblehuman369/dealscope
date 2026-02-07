import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

/**
 * Property Details API Route
 * 
 * Fetches comprehensive property data by proxying to the backend.
 * Uses address for property search and zpid for photos.
 * 
 * GET /api/v1/property/[zpid]?address=...
 */

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

  console.log('[Property Details API] ========================================')
  console.log('[Property Details API] Request received')
  console.log('[Property Details API] ZPID:', zpid)
  console.log('[Property Details API] Address:', address)
  console.log('[Property Details API] Backend URL:', BACKEND_URL)

  if (!zpid) {
    console.log('[Property Details API] ERROR: ZPID is required')
    return NextResponse.json(
      { success: false, error: 'ZPID is required' },
      { status: 400 }
    )
  }

  if (!address) {
    console.log('[Property Details API] ERROR: Address is required')
    return NextResponse.json(
      { success: false, error: 'Address is required for property lookup' },
      { status: 400 }
    )
  }

  try {
    // Fetch property data and photos in parallel
    console.log('[Property Details API] Fetching property data and photos in parallel...')
    
    const propertyPromise = fetch(`${BACKEND_URL}/api/v1/properties/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    
    const photosPromise = fetch(`${BACKEND_URL}/api/v1/photos?zpid=${zpid}`)

    const [propertyRes, photosRes] = await Promise.allSettled([propertyPromise, photosPromise])

    // Process property response
    let propertyData: Record<string, unknown> | null = null
    
    if (propertyRes.status === 'fulfilled') {
      const response = propertyRes.value
      console.log('[Property Details API] Property fetch status:', response.status)
      
      if (response.ok) {
        try {
          propertyData = await response.json()
          console.log('[Property Details API] Property data received - property_id:', 
            (propertyData as { property_id?: string })?.property_id,
            'zpid:', (propertyData as { zpid?: string })?.zpid
          )
        } catch (parseError) {
          console.error('[Property Details API] Failed to parse property response:', parseError)
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('[Property Details API] Backend returned error:', response.status, errorText)
      }
    } else {
      console.error('[Property Details API] Property fetch failed:', propertyRes.reason)
    }

    // Process photos response  
    let photosData: { photos?: { url?: string }[]; success?: boolean } | null = null
    
    if (photosRes.status === 'fulfilled') {
      const response = photosRes.value
      console.log('[Property Details API] Photos fetch status:', response.status)
      
      if (response.ok) {
        try {
          photosData = await response.json()
          console.log('[Property Details API] Photos received:', photosData?.photos?.length || 0)
        } catch (parseError) {
          console.error('[Property Details API] Failed to parse photos response:', parseError)
        }
      }
    } else {
      console.error('[Property Details API] Photos fetch failed:', photosRes.reason)
    }

    // Check if we have property data
    if (!propertyData) {
      console.error('[Property Details API] No property data received - returning 404')
      return NextResponse.json(
        { success: false, error: 'Property not found. The backend search returned no data.' },
        { status: 404 }
      )
    }

    // Normalize the property data
    console.log('[Property Details API] Normalizing property data...')
    const normalizedProperty = normalizePropertyData(propertyData, photosData, zpid)
    console.log('[Property Details API] Normalized successfully - address:', 
      normalizedProperty.address?.streetAddress || 'unknown'
    )

    return NextResponse.json({
      success: true,
      data: normalizedProperty
    })

  } catch (error) {
    console.error('[Property Details API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch property data: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

/**
 * Normalize backend API response into PropertyData format
 * 
 * Backend PropertyResponse structure:
 * {
 *   property_id: string
 *   zpid: string | null
 *   address: { street, city, state, zip_code, county, full_address }
 *   details: { property_type, bedrooms, bathrooms, square_footage, lot_size, year_built, num_units, features }
 *   valuations: { current_value_avm, zestimate, rent_zestimate, tax_assessed_value, arv, ... }
 *   rentals: { monthly_rent_ltr, average_rent, average_daily_rate, occupancy_rate, ... }
 *   market: { property_taxes_annual, hoa_fees_monthly, ... }
 *   provenance: { ... }
 *   data_quality: { ... }
 *   fetched_at: string
 * }
 */
function normalizePropertyData(
  property: Record<string, unknown>,
  photos: { photos?: { url?: string }[]; success?: boolean } | null,
  zpid: string
) {
  // Type the backend PropertyResponse
  const p = property as {
    property_id?: string
    zpid?: string | number
    address?: {
      street?: string
      city?: string
      state?: string
      zip_code?: string
      county?: string
      full_address?: string
    }
    details?: {
      property_type?: string
      bedrooms?: number
      bathrooms?: number
      square_footage?: number
      lot_size?: number
      year_built?: number
      num_units?: number
      features?: string[]
      stories?: number
    }
    valuations?: {
      current_value_avm?: number
      zestimate?: number
      rent_zestimate?: number
      tax_assessed_value?: number
      tax_assessment_year?: number
      arv?: number
      last_sale_price?: number
      last_sale_date?: string
      price_per_sqft?: number
    }
    rentals?: {
      monthly_rent_ltr?: number
      average_rent?: number
      average_daily_rate?: number
      occupancy_rate?: number
      rental_stats?: {
        rentcast_estimate?: number
        zillow_estimate?: number
        iq_estimate?: number
        estimate_low?: number
        estimate_high?: number
        market_avg_rent?: number
        market_median_rent?: number
        market_min_rent?: number
        market_max_rent?: number
        market_rent_per_sqft?: number
        rental_days_on_market?: number
        rental_total_listings?: number
        rental_new_listings?: number
        rent_trend?: string
        trend_pct_change?: number
      }
    }
    market?: {
      property_taxes_annual?: number
      hoa_fees_monthly?: number
      market_stats?: {
        median_days_on_market?: number
        avg_days_on_market?: number
        min_days_on_market?: number
        max_days_on_market?: number
        total_listings?: number
        new_listings?: number
        absorption_rate?: number
        market_temperature?: string
        median_price?: number
        avg_price_per_sqft?: number
      }
    }
    listing?: {
      listing_status?: string
      is_off_market?: boolean
      seller_type?: string
      is_foreclosure?: boolean
      is_bank_owned?: boolean
      is_fsbo?: boolean
      is_auction?: boolean
      is_new_construction?: boolean
      list_price?: number
      days_on_market?: number
      time_on_market?: string
      last_sold_price?: number
      date_sold?: string
      brokerage_name?: string
      listing_agent_name?: string
      mls_id?: string
    }
    fetched_at?: string
    // Legacy fields that might exist
    description?: string
    listing_agent?: {
      name?: string
      phone?: string
      brokerage?: string
    }
    mls_id?: string
    list_date?: string
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
  }

  // Extract photos
  let images: string[] = []
  if (photos?.photos && Array.isArray(photos.photos)) {
    images = photos.photos
      .map(photo => photo.url)
      .filter((url): url is string => !!url)
  }

  // Fallback photos if none found
  if (images.length === 0) {
    images = getPlaceholderImages()
  }

  // Extract address components
  const streetAddress = p.address?.street || ''
  const city = p.address?.city || ''
  const state = p.address?.state || ''
  const zipcode = p.address?.zip_code || ''
  
  // Get price - prefer list_price if actively listed, otherwise use Zestimate
  const listing = p.listing || {}
  const isOffMarket = listing.is_off_market ?? true
  const listPrice = listing.list_price
  
  // If actively listed, use list price; otherwise use estimated value
  const price = (!isOffMarket && listPrice) 
    ? listPrice 
    : (p.valuations?.current_value_avm || p.valuations?.zestimate || 0)
  
  const livingArea = p.details?.square_footage || 0
  
  // Determine listing status - default to OFF_MARKET if not provided
  const listingStatus = listing.listing_status || (isOffMarket ? 'OFF_MARKET' : 'FOR_SALE')

  // Build normalized property object matching frontend PropertyData interface
  return {
    zpid: p.zpid || zpid,
    address: {
      streetAddress,
      city,
      state,
      zipcode,
    },
    price,
    
    // Listing status fields
    listingStatus: listingStatus as 'FOR_SALE' | 'FOR_RENT' | 'OFF_MARKET' | 'SOLD' | 'PENDING' | 'OTHER',
    isOffMarket,
    sellerType: listing.seller_type as 'Agent' | 'FSBO' | 'Foreclosure' | 'BankOwned' | 'Auction' | 'NewConstruction' | 'Unknown' | undefined,
    listPrice,
    isForeclosure: listing.is_foreclosure,
    isBankOwned: listing.is_bank_owned,
    isFsbo: listing.is_fsbo,
    isAuction: listing.is_auction,
    isNewConstruction: listing.is_new_construction,
    daysOnMarket: listing.days_on_market,
    timeOnMarket: listing.time_on_market,
    dateSold: listing.date_sold,
    lastSoldPrice: listing.last_sold_price,
    brokerageName: listing.brokerage_name,
    listingAgentName: listing.listing_agent_name,
    
    // Legacy fields
    daysOnZillow: listing.days_on_market,
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
    pricePerSqft: p.valuations?.price_per_sqft || (livingArea ? Math.round(price / livingArea) : undefined),
    annualTax: p.market?.property_taxes_annual,
    taxAssessedValue: p.valuations?.tax_assessed_value,
    taxYear: p.valuations?.tax_assessment_year || new Date().getFullYear(),
    hoaFee: p.market?.hoa_fees_monthly,
    hoaFrequency: 'monthly',
    // Feature arrays - from details.features or legacy features object
    heating: p.features?.heating || [],
    cooling: p.features?.cooling || [],
    parking: p.features?.parking || [],
    parkingSpaces: p.features?.parking?.length,
    flooring: p.features?.flooring || [],
    appliances: p.features?.appliances || [],
    interiorFeatures: p.features?.interior || p.details?.features || [],
    exteriorFeatures: p.features?.exterior || [],
    construction: p.features?.construction || [],
    roof: p.features?.roof,
    foundation: p.features?.foundation,
    isWaterfront: p.features?.waterfront,
    waterfrontFeatures: p.features?.waterfront_features,
    latitude: undefined,
    longitude: undefined,
    description: p.description || `${p.details?.bedrooms || 0} bed, ${p.details?.bathrooms || 0} bath property in ${city}, ${state}.`,
    images,
    totalPhotos: images.length,
    listingAgent: p.listing_agent || (listing.listing_agent_name ? { name: listing.listing_agent_name, brokerage: listing.brokerage_name } : undefined),
    mlsId: listing.mls_id || p.mls_id,
    listDate: p.list_date,
    priceHistory: [],
    taxHistory: [],
    schools: [],
    
    // Market Statistics for buyer/seller market analysis
    marketStats: p.market?.market_stats ? {
      medianDaysOnMarket: p.market.market_stats.median_days_on_market,
      avgDaysOnMarket: p.market.market_stats.avg_days_on_market,
      minDaysOnMarket: p.market.market_stats.min_days_on_market,
      maxDaysOnMarket: p.market.market_stats.max_days_on_market,
      totalListings: p.market.market_stats.total_listings,
      newListings: p.market.market_stats.new_listings,
      absorptionRate: p.market.market_stats.absorption_rate,
      marketTemperature: p.market.market_stats.market_temperature as 'hot' | 'warm' | 'cold' | undefined,
      medianPrice: p.market.market_stats.median_price,
      avgPricePerSqft: p.market.market_stats.avg_price_per_sqft,
    } : undefined,
    
    // Rental Market Statistics for rental investment analysis
    rentalStats: p.rentals?.rental_stats ? {
      rentcastEstimate: p.rentals.rental_stats.rentcast_estimate,
      zillowEstimate: p.rentals.rental_stats.zillow_estimate,
      iqEstimate: p.rentals.rental_stats.iq_estimate,
      estimateLow: p.rentals.rental_stats.estimate_low,
      estimateHigh: p.rentals.rental_stats.estimate_high,
      marketAvgRent: p.rentals.rental_stats.market_avg_rent,
      marketMedianRent: p.rentals.rental_stats.market_median_rent,
      marketMinRent: p.rentals.rental_stats.market_min_rent,
      marketMaxRent: p.rentals.rental_stats.market_max_rent,
      marketRentPerSqft: p.rentals.rental_stats.market_rent_per_sqft,
      rentalDaysOnMarket: p.rentals.rental_stats.rental_days_on_market,
      rentalTotalListings: p.rentals.rental_stats.rental_total_listings,
      rentalNewListings: p.rentals.rental_stats.rental_new_listings,
      rentTrend: p.rentals.rental_stats.rent_trend as 'up' | 'down' | 'stable' | undefined,
      trendPctChange: p.rentals.rental_stats.trend_pct_change,
    } : undefined,
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
