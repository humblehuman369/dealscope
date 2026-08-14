'use client'

import { FormEvent, useState } from 'react'
import { apiRequest, ApiError } from '@/lib/api-client'
import { trackEvent } from '@/lib/eventTracking'

const INVESTOR_TYPES = ['SFR', 'Flipper', 'Multifamily', 'Broker / Agent', 'Lender', 'Other'] as const

export function NewsletterForm({ placement }: { placement: string }) {
  const [email, setEmail] = useState('')
  const [investorType, setInvestorType] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setMessage('')
    try {
      await apiRequest<{ ok: boolean }>('/api/v1/intelligence/subscribe', {
        method: 'POST',
        skipAuth: true,
        body: {
          email: email.trim(),
          investor_type: investorType || undefined,
          source: 'investor-intelligence',
          placement,
        },
      })
      setStatus('success')
      setMessage('You’re on the list. We’ll send Investor Intelligence — not noise.')
      trackEvent('ii_newsletter_signup', { placement, investor_type: investorType || 'unspecified' })
      setEmail('')
      setInvestorType('')
    } catch (err) {
      setStatus('error')
      setMessage(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <form className="ii-form" onSubmit={onSubmit} noValidate>
      <h3 style={{ fontSize: 20, marginBottom: 20 }}>Be First to Receive DealGapIQ Investor Intelligence</h3>
      {status === 'success' && <p className="ii-form-success">{message}</p>}
      {status === 'error' && <p className="ii-form-error">{message}</p>}
      <div className="ii-row">
        <label htmlFor="ii-email">Email Address</label>
        <input
          id="ii-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="ii-row">
        <label htmlFor="ii-type">Investor Type (optional)</label>
        <select
          id="ii-type"
          name="investor_type"
          value={investorType}
          onChange={(e) => setInvestorType(e.target.value)}
        >
          <option value="">Select one</option>
          {INVESTOR_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <button className="ii-btn ii-btn--primary" type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? 'Submitting…' : 'Get Investor Intelligence'}
      </button>
      <p className="ii-finenote">
        No noise. No daily flood of emails. Just the information that matters to residential
        investors.
      </p>
    </form>
  )
}
