import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// Backend URL - proxy requests through backend which has the Axesso API key
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

/**
 * GET /api/v1/axesso/market-data
 * Proxies requests to backend /api/v1/market-data endpoint
 * which then calls Axesso API with the API key
 * 
 * Query params:
 * - location: City, State format (e.g., "Delray Beach, FL")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')

    if (!location) {
      return NextResponse.json(
        { error: 'Location parameter is required' },
        { status: 400 }
      )
    }

    // Build backend URL with query params
    const backendUrl = new URL(`${BACKEND_URL}/api/v1/market-data`)
    backendUrl.searchParams.append('location', location)

    console.log('[Market Data Proxy] Fetching from backend:', backendUrl.toString())

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })

    console.log('[Market Data Proxy] Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Market Data Proxy] Backend error:', response.status, errorText)
      
      // Try to parse as JSON for better error message
      try {
        const errorJson = JSON.parse(errorText)
        return NextResponse.json(
          { error: errorJson.detail || `Backend error: ${response.status}` },
          { status: response.status }
        )
      } catch {
        return NextResponse.json(
          { error: `Backend error: ${response.status}`, details: errorText },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    console.log('[Market Data Proxy] Success - received market data')
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Market Data Proxy] Exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market data from backend' },
      { status: 500 }
    )
  }
}
