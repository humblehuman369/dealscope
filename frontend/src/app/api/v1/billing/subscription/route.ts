import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// GET /api/v1/billing/subscription - Get current subscription
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/billing/subscription`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Billing Subscription GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch subscription' }, { status: 500 })
  }
}
