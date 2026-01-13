import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to production Railway URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// GET /api/v1/properties/saved - List saved properties
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const queryString = url.searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/v1/properties/saved${queryString ? `?${queryString}` : ''}`

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Properties GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch saved properties' }, { status: 500 })
  }
}

// POST /api/v1/properties/saved - Save a new property
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Saved Properties POST] Saving property:', body.full_address || body.address_street)

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/properties/saved`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await backendResponse.json()
    
    if (backendResponse.ok) {
      console.log('[Saved Properties POST] Success - id:', data.id)
    } else {
      console.error('[Saved Properties POST] Backend error:', backendResponse.status, data)
    }

    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Properties POST] Error:', error)
    return NextResponse.json({ detail: 'Failed to save property' }, { status: 500 })
  }
}

