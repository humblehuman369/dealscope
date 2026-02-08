import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// GET /api/v1/properties/saved/stats - Get saved properties stats
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('Cookie')

    if (!authHeader && !cookieHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authHeader) headers['Authorization'] = authHeader
    if (cookieHeader) headers['Cookie'] = cookieHeader

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/properties/saved/stats`,
      {
        method: 'GET',
        headers,
      }
    )

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Properties Stats] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch stats' }, { status: 500 })
  }
}

