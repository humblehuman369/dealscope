import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/axesso/similar-rent
 * Proxies requests to backend /api/v1/similar-rent endpoint
 * which then calls Axesso API with the API key
 * 
 * Query params:
 * - zpid: Zillow Property ID
 * - url: Zillow property URL
 * - address: Property address
 * - limit: Number of comps to return (default 10)
 * - offset: Number of comps to skip for pagination
 * - exclude_zpids: Comma-separated zpids to exclude from results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Forward all query params
    const zpid = searchParams.get('zpid')
    const url = searchParams.get('url')
    const address = searchParams.get('address')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const excludeZpids = searchParams.get('exclude_zpids')
    
    if (!zpid && !url && !address) {
      return NextResponse.json(
        { error: 'At least one of zpid, url, or address is required', results: [] },
        { status: 400 }
      )
    }

    // Build backend URL with query params
    const backendUrl = new URL(`${BACKEND_URL}/api/v1/similar-rent`)
    if (zpid) backendUrl.searchParams.append('zpid', zpid)
    if (url) backendUrl.searchParams.append('url', url)
    if (address) backendUrl.searchParams.append('address', address)
    if (limit) backendUrl.searchParams.append('limit', limit)
    if (offset) backendUrl.searchParams.append('offset', offset)
    if (excludeZpids) backendUrl.searchParams.append('exclude_zpids', excludeZpids)

    console.log('[Similar Rent Proxy] Fetching from backend:', backendUrl.toString())

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })

    console.log('[Similar Rent Proxy] Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Similar Rent Proxy] Backend error:', response.status, errorText)
      
      try {
        const errorJson = JSON.parse(errorText)
        return NextResponse.json(
          { error: errorJson.detail || `Backend error: ${response.status}`, results: [] },
          { status: response.status }
        )
      } catch {
        return NextResponse.json(
          { error: `Backend error: ${response.status}`, results: [] },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Similar Rent Proxy] Exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rental comps from backend', results: [] },
      { status: 500 }
    )
  }
}
