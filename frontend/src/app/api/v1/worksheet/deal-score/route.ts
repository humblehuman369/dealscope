import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

/**
 * POST /api/v1/worksheet/deal-score
 * 
 * Calculates Deal Score using the centralized backend calculation.
 * All worksheets should use this endpoint to ensure consistent scoring.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/worksheet/deal-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await backendResponse.json()
    
    if (!backendResponse.ok) {
      console.error('[Deal Score API] Backend error:', data)
      return NextResponse.json(data, { status: backendResponse.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('[Deal Score API] Error:', error)
    return NextResponse.json(
      { detail: 'Failed to calculate deal score' },
      { status: 500 }
    )
  }
}
