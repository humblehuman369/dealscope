import { NextRequest, NextResponse } from 'next/server'
import { parseGoogleValidationResponse } from '@/lib/address-validation'
import type { ValidateAddressRequest } from '@/types/address'

const GOOGLE_VALIDATE_URL = 'https://addressvalidation.googleapis.com/v1:validateAddress'

/**
 * POST /api/validate-address
 * Server-side Google Address Validation. Uses GOOGLE_MAPS_API_KEY (server-only).
 * Do not expose this key to the client; use NEXT_PUBLIC_GOOGLE_MAPS_API_KEY only for Places Autocomplete.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? ''
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Address validation is not configured',
        code: 'VALIDATION_UNAVAILABLE',
      },
      { status: 503 }
    )
  }

  let body: ValidateAddressRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_REQUEST' },
      { status: 400 }
    )
  }

  const raw = body.address
  const addressLines = Array.isArray(raw)
    ? raw.filter((s) => typeof s === 'string')
    : typeof raw === 'string'
      ? [raw.trim()]
      : []
  if (addressLines.length === 0 || !addressLines.some((s) => s.length > 0)) {
    return NextResponse.json(
      { error: 'Missing or empty address', code: 'INVALID_REQUEST' },
      { status: 400 }
    )
  }

  const payload = {
    address: {
      addressLines,
      regionCode: 'US',
    },
    enableUspsCass: true,
  }

  try {
    const res = await fetch(`${GOOGLE_VALIDATE_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message = data?.error?.message ?? res.statusText
      const code = data?.error?.code ?? res.status
      return NextResponse.json(
        { error: message, code: code === 429 ? 'RATE_LIMIT_EXCEEDED' : 'VALIDATION_ERROR' },
        { status: res.status === 429 ? 429 : 502 }
      )
    }

    const parsed = parseGoogleValidationResponse(data)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid validation response', code: 'VALIDATION_ERROR' },
        { status: 502 }
      )
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[validate-address]', err)
    return NextResponse.json(
      { error: 'Address validation request failed', code: 'NETWORK_ERROR' },
      { status: 502 }
    )
  }
}
