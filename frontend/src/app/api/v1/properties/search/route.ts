import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to production Railway URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body
    
    console.log('[Property Search] Request received - address:', address, 'BACKEND_URL:', BACKEND_URL)
    
    if (!address) {
      return NextResponse.json(
        { detail: 'Address is required' },
        { status: 400 }
      )
    }
    
    // Call the backend API
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/properties/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (backendResponse.ok) {
      const data = await backendResponse.json()
      console.log('[Property Search] Backend success - property_id:', data.property_id, 'zpid:', data.zpid)
      return NextResponse.json(data)
    }
    
    console.error('[Property Search] Backend returned error:', backendResponse.status)
    return NextResponse.json(
      { detail: `Backend returned status ${backendResponse.status}` },
      { status: backendResponse.status }
    )
    
  } catch (error) {
    console.error('[Property Search] Error:', error)
    return NextResponse.json(
      { detail: 'Failed to search property' },
      { status: 500 }
    )
  }
}
