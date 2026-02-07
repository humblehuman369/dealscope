import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// GET /api/v1/billing/plans - Get available plans
export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/billing/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Billing Plans GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch plans' }, { status: 500 })
  }
}
