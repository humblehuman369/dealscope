import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  // #region agent log
  console.log('[API Route] POST received, BACKEND_URL:', BACKEND_URL)
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:POST_ENTRY',message:'API route called',data:{BACKEND_URL},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
  // #endregion
  try {
    const body = await request.json()
    const { address } = body
    
    console.log('[API Route] Address:', address)
    
    if (!address) {
      return NextResponse.json(
        { detail: 'Address is required' },
        { status: 400 }
      )
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:BEFORE_BACKEND',message:'About to call backend',data:{address,backendUrl:`${BACKEND_URL}/api/v1/properties/search`},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
    // #endregion
    
    // Call the backend API
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/properties/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    // #region agent log
    console.log('[API Route] Backend response:', backendResponse.status, backendResponse.ok)
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:AFTER_BACKEND',message:'Backend responded',data:{status:backendResponse.status,ok:backendResponse.ok},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
    // #endregion
    
    if (backendResponse.ok) {
      const data = await backendResponse.json()
      console.log('[API Route] Success, property_id:', data.property_id)
      return NextResponse.json(data)
    }
    
    console.error('[API Route] Backend error:', backendResponse.status)
    return NextResponse.json(
      { detail: `Backend returned status ${backendResponse.status}` },
      { status: backendResponse.status }
    )
    
  } catch (error) {
    console.error('[API Route] Error:', error)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:CATCH_ERROR',message:'Exception in API route',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { detail: 'Failed to search property' },
      { status: 500 }
    )
  }
}
