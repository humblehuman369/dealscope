'use client'

import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Check, Mail } from 'lucide-react'

import { trackEvent } from '@/lib/eventTracking'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface SavePlanFormProps {
  isAuthenticated: boolean
  /** Signed-in path: save straight to the user's deals. */
  onSaveAuthenticated: () => Promise<void>
  /** Anonymous path: email-first claim; the backend emails a magic link. */
  onClaim: (email: string) => Promise<void>
  /** Analytics context. */
  family: string | null
}

type SaveState = 'idle' | 'submitting' | 'sent' | 'saved' | 'error'

/**
 * The hook. Email is the only ask, and it comes after the plan is visible.
 * No password — the emailed link signs the user in and opens the plan.
 */
export function SavePlanForm({
  isAuthenticated,
  onSaveAuthenticated,
  onClaim,
  family,
}: SavePlanFormProps): ReactNode {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleAuthenticatedSave = async () => {
    setState('submitting')
    setError(null)
    trackEvent('plan_save_submitted', { mode: 'authenticated', family: family ?? undefined })
    try {
      await onSaveAuthenticated()
      setState('saved')
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        setState('saved')
        return
      }
      setError("We couldn't save that just now. Try again in a moment.")
      setState('error')
    }
  }

  const handleClaim = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email so we know where to send your plan.')
      return
    }
    setState('submitting')
    setError(null)
    trackEvent('plan_save_submitted', { mode: 'email', family: family ?? undefined })
    try {
      await onClaim(trimmed)
      trackEvent('plan_save_email_sent', { family: family ?? undefined })
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

  if (state === 'saved') {
    return (
      <div
        className="flex items-center gap-3 rounded-xl"
        style={{
          padding: '14px 16px',
          background: 'color-mix(in srgb, var(--status-positive) 12%, var(--surface-card))',
          border: '1px solid color-mix(in srgb, var(--status-positive) 40%, transparent)',
        }}
      >
        <Check size={20} style={{ color: 'var(--status-positive)', flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>
            Plan saved to your deals
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-body)' }}>
            Open it any time from DealVault or the Strategy workbench.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'sent') {
    return (
      <div
        className="flex items-start gap-3 rounded-xl"
        style={{
          padding: '14px 16px',
          background: 'color-mix(in srgb, var(--accent-sky) 12%, var(--surface-card))',
          border: '1px solid color-mix(in srgb, var(--accent-sky) 40%, transparent)',
        }}
        role="status"
      >
        <Mail size={20} style={{ color: 'var(--accent-sky)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>
            Check your inbox
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--text-body)' }}>
            We sent your plan to <strong style={{ color: 'var(--text-heading)' }}>{email.trim()}</strong>{' '}
            with a one-tap link that opens it in the Strategy workbench. The link works for 30
            minutes.
          </p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleAuthenticatedSave}
          disabled={state === 'submitting'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
        >
          {state === 'submitting' ? 'Saving…' : 'Save my plan'}
        </button>
        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--status-negative)' }}>
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleClaim} className="flex flex-col gap-2" noValidate>
      <label htmlFor="make-it-work-email" className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="make-it-work-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'submitting'}
          className="min-w-0 flex-1 rounded-full px-4 py-3 text-[15px] focus:outline-none focus-visible:ring-2"
          style={{
            background: 'var(--surface-elevated)',
            border: `1px solid ${error ? 'var(--status-negative)' : 'var(--border-default)'}`,
            color: 'var(--text-heading)',
          }}
          aria-invalid={Boolean(error)}
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
        >
          {state === 'submitting' ? 'Sending…' : 'Save my plan'}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        We&apos;ll email your plan and a one-tap link to reopen it. No password needed. Free.
      </p>
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--status-negative)' }}>
          {error}
        </p>
      )}
    </form>
  )
}
