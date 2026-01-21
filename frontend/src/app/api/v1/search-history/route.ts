import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// Backend API URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// GET /api/v1/search-history - Get search history
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const queryString = url.searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/v1/search-history${queryString ? `?${queryString}` : ''}`

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
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
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/search-history`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
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
