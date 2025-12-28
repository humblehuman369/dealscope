import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body
    
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
      return NextResponse.json(data)
    }
    
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
