import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering since this route uses searchParams
export const dynamic = 'force-dynamic'

// Backend API URL - defaults to production Railway URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const zpid = searchParams.get('zpid')
    const url = searchParams.get('url')
    
    console.log('[Photos API] Request received - zpid:', zpid, 'BACKEND_URL:', BACKEND_URL)
    
    if (!zpid && !url) {
      return NextResponse.json(
        { success: false, error: 'Either zpid or url parameter is required', photos: [] },
        { status: 400 }
      )
    }
    
    // Build query string
    const params = new URLSearchParams()
    if (zpid) params.append('zpid', zpid)
    if (url) params.append('url', url)
    
    // Call the backend API
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/photos?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    
    if (backendResponse.ok) {
      const data = await backendResponse.json()
      console.log('[Photos API] Backend success - photos:', data.photos?.length)
      return NextResponse.json(data)
    }
    
    console.error('[Photos API] Backend returned error status:', backendResponse.status)
    return NextResponse.json(
      { success: false, error: `Backend returned status ${backendResponse.status}`, photos: [] },
      { status: backendResponse.status }
    )
    
  } catch (error) {
    console.error('[Photos API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch photos from backend', photos: [] },
      { status: 500 }
    )
  }
}
