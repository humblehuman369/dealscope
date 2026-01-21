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
 * Dynamic route: /property/[zpid]
 * Fetches comprehensive property data from AXESSO API using ZPID.
 */

interface PageProps {
  params: Promise<{ zpid: string }>
}

// Enable static generation for common properties
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

/**
 * Fetch property data from our API route
 */
async function getPropertyData(zpid: string): Promise<PropertyData | null> {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/v1/property/${zpid}`, {
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      console.error(`Failed to fetch property: ${response.status}`)
      return null
    }

    const result = await response.json()
    
    if (!result.success || !result.data) {
      return null
    }

    return result.data as PropertyData
  } catch (error) {
    console.error('Error fetching property:', error)
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
async function PropertyDetailsContent({ zpid }: { zpid: string }) {
  const property = await getPropertyData(zpid)

  if (!property) {
    notFound()
  }

  return <PropertyDetailsClient property={property} />
}

/**
 * Main Page Component
 */
export default async function PropertyDetailsPage({ params }: PageProps) {
  const { zpid } = await params

  return (
    <Suspense fallback={<PropertyDetailsSkeleton />}>
      <PropertyDetailsContent zpid={zpid} />
    </Suspense>
  )
}
