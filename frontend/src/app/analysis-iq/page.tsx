import { redirect } from 'next/navigation'

/**
 * Analysis IQ Page Route - DEPRECATED
 * 
 * This route now redirects to /verdict which contains the combined analysis functionality.
 * The redirect preserves all query parameters.
 */

interface PageProps {
  searchParams: Promise<{ address?: string; strategy?: string; zpid?: string; propertyId?: string }>
}

// Enable dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ searchParams }: PageProps) {
  const { address } = await searchParams
  
  return {
    title: address ? `Verdict IQ - ${address} | InvestIQ` : 'Verdict IQ | InvestIQ',
    description: 'Analyze investment strategies and returns for this property.',
  }
}

/**
 * Main Page Component - Redirects to /verdict
 */
export default async function AnalysisIQRoute({ searchParams }: PageProps) {
  const params = await searchParams
  
  // Build redirect URL preserving all query params
  const queryParams = new URLSearchParams()
  if (params.address) queryParams.set('address', params.address)
  if (params.strategy) queryParams.set('strategy', params.strategy)
  if (params.zpid) queryParams.set('zpid', params.zpid)
  if (params.propertyId) queryParams.set('propertyId', params.propertyId)
  
  const queryString = queryParams.toString()
  const redirectUrl = `/verdict${queryString ? `?${queryString}` : ''}`
  
  redirect(redirectUrl)
}
