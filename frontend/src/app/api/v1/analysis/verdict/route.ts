import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/server-env'

// POST /api/v1/analysis/verdict - Get IQ Verdict multi-strategy analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[IQ Verdict] Analyzing property:', body)

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/analysis/verdict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await backendResponse.json()
    
    if (!backendResponse.ok) {
      console.error('[IQ Verdict] Backend error:', data)
      return NextResponse.json(data, { status: backendResponse.status })
    }

    console.log('[IQ Verdict] Analysis successful')
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('[IQ Verdict] Error:', error)
    return NextResponse.json(
      { detail: 'Failed to analyze property' },
      { status: 500 }
    )
  }
}
