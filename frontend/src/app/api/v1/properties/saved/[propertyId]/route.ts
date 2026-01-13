import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to production Railway URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://dealscope-production.up.railway.app'

// GET /api/v1/properties/saved/[propertyId] - Get a saved property
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/properties/saved/${params.propertyId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Property GET] Error:', error)
    return NextResponse.json({ detail: 'Failed to fetch saved property' }, { status: 500 })
  }
}

// PATCH /api/v1/properties/saved/[propertyId] - Update a saved property
export async function PATCH(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Saved Property PATCH] Updating property:', params.propertyId)

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/properties/saved/${params.propertyId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await backendResponse.json()
    
    if (backendResponse.ok) {
      console.log('[Saved Property PATCH] Success')
    } else {
      console.error('[Saved Property PATCH] Backend error:', backendResponse.status, data)
    }

    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Property PATCH] Error:', error)
    return NextResponse.json({ detail: 'Failed to update saved property' }, { status: 500 })
  }
}

// DELETE /api/v1/properties/saved/[propertyId] - Delete a saved property
export async function DELETE(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    console.log('[Saved Property DELETE] Deleting property:', params.propertyId)

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/v1/properties/saved/${params.propertyId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    )

    if (backendResponse.status === 204) {
      console.log('[Saved Property DELETE] Success')
      return new NextResponse(null, { status: 204 })
    }

    const data = await backendResponse.json()
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('[Saved Property DELETE] Error:', error)
    return NextResponse.json({ detail: 'Failed to delete saved property' }, { status: 500 })
  }
}

