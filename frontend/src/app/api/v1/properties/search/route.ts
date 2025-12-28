import { NextRequest, NextResponse } from 'next/server'

// Backend API URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/route.ts:POST_ENTRY',message:'POST request received',data:{BACKEND_URL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
  try {
    const body = await request.json()
    const { address } = body
    
    console.log('[Property Search] Request received - address:', address, 'BACKEND_URL:', BACKEND_URL)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/route.ts:BODY_PARSED',message:'Request body parsed',data:{address,BACKEND_URL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion
    
    if (!address) {
      return NextResponse.json(
        { detail: 'Address is required' },
        { status: 400 }
      )
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/route.ts:BEFORE_BACKEND_CALL',message:'About to call backend',data:{backendUrl:`${BACKEND_URL}/api/v1/properties/search`},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C,D'})}).catch(()=>{});
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
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/route.ts:AFTER_BACKEND_CALL',message:'Backend responded',data:{status:backendResponse.status,ok:backendResponse.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D,E'})}).catch(()=>{});
    // #endregion
    
    if (backendResponse.ok) {
      const data = await backendResponse.json()
      console.log('[Property Search] Backend success - property_id:', data.property_id, 'zpid:', data.zpid)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/route.ts:SUCCESS',message:'Property found successfully',data:{property_id:data.property_id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(data)
    }
    
    console.error('[Property Search] Backend returned error:', backendResponse.status)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/route.ts:BACKEND_ERROR',message:'Backend returned non-OK status',data:{status:backendResponse.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { detail: `Backend returned status ${backendResponse.status}` },
      { status: backendResponse.status }
    )
    
  } catch (error) {
    console.error('[Property Search] Error:', error)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search/route.ts:CATCH_ERROR',message:'Exception caught in POST handler',data:{error:String(error),errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { detail: 'Failed to search property' },
      { status: 500 }
    )
  }
}
