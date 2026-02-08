import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

/**
 * Build headers for proxying to the backend.
 * Forwards Authorization header (Bearer token) AND/OR Cookie header
 * to support both token-based and cookie-based authentication.
 */
function buildProxyHeaders(request: NextRequest, extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  const authHeader = request.headers.get('Authorization')
  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  // Forward cookies for cookie-based auth (httpOnly access_token cookie)
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader
  }

  return headers
}

/**
 * Check if the request has any form of authentication.
 */
function hasAuth(request: NextRequest): boolean {
  return !!(request.headers.get('Authorization') || request.headers.get('Cookie'))
}

// GET /api/v1/properties/saved - List saved properties
export async function GET(request: NextRequest) {
  try {
    if (!hasAuth(request)) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const queryString = url.searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/v1/properties/saved${queryString ? `?${queryString}` : ''}`

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: buildProxyHeaders(request),
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
    if (!hasAuth(request)) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    const backendUrl = `${BACKEND_URL}/api/v1/properties/saved`

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: buildProxyHeaders(request),
      body: JSON.stringify(body),
    })

    // Handle different response types
    const contentType = backendResponse.headers.get('content-type')
    
    if (!backendResponse.ok) {
      let errorDetail: string
      try {
        if (contentType?.includes('application/json')) {
          const errorData = await backendResponse.json()
          errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData)
        } else {
          errorDetail = await backendResponse.text()
        }
      } catch {
        errorDetail = `Backend returned ${backendResponse.status} but response could not be parsed`
      }
      console.error('[Saved Properties POST] Backend error:', backendResponse.status, errorDetail)
      return NextResponse.json(
        { detail: errorDetail || `Backend error: ${backendResponse.status}` }, 
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Properties POST] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ detail: `Failed to save property: ${message}` }, { status: 500 })
  }
}
