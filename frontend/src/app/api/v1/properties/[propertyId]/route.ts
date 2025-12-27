import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params
  
  console.log('[Property Get] Request for propertyId:', propertyId, 'BACKEND_URL:', BACKEND_URL)
  
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${propertyId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (backendResponse.ok) {
      const data = await backendResponse.json()
      console.log('[Property Get] Backend success - zpid:', data.zpid)
      return NextResponse.json(data)
    }
    
    console.error('[Property Get] Backend returned error:', backendResponse.status)
    return NextResponse.json(
      { detail: backendResponse.status === 404 ? 'Property not found' : `Backend error ${backendResponse.status}` },
      { status: backendResponse.status }
    )
    
  } catch (error) {
    console.error('[Property Get] Error:', error)
    return NextResponse.json(
      { detail: 'Failed to get property' },
      { status: 500 }
    )
  }
}
