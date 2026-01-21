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
 * Fetches comprehensive property data using ZPID and address.
 */

interface PageProps {
  params: Promise<{ zpid: string }>
  searchParams: Promise<{ address?: string }>
}

// Enable dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Fetch property data from our API route
 */
async function getPropertyData(zpid: string, address?: string): Promise<PropertyData | null> {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = new URL(`${baseUrl}/api/v1/property-details/${zpid}`)
    if (address) {
      url.searchParams.set('address', address)
    }
    
    console.log('[Property Details Page] Fetching:', url.toString())
    
    const response = await fetch(url.toString(), {
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`[Property Details Page] Failed to fetch: ${response.status}`)
      return null
    }

    const result = await response.json()
    
    if (!result.success || !result.data) {
      console.error('[Property Details Page] No data in response')
      return null
    }

    return result.data as PropertyData
  } catch (error) {
    console.error('[Property Details Page] Error:', error)
    return null
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
