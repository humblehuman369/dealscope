import { NextResponse } from 'next/server'

const RESEND_API = 'https://api.resend.com'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Coming-soon waitlist signup. Adds the email to a Resend segment so the
 * relaunch announcement can go out as a broadcast.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; company?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  // Honeypot filled in: pretend success so bots don't retry.
  if (typeof body?.company === 'string' && body.company.length > 0) {
    return NextResponse.json({ ok: true })
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const segmentId = process.env.RESEND_SEGMENT_ID
  if (!apiKey || !segmentId) {
    console.error('[waitlist] RESEND_API_KEY or RESEND_SEGMENT_ID is not set')
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  // Create fails harmlessly when the contact already exists (e.g. a registered
  // user); the segment add below is what decides success either way.
  await fetch(`${RESEND_API}/contacts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, unsubscribed: false }),
  })

  const added = await fetch(
    `${RESEND_API}/contacts/${encodeURIComponent(email)}/segments/${segmentId}`,
    { method: 'POST', headers },
  )
  if (!added.ok) {
    console.error('[waitlist] Resend segment add failed', added.status, await added.text())
    return NextResponse.json({ error: 'unavailable' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
