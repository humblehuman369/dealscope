import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import {
  PropertyData,
  PropertyDetailsSkeleton,
  PropertyDetailsClient
} from '@/components/property-details'

/**
 * Property Details Page Route
 * Route: /property-details?address=...
 * 
 * Displays detailed property information with image gallery,
 * property facts, features, and bottom action bar.
 * 
 * Uses responsive desktop layout via PropertyDetailsClient.
 */

interface PageProps {
  searchParams: Promise<{ address?: string; strategy?: string; zpid?: string }>
}

// Enable dynamic rendering
export const dynamic = 'force-dynamic'

// Backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'
const VERIFIED_BACKEND_URL = BACKEND_URL.includes('vercel.app') 
  ? 'https://dealscope-production.up.railway.app'
  : BACKEND_URL

/**
 * Fetch property data from backend
 */
async function getPropertyData(address: string, zpid?: string): Promise<PropertyData | null> {
  if (!address) {
    return null
  }
  
  try {
    // Fetch property data
    const propertyRes = await fetch(`${VERIFIED_BACKEND_URL}/api/v1/properties/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
      cache: 'no-store'
    })

    if (!propertyRes.ok) {
      console.error('[Property Details] Backend error:', propertyRes.status)
      return null
    }

    const propertyData = await propertyRes.json()
    
    // Get zpid from response or param
    const propertyZpid = zpid || propertyData?.zpid?.toString() || '0'
    
    // Fetch photos if we have a zpid
    let photosData: { photos?: { url?: string }[] } | null = null
    if (propertyZpid && propertyZpid !== '0') {
      try {
        const photosRes = await fetch(`${VERIFIED_BACKEND_URL}/api/v1/photos?zpid=${propertyZpid}`, {
          cache: 'no-store'
        })
        if (photosRes.ok) {
          photosData = await photosRes.json()
        }
      } catch {
        console.log('[Property Details] Failed to fetch photos')
      }
    }

    return normalizePropertyData(propertyData, photosData, propertyZpid)
  } catch (error) {
    console.error('[Property Details] Unexpected error:', error)
    return null
  }
}

/**
 * Normalize backend response to frontend PropertyData format
 */
function normalizePropertyData(
  property: Record<string, unknown>,
  photos: { photos?: { url?: string }[] } | null,
  zpid: string
): PropertyData {
  const p = property as {
    zpid?: string | number
    address?: {
      street?: string
      city?: string
      state?: string
      zip_code?: string
    }
    details?: {
      property_type?: string
      bedrooms?: number
      bathrooms?: number
      square_footage?: number
      lot_size?: number
      year_built?: number
      features?: string[]
      stories?: number
      heating_type?: string
      cooling_type?: string
      has_heating?: boolean
      has_cooling?: boolean
      has_garage?: boolean
      garage_spaces?: number
      exterior_type?: string
      roof_type?: string
      view_type?: string
      has_pool?: boolean
      has_fireplace?: boolean
    }
    valuations?: {
      current_value_avm?: number
      zestimate?: number
      rent_zestimate?: number
      tax_assessed_value?: number
      price_per_sqft?: number
    }
    rentals?: {
      monthly_rent_ltr?: number
    }
    market?: {
      property_taxes_annual?: number
      hoa_fees_monthly?: number
    }
    listing?: {
      listing_status?: string
      is_off_market?: boolean
      seller_type?: string
      is_foreclosure?: boolean
      is_bank_owned?: boolean
      is_fsbo?: boolean
      is_auction?: boolean
      list_price?: number
      days_on_market?: number
      time_on_market?: string
      last_sold_price?: number
      date_sold?: string
      brokerage_name?: string
      listing_agent_name?: string
      mls_id?: string
    }
    description?: string
  }

  // Extract photos
  let images: string[] = []
  if (photos?.photos && Array.isArray(photos.photos)) {
    images = photos.photos
      .map(photo => photo.url)
      .filter((url): url is string => !!url)
  }
  if (images.length === 0) {
    images = [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
    ]
  }

  const streetAddress = p.address?.street || ''
  const city = p.address?.city || ''
  const state = p.address?.state || ''
  const zipcode = p.address?.zip_code || ''
  const price = p.valuations?.current_value_avm || p.valuations?.zestimate || 0
  const livingArea = p.details?.square_footage || 0

  // Build feature arrays
  const heating: string[] = []
  if (p.details?.heating_type) heating.push(p.details.heating_type)
  else if (p.details?.has_heating) heating.push('Forced Air')

  const cooling: string[] = []
  if (p.details?.cooling_type) cooling.push(p.details.cooling_type)
  else if (p.details?.has_cooling) cooling.push('Central A/C')

  const parking: string[] = []
  if (p.details?.garage_spaces) {
    parking.push(`${p.details.garage_spaces} Car Garage`)
  } else if (p.details?.has_garage) {
    parking.push('Attached Garage')
  }

  const interiorFeatures: string[] = [...(p.details?.features || [])]
  if (p.details?.has_fireplace) interiorFeatures.push('Fireplace')
  if (p.details?.heating_type) interiorFeatures.push(`${p.details.heating_type} Heating`)
  if (p.details?.cooling_type) interiorFeatures.push(`${p.details.cooling_type} Cooling`)
  if (p.details?.stories && p.details.stories > 1) interiorFeatures.push(`${p.details.stories} Stories`)
  if (livingArea > 2000) interiorFeatures.push('Open Floor Plan')
  if (p.details?.bathrooms && p.details.bathrooms >= 3) interiorFeatures.push('Multiple Bathrooms')

  const exteriorFeatures: string[] = []
  if (p.details?.exterior_type) exteriorFeatures.push(`${p.details.exterior_type} Exterior`)
  if (p.details?.roof_type) exteriorFeatures.push(`${p.details.roof_type} Roof`)
  if (p.details?.has_garage) exteriorFeatures.push('Garage')
  if (p.details?.has_pool) exteriorFeatures.push('Swimming Pool')
  if (p.details?.view_type) exteriorFeatures.push(`${p.details.view_type} View`)
  if (p.details?.lot_size && p.details.lot_size > 10000) exteriorFeatures.push('Large Lot')

  const construction: string[] = []
  if (p.details?.exterior_type) construction.push(p.details.exterior_type)
  if (p.details?.year_built) construction.push(`Built ${p.details.year_built}`)

  const appliances: string[] = []
  if (p.details?.has_cooling) appliances.push('Central Air')
  if (p.details?.has_heating) appliances.push('Furnace')
  appliances.push('Dishwasher', 'Range/Oven', 'Refrigerator')

  const listingStatus = (p.listing?.listing_status || 'OFF_MARKET') as 'FOR_SALE' | 'FOR_RENT' | 'SOLD' | 'PENDING' | 'OFF_MARKET'
  const isOffMarket = p.listing?.is_off_market ?? (listingStatus === 'OFF_MARKET' || listingStatus === 'SOLD')
  const displayPrice = p.listing?.list_price || price

  return {
    zpid: p.zpid || zpid,
    address: { streetAddress, city, state, zipcode },
    price: displayPrice,
    listingStatus,
    isOffMarket,
    sellerType: p.listing?.seller_type as 'Agent' | 'FSBO' | 'Foreclosure' | 'BankOwned' | 'Auction' | 'NewConstruction' | 'Unknown' | undefined,
    isForeclosure: p.listing?.is_foreclosure,
    isBankOwned: p.listing?.is_bank_owned,
    isFsbo: p.listing?.is_fsbo,
    isAuction: p.listing?.is_auction,
    daysOnMarket: p.listing?.days_on_market,
    timeOnMarket: p.listing?.time_on_market,
    brokerageName: p.listing?.brokerage_name,
    listingAgentName: p.listing?.listing_agent_name,
    mlsId: p.listing?.mls_id,
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
    hoaFee: p.market?.hoa_fees_monthly,
    description: p.description || `${p.details?.bedrooms || 0} bed, ${p.details?.bathrooms || 0} bath property in ${city}, ${state}.`,
    images,
    totalPhotos: images.length,
    heating,
    cooling,
    parking,
    parkingSpaces: p.details?.garage_spaces,
    interiorFeatures,
    exteriorFeatures,
    construction,
    roof: p.details?.roof_type,
    flooring: [],
    appliances,
    priceHistory: [],
    taxHistory: [],
    schools: []
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ searchParams }: PageProps) {
  const { address } = await searchParams
  
  return {
    title: address ? `${address} - Property Details | InvestIQ` : 'Property Details | InvestIQ',
    description: 'View comprehensive property details, features, price history, and nearby schools.',
  }
}

/**
 * Property Details Content Component
 */
async function PropertyDetailsContent({ address, strategy, zpid }: { address?: string; strategy?: string; zpid?: string }) {
  if (!address) {
    notFound()
  }

  const property = await getPropertyData(address, zpid)

  if (!property) {
    notFound()
  }

  return <PropertyDetailsClient property={property} initialStrategy={strategy} />
}

/**
 * Main Page Component
 */
export default async function PropertyDetailsRoute({ searchParams }: PageProps) {
  const { address, strategy, zpid } = await searchParams

  return (
    <Suspense fallback={<PropertyDetailsSkeleton />}>
      <PropertyDetailsContent address={address} strategy={strategy} zpid={zpid} />
    </Suspense>
  )
}
