import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// GET /api/v1/search-history/recent - Get recent search history
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('Cookie')
    if (!authHeader && !cookieHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const queryString = url.searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/v1/search-history/recent${queryString ? `?${queryString}` : ''}`

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authHeader) headers['Authorization'] = authHeader
    if (cookieHeader) headers['Cookie'] = cookieHeader

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers,
    })

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Search History Recent GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch recent searches' }, { status: 500 })
  }
}
