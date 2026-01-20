import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// POST /api/v1/billing/checkout - Create checkout session
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/billing/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Billing Checkout POST] Error:', error)
    return NextResponse.json({ detail: 'Failed to create checkout' }, { status: 500 })
  }
}
