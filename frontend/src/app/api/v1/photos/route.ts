import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering since this route uses searchParams
export const dynamic = 'force-dynamic'

// Backend API URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const zpid = searchParams.get('zpid')
    const url = searchParams.get('url')
    // #region agent log
    const fs = await import('fs');
    fs.appendFileSync('/Users/bradgeisen/IQ-Data/dealscope/.cursor/debug.log', JSON.stringify({location:'api/v1/photos/route.ts:entry',message:'Photos API called',data:{zpid,url,hasZpid:!!zpid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})+'\n');
    // #endregion
    
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
        // #region agent log
        const fs2 = await import('fs');
        fs2.appendFileSync('/Users/bradgeisen/IQ-Data/dealscope/.cursor/debug.log', JSON.stringify({location:'api/v1/photos/route.ts:backend-ok',message:'Backend photos response',data:{success:data.success,photoCount:data.photos?.length,isMock:data.is_mock,firstUrl:data.photos?.[0]?.url?.substring(0,60)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C-D'})+'\n');
        // #endregion
        return NextResponse.json(data)
      }
      
      // #region agent log
      const fs3 = await import('fs');
      fs3.appendFileSync('/Users/bradgeisen/IQ-Data/dealscope/.cursor/debug.log', JSON.stringify({location:'api/v1/photos/route.ts:backend-error',message:'Backend photos error',data:{status:backendResponse.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})+'\n');
      // #endregion
      console.warn(`Backend API returned ${backendResponse.status} for photos`)
    } catch (backendError) {
      console.warn('Backend API unavailable for photos:', backendError)
    }
    
    // #region agent log
    const fs4 = await import('fs');
    fs4.appendFileSync('/Users/bradgeisen/IQ-Data/dealscope/.cursor/debug.log', JSON.stringify({location:'api/v1/photos/route.ts:mock-fallback',message:'Using mock photos fallback',data:{zpid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})+'\n');
    // #endregion
    // Fallback: Return mock photos data with real placeholder images
    const mockPhotos = {
      success: true,
      zpid: zpid || null,
      url: url || null,
      photos: [
        { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop', caption: 'Front exterior' },
        { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop', caption: 'Living room' },
        { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop', caption: 'Kitchen' },
        { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop', caption: 'Master bedroom' },
        { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop', caption: 'Backyard' },
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

