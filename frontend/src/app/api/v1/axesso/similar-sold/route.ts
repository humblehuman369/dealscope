import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// Backend URL - proxy requests through backend which has the Axesso API key
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

/**
 * GET /api/v1/axesso/similar-sold
 * Proxies requests to backend /api/v1/similar-sold endpoint
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
    const backendUrl = new URL(`${BACKEND_URL}/api/v1/similar-sold`)
    if (zpid) backendUrl.searchParams.append('zpid', zpid)
    if (url) backendUrl.searchParams.append('url', url)
    if (address) backendUrl.searchParams.append('address', address)
    if (limit) backendUrl.searchParams.append('limit', limit)
    if (offset) backendUrl.searchParams.append('offset', offset)
    if (excludeZpids) backendUrl.searchParams.append('exclude_zpids', excludeZpids)

    console.log('[Similar Sold Proxy] Fetching from backend:', backendUrl.toString())

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })

    console.log('[Similar Sold Proxy] Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Similar Sold Proxy] Backend error:', response.status, errorText)
      
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
    console.log('[Similar Sold Proxy] Success, results:', data.results?.length || 0)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Similar Sold Proxy] Exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sold comps from backend', results: [] },
      { status: 500 }
    )
  }
}
