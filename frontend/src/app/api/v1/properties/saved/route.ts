import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// Backend API URL - defaults to production Railway URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// GET /api/v1/properties/saved - List saved properties
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.log('[Saved Properties GET] No auth header')
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const queryString = url.searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/v1/properties/saved${queryString ? `?${queryString}` : ''}`

    console.log('[Saved Properties GET] Fetching from:', backendUrl)

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('[Saved Properties GET] Backend error:', backendResponse.status, errorText)
      return NextResponse.json(
        { detail: errorText || `Backend error: ${backendResponse.status}` }, 
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Properties GET] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ detail: `Failed to fetch saved properties: ${message}` }, { status: 500 })
  }
}

// POST /api/v1/properties/saved - Save a new property
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.log('[Saved Properties POST] No auth header')
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    
    console.log('[Saved Properties POST] Request body:', {
      address_street: body.address_street,
      address_city: body.address_city,
      address_state: body.address_state,
      address_zip: body.address_zip,
      full_address: body.full_address,
      status: body.status,
      has_snapshot: !!body.property_data_snapshot,
    })

    const backendUrl = `${BACKEND_URL}/api/v1/properties/saved`
    console.log('[Saved Properties POST] Posting to:', backendUrl)

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    // Handle different response types
    const contentType = backendResponse.headers.get('content-type')
    
    if (!backendResponse.ok) {
      let errorDetail: string
      if (contentType?.includes('application/json')) {
        const errorData = await backendResponse.json()
        errorDetail = errorData.detail || JSON.stringify(errorData)
      } else {
        errorDetail = await backendResponse.text()
      }
      console.error('[Saved Properties POST] Backend error:', backendResponse.status, errorDetail)
      return NextResponse.json(
        { detail: errorDetail }, 
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    console.log('[Saved Properties POST] Success - id:', data.id)
    
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Properties POST] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ detail: `Failed to save property: ${message}` }, { status: 500 })
  }
}
