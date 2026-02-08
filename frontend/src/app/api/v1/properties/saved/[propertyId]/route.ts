import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

/**
 * Build headers for proxying to the backend.
 * Forwards Authorization header AND/OR Cookie header for auth.
 */
function buildProxyHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const authHeader = request.headers.get('Authorization')
  if (authHeader) headers['Authorization'] = authHeader

  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) headers['Cookie'] = cookieHeader

  return headers
}

function hasAuth(request: NextRequest): boolean {
  return !!(request.headers.get('Authorization') || request.headers.get('Cookie'))
}

// GET /api/v1/properties/saved/[propertyId] - Get a saved property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params
  try {
    if (!hasAuth(request)) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/properties/saved/${propertyId}`,
      {
        method: 'GET',
        headers: buildProxyHeaders(request),
      }
    )

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Property GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch saved property' }, { status: 500 })
  }
}

// PATCH /api/v1/properties/saved/[propertyId] - Update a saved property
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params
  try {
    if (!hasAuth(request)) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/properties/saved/${propertyId}`,
      {
        method: 'PATCH',
        headers: buildProxyHeaders(request),
        body: JSON.stringify(body),
      }
    )

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Property PATCH] Error:', error)
    return NextResponse.json({ detail: 'Failed to update saved property' }, { status: 500 })
  }
}

// DELETE /api/v1/properties/saved/[propertyId] - Delete a saved property
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params
  try {
    if (!hasAuth(request)) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/properties/saved/${propertyId}`,
      {
        method: 'DELETE',
        headers: buildProxyHeaders(request),
      }
    )

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Property DELETE] Error:', error)
    return NextResponse.json({ detail: 'Failed to delete saved property' }, { status: 500 })
  }
}

