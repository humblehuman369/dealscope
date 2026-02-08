import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// DELETE /api/v1/search-history/[entryId] - Delete single search entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params
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
      `${BACKEND_URL}/api/v1/search-history/${entryId}`,
      {
        method: 'DELETE',
        headers,
      }
    )

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Search History Entry DELETE] Error:', error)
    return NextResponse.json({ detail: 'Failed to delete search entry' }, { status: 500 })
  }
}
