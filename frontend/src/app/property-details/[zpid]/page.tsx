import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import {
  PropertyData,
  PropertyDetailsSkeleton,
  PropertyDetailsClient
} from '@/components/property-details'

/**
 * Property Details Page
 * 
 * Dynamic route: /property-details/[zpid]?address=...
 * Fetches comprehensive property data directly from backend.
 * 
 * NOTE: We call the backend directly instead of going through our own API route
 * to avoid Vercel Deployment Protection blocking server-side fetches.
 */

interface PageProps {
  params: Promise<{ zpid: string }>
  searchParams: Promise<{ address?: string }>
}

// Enable dynamic rendering
export const dynamic = 'force-dynamic'

// Backend URL - same as used in API routes
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

/**
 * Fetch property data directly from backend
 * (Bypasses Next.js API route to avoid Vercel Deployment Protection issues)
 */
async function getPropertyData(zpid: string, address?: string): Promise<PropertyData | null> {
  console.log('[Property Details Page] ========================================')
  console.log('[Property Details Page] Starting data fetch')
  console.log('[Property Details Page] ZPID:', zpid)
  console.log('[Property Details Page] Address:', address)
  console.log('[Property Details Page] Backend URL:', BACKEND_URL)
  
  // Validate inputs
  if (!address) {
    console.error('[Property Details Page] ERROR: No address provided')
    return null
  }
  
  try {
    // Fetch property data and photos directly from backend in parallel
    console.log('[Property Details Page] Fetching from backend...')
    
    const [propertyRes, photosRes] = await Promise.allSettled([
      fetch(`${BACKEND_URL}/api/v1/properties/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
        cache: 'no-store'
      }),
      fetch(`${BACKEND_URL}/api/v1/photos?zpid=${zpid}`, {
        cache: 'no-store'
      })
    ])

    // Process property response
    let propertyData: Record<string, unknown> | null = null
    
    if (propertyRes.status === 'fulfilled') {
      const response = propertyRes.value
      console.log('[Property Details Page] Property fetch status:', response.status)
      
      if (response.ok) {
        try {
          propertyData = await response.json()
          console.log('[Property Details Page] Property data received')
        } catch (parseError) {
          console.error('[Property Details Page] Failed to parse property response:', parseError)
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('[Property Details Page] Backend error:', response.status, errorText)
      }
    } else {
      console.error('[Property Details Page] Property fetch failed:', propertyRes.reason)
    }

    // Process photos response
    let photosData: { photos?: { url?: string }[] } | null = null
    
    if (photosRes.status === 'fulfilled' && photosRes.value.ok) {
      try {
        photosData = await photosRes.value.json()
        console.log('[Property Details Page] Photos received:', photosData?.photos?.length || 0)
      } catch {
        console.log('[Property Details Page] Failed to parse photos')
      }
    }

    if (!propertyData) {
      console.error('[Property Details Page] No property data received')
      return null
    }

    // Normalize the data
    const normalized = normalizePropertyData(propertyData, photosData, zpid)
    console.log('[Property Details Page] Normalized successfully')
    
    return normalized
  } catch (error) {
    console.error('[Property Details Page] Unexpected error:', error)
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
      // HVAC
      heating_type?: string
      cooling_type?: string
      has_heating?: boolean
      has_cooling?: boolean
      // Parking
      has_garage?: boolean
      garage_spaces?: number
      // Construction
      exterior_type?: string
      roof_type?: string
      // Fireplace
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

  // Build heating array
  const heating: string[] = []
  if (p.details?.heating_type) heating.push(p.details.heating_type)
  else if (p.details?.has_heating) heating.push('Yes')

  // Build cooling array  
  const cooling: string[] = []
  if (p.details?.cooling_type) cooling.push(p.details.cooling_type)
  else if (p.details?.has_cooling) cooling.push('Central')

  // Build parking info
  const parking: string[] = []
  if (p.details?.garage_spaces) {
    parking.push(`${p.details.garage_spaces} Car Garage`)
  } else if (p.details?.has_garage) {
    parking.push('Garage')
  }

  // Build exterior features
  const exteriorFeatures: string[] = []
  if (p.details?.exterior_type) exteriorFeatures.push(p.details.exterior_type)
  
  // Build construction info
  const construction: string[] = []
  if (p.details?.exterior_type) construction.push(p.details.exterior_type)

  // Build interior features
  const interiorFeatures: string[] = [...(p.details?.features || [])]
  if (p.details?.has_fireplace) interiorFeatures.push('Fireplace')

  return {
    zpid: p.zpid || zpid,
    address: { streetAddress, city, state, zipcode },
    price,
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
    // Features
    heating,
    cooling,
    parking,
    parkingSpaces: p.details?.garage_spaces,
    interiorFeatures,
    exteriorFeatures,
    construction,
    roof: p.details?.roof_type,
    flooring: [],
    appliances: [],
    priceHistory: [],
    taxHistory: [],
    schools: []
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps) {
  const { zpid } = await params
  
  // We could fetch property data here for dynamic metadata,
  // but to avoid double fetching, we'll use a generic title
  return {
    title: `Property Details - ${zpid} | InvestIQ`,
    description: 'View comprehensive property details, features, price history, and nearby schools.',
  }
}

/**
 * Property Details Content Component
 * Separated to enable Suspense boundary
 */
async function PropertyDetailsContent({ zpid, address }: { zpid: string; address?: string }) {
  const property = await getPropertyData(zpid, address)

  if (!property) {
    notFound()
  }

  return <PropertyDetailsClient property={property} />
}

/**
 * Main Page Component
 */
export default async function PropertyDetailsPage({ params, searchParams }: PageProps) {
  const { zpid } = await params
  const { address } = await searchParams

  return (
    <Suspense fallback={<PropertyDetailsSkeleton />}>
      <PropertyDetailsContent zpid={zpid} address={address} />
    </Suspense>
  )
}
