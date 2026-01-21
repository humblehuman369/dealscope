import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// GET /api/v1/billing/usage - Get usage data
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/billing/usage`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Billing Usage GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch usage' }, { status: 500 })
  }
}
