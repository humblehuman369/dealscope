import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

function buildProxyHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authHeader = request.headers.get('Authorization')
  if (authHeader) headers['Authorization'] = authHeader
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) headers['Cookie'] = cookieHeader
  return headers
}

function hasAuth(request: NextRequest): boolean {
  return !!(request.headers.get('Authorization') || request.headers.get('Cookie'))
}

// GET /api/v1/search-history - Get search history
export async function GET(request: NextRequest) {
  try {
    if (!hasAuth(request)) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const queryString = url.searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/v1/search-history${queryString ? `?${queryString}` : ''}`

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: buildProxyHeaders(request),
    })

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Search History GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch search history' }, { status: 500 })
  }
}

// DELETE /api/v1/search-history - Clear all search history
export async function DELETE(request: NextRequest) {
  try {
    if (!hasAuth(request)) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/search-history`, {
      method: 'DELETE',
      headers: buildProxyHeaders(request),
    })

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Search History DELETE] Error:', error)
    return NextResponse.json({ detail: 'Failed to clear search history' }, { status: 500 })
  }
}
