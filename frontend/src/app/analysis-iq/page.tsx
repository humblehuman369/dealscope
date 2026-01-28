import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { ResponsiveAnalyticsContainer, PropertyData } from '@/components/analytics/ResponsiveAnalyticsContainer'
import { AnalyticsPageSkeleton } from '@/components/analytics/LoadingStates'
import type { StrategyId } from '@/components/analytics/types'

/**
 * Analysis IQ Page Route
 * Route: /analysis-iq?address=...&strategy=...
 * 
 * Displays strategy analytics with responsive desktop/mobile layout.
 * Uses ResponsiveAnalyticsContainer for proper viewport-based rendering.
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
async function getPropertyData(address: string): Promise<PropertyData | null> {
  if (!address) {
    return null
  }
  
  try {
    const propertyRes = await fetch(`${VERIFIED_BACKEND_URL}/api/v1/properties/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
      cache: 'no-store'
    })

    if (!propertyRes.ok) {
      console.error('[Analysis IQ] Backend error:', propertyRes.status)
      return null
    }

    const data = await propertyRes.json()
    return normalizePropertyData(data)
  } catch (error) {
    console.error('[Analysis IQ] Unexpected error:', error)
    return null
  }
}

/**
 * Normalize backend response to PropertyData format for analytics
 */
function normalizePropertyData(property: Record<string, unknown>): PropertyData {
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
    }
    valuations?: {
      current_value_avm?: number
      zestimate?: number
      rent_zestimate?: number
    }
    rentals?: {
      monthly_rent_ltr?: number
      monthly_rent_str?: number
      average_daily_rate?: number
      occupancy_rate?: number
    }
    market?: {
      property_taxes_annual?: number
    }
    listing?: {
      list_price?: number
    }
    photos?: { url?: string }[]
  }

  const streetAddress = p.address?.street || ''
  const city = p.address?.city || ''
  const state = p.address?.state || ''
  const zipCode = p.address?.zip_code || ''
  const listPrice = p.listing?.list_price || p.valuations?.current_value_avm || p.valuations?.zestimate || 0
  const monthlyRent = p.valuations?.rent_zestimate || p.rentals?.monthly_rent_ltr || listPrice * 0.007
  const sqft = p.details?.square_footage || 0

  // Extract photos
  let photos: string[] = []
  if (p.photos && Array.isArray(p.photos)) {
    photos = p.photos
      .map((photo: { url?: string }) => photo.url)
      .filter((url): url is string => !!url)
  }

  return {
    address: streetAddress,
    city,
    state,
    zipCode,
    listPrice,
    monthlyRent,
    averageDailyRate: p.rentals?.average_daily_rate || 150,
    occupancyRate: p.rentals?.occupancy_rate || 0.70,
    propertyTaxes: p.market?.property_taxes_annual || listPrice * 0.012,
    insurance: 1800, // Default insurance
    bedrooms: p.details?.bedrooms || 0,
    bathrooms: p.details?.bathrooms || 0,
    sqft,
    arv: listPrice * 1.15, // Default ARV estimate
    thumbnailUrl: photos[0],
    photos,
    photoCount: photos.length,
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ searchParams }: PageProps) {
  const { address } = await searchParams
  
  return {
    title: address ? `Analysis IQ - ${address} | InvestIQ` : 'Analysis IQ | InvestIQ',
    description: 'Analyze investment strategies and returns for this property.',
  }
}

/**
 * Analysis IQ Content Component
 */
async function AnalysisIQContent({ 
  address, 
  strategy 
}: { 
  address?: string
  strategy?: string 
}) {
  if (!address) {
    notFound()
  }

  const property = await getPropertyData(address)

  if (!property) {
    notFound()
  }

  // Validate strategy
  const validStrategies: StrategyId[] = ['ltr', 'str', 'brrrr', 'flip', 'househack', 'wholesale']
  const initialStrategy = strategy && validStrategies.includes(strategy as StrategyId) 
    ? strategy as StrategyId 
    : undefined

  return (
    <ResponsiveAnalyticsContainer 
      property={property} 
      initialStrategy={initialStrategy}
    />
  )
}

/**
 * Main Page Component
 */
export default async function AnalysisIQRoute({ searchParams }: PageProps) {
  const { address, strategy } = await searchParams

  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <AnalysisIQContent address={address} strategy={strategy} />
    </Suspense>
  )
}
