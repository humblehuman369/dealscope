import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// Backend API URL - defaults to production Railway URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// GET /api/v1/users/me - Get current user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Users ME GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch user data' }, { status: 500 })
  }
}

// PATCH /api/v1/users/me - Update current user
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Users ME PATCH] Updating user profile')

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await backendResponse.json()
    
    if (backendResponse.ok) {
      console.log('[Users ME PATCH] Success')
    } else {
      console.error('[Users ME PATCH] Backend error:', backendResponse.status, data)
    }

    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Users ME PATCH] Error:', error)
    return NextResponse.json({ detail: 'Failed to update user' }, { status: 500 })
  }
}
