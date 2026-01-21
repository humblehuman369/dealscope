import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// Axesso API configuration - use server-side env var (no NEXT_PUBLIC_ prefix)
const AXESSO_BASE_URL = 'https://api.axesso.de'
const AXESSO_API_KEY = process.env.AXESSO_API_KEY || process.env.NEXT_PUBLIC_AXESSO_API_KEY || ''

/**
 * GET /api/v1/axesso/similar-rent
 * Proxies requests to Axesso /zil/similar-rent endpoint
 * 
 * Query params:
 * - zpid: Zillow Property ID
 * - url: Zillow property URL
 * - address: Property address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Build Axesso URL with query params
    const axessoUrl = new URL(`${AXESSO_BASE_URL}/zil/similar-rent`)
    
    // Forward all query params
    const zpid = searchParams.get('zpid')
    const url = searchParams.get('url')
    const address = searchParams.get('address')
    
    if (zpid) axessoUrl.searchParams.append('zpid', zpid)
    if (url) axessoUrl.searchParams.append('url', url)
    if (address) axessoUrl.searchParams.append('address', address)

    console.log('[Axesso Similar Rent] Fetching:', axessoUrl.toString())
    console.log('[Axesso Similar Rent] API Key present:', !!AXESSO_API_KEY)

    if (!AXESSO_API_KEY) {
      console.error('[Axesso Similar Rent] No API key configured')
      return NextResponse.json(
        { error: 'Axesso API key not configured', results: [] },
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

    console.log('[Axesso Similar Rent] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Axesso Similar Rent] Error:', response.status, errorText)
      return NextResponse.json(
        { error: `Axesso API error: ${response.status}`, details: errorText, results: [] },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[Axesso Similar Rent] Success, results:', data.results?.length || 0)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Axesso Similar Rent] Exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rental comps', results: [] },
      { status: 500 }
    )
  }
}
