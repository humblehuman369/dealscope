import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const zpid = searchParams.get('zpid')
    const url = searchParams.get('url')
    
    if (!zpid && !url) {
      return NextResponse.json(
        { detail: 'Either zpid or url parameter is required' },
        { status: 400 }
      )
    }
    
    // Build query string
    const params = new URLSearchParams()
    if (zpid) params.append('zpid', zpid)
    if (url) params.append('url', url)
    
    // Try to call the backend API
    try {
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
        return NextResponse.json(data)
      }
      
      console.warn(`Backend API returned ${backendResponse.status} for photos`)
    } catch (backendError) {
      console.warn('Backend API unavailable for photos:', backendError)
    }
    
    // Fallback: Return mock photos data
    const mockPhotos = {
      success: true,
      zpid: zpid || null,
      url: url || null,
      photos: [
        { url: 'https://photos.zillowstatic.com/fp/placeholder-1.jpg', caption: 'Front exterior' },
        { url: 'https://photos.zillowstatic.com/fp/placeholder-2.jpg', caption: 'Living room' },
        { url: 'https://photos.zillowstatic.com/fp/placeholder-3.jpg', caption: 'Kitchen' },
        { url: 'https://photos.zillowstatic.com/fp/placeholder-4.jpg', caption: 'Master bedroom' },
        { url: 'https://photos.zillowstatic.com/fp/placeholder-5.jpg', caption: 'Backyard' },
      ],
      total_count: 5,
      fetched_at: new Date().toISOString(),
      is_mock: true
    }
    
    return NextResponse.json(mockPhotos)
    
  } catch (error) {
    console.error('Photos fetch error:', error)
    return NextResponse.json(
      { detail: 'Failed to fetch photos' },
      { status: 500 }
    )
  }
}

