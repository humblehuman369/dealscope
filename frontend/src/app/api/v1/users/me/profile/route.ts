import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to production Railway URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// GET /api/v1/users/me/profile - Get user profile (investor preferences)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/me/profile`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Users Profile GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch profile' }, { status: 500 })
  }
}

// PATCH /api/v1/users/me/profile - Update user profile (investor preferences)
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Users Profile PATCH] Updating investor profile')

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/me/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await backendResponse.json()
    
    if (backendResponse.ok) {
      console.log('[Users Profile PATCH] Success')
    } else {
      console.error('[Users Profile PATCH] Backend error:', backendResponse.status, data)
    }

    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Users Profile PATCH] Error:', error)
    return NextResponse.json({ detail: 'Failed to update profile' }, { status: 500 })
  }
}
