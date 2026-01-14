import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to production Railway URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// POST /api/v1/worksheet/househack/calculate - Calculate House Hack worksheet metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[House Hack Worksheet] Calculating with inputs:', body)

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/worksheet/househack/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await backendResponse.json()
    
    if (!backendResponse.ok) {
      console.error('[House Hack Worksheet] Backend error:', data)
      return NextResponse.json(data, { status: backendResponse.status })
    }

    console.log('[House Hack Worksheet] Calculation successful')
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('[House Hack Worksheet] Error:', error)
    return NextResponse.json(
      { detail: 'Failed to calculate worksheet metrics' },
      { status: 500 }
    )
  }
}

