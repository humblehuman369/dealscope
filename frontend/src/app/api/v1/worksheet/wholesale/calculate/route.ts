import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// POST /api/v1/worksheet/wholesale/calculate - Calculate Wholesale worksheet metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Wholesale Worksheet] Calculating with inputs:', body)

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/worksheet/wholesale/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await backendResponse.json()
    
    if (!backendResponse.ok) {
      console.error('[Wholesale Worksheet] Backend error:', data)
      return NextResponse.json(data, { status: backendResponse.status })
    }

    console.log('[Wholesale Worksheet] Calculation successful')
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('[Wholesale Worksheet] Error:', error)
    return NextResponse.json(
      { detail: 'Failed to calculate worksheet metrics' },
      { status: 500 }
    )
  }
}

