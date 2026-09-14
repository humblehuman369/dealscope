'use client'

import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Mail } from 'lucide-react'

import { firstTouchEventProps, getFirstTouch, getMetaClickIds } from '@/lib/attribution'
import { hasAnalyticsConsent } from '@/lib/cookieConsent'
import { trackEvent } from '@/lib/eventTracking'
import { newMetaEventId } from '@/lib/metaPixel'
import { api } from '@/lib/api-client'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface VerdictEmailCaptureProps {
  address: string
  propertyId?: string | null
  incomeValue: number | null
  targetBuy: number | null
  dealGap: number | null
  /** `slim` is the workflow-v1 logged-out bar. `box` is the current Discovery card. */
  variant?: 'box' | 'slim'
}

type CaptureState = 'idle' | 'submitting' | 'sent' | 'error'

export function VerdictEmailCapture({
  address,
  propertyId,
  incomeValue,
  targetBuy,
  dealGap,
  variant = 'box',
}: VerdictEmailCaptureProps): ReactNode {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<CaptureState>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email so we know where to send this Discovery.')
      return
    }
    setState('submitting')
    setError(null)
    const eventId = newMetaEventId()
    const clickIds = getMetaClickIds()
    const attribution = { ...getFirstTouch(), ...firstTouchEventProps() }
    try {
      await api.post('/api/v1/leads/verdict-email', {
        email: trimmed,
        address,
        property_id: propertyId ?? undefined,
        income_value: incomeValue,
        target_buy: targetBuy,
        deal_gap: dealGap,
        attribution,
        consent: hasAnalyticsConsent(),
        event_id: eventId,
        fbp: clickIds.fbp,
        fbc: clickIds.fbc,
      }, { skipAuth: true })
      trackEvent('verdict_email_captured', undefined, eventId)
      setState('sent')
    } catch (err) {
      const status = (err as { status?: number })?.status
      setError(
        status === 429
          ? 'Too many requests from this network. Please try again in a few minutes.'
          : "We couldn't send that just now. Try again in a moment.",
      )
      setState('error')
    }
  }

  const isSlim = variant === 'slim'
  const label = isSlim ? 'Save this verdict. Email me the numbers.' : 'Email me this Discovery'
  const note = isSlim ? 'One email. No account.' : 'One email. No account. Unsubscribe in one click.'
  const buttonLabel = isSlim ? 'Email me' : 'Email me this Discovery'

  if (state === 'sent') {
    return (
      <div
        className={isSlim ? 'mt-4 mb-6 rounded-xl border px-4 py-3' : 'mt-6 rounded-2xl border p-5'}
        style={{ background: 'var(--surface-elevated)', borderColor: 'var(--border-default)' }}
        role="status"
      >
        <p className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
          Check your inbox
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          We sent the three numbers for this address. One click unsubscribes.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={isSlim ? 'mt-4 mb-6 rounded-xl border px-4 py-3' : 'mt-6 rounded-2xl border p-5'}
      style={{ background: 'var(--surface-elevated)', borderColor: 'var(--border-default)' }}
    >
      <label
        htmlFor="verdict-email"
        className={`block font-bold ${isSlim ? 'text-[13px]' : 'text-sm'}`}
        style={{ color: 'var(--text-heading)' }}
      >
        {label}
      </label>
      <p
        className={`mt-1 leading-relaxed ${isSlim ? 'text-[13px]' : 'text-xs'}`}
        style={{ color: isSlim ? 'var(--text-secondary)' : 'var(--text-muted)' }}
      >
        {note}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="verdict-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'verdict-email-error' : undefined}
          className="min-h-11 flex-1 rounded-xl border px-3 text-sm"
          style={{
            background: 'var(--surface-card)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-heading)',
          }}
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-bold text-white ${
            isSlim ? 'rounded-full' : 'rounded-xl'
          }`}
          style={{ background: 'var(--accent-brand-blue)' }}
        >
          <Mail size={16} aria-hidden />
          {state === 'submitting' ? 'Sending…' : buttonLabel}
        </button>
      </div>
      {error ? (
        <p
          id="verdict-email-error"
          role="alert"
          className={`mt-2 ${isSlim ? 'text-[13px]' : 'text-xs'}`}
          style={{ color: 'var(--status-negative)' }}
        >
          {error}
        </p>
      ) : null}
    </form>
  )
}
