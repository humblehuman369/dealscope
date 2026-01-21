import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// Axesso API configuration - use server-side env var (no NEXT_PUBLIC_ prefix)
const AXESSO_BASE_URL = 'https://api.axesso.de'
const AXESSO_API_KEY = process.env.AXESSO_API_KEY || process.env.NEXT_PUBLIC_AXESSO_API_KEY || ''

/**
 * GET /api/v1/axesso/market-data
 * Proxies requests to Axesso /zil/market-data endpoint
 * 
 * Query params:
 * - location: City, State format (e.g., "Delray Beach, FL")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Build Axesso URL with query params
    const axessoUrl = new URL(`${AXESSO_BASE_URL}/zil/market-data`)
    
    // Forward location param
    const location = searchParams.get('location')
    
    if (location) axessoUrl.searchParams.append('location', location)

    console.log('[Axesso Market Data] Fetching:', axessoUrl.toString())
    console.log('[Axesso Market Data] API Key present:', !!AXESSO_API_KEY)

    if (!AXESSO_API_KEY) {
      console.error('[Axesso Market Data] No API key configured')
      return NextResponse.json(
        { error: 'Axesso API key not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(axessoUrl.toString(), {
      method: 'GET',
      headers: {
        'axesso-api-key': AXESSO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    console.log('[Axesso Market Data] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Axesso Market Data] Error:', response.status, errorText)
      return NextResponse.json(
        { error: `Axesso API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[Axesso Market Data] Success')
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Axesso Market Data] Exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    )
  }
}
