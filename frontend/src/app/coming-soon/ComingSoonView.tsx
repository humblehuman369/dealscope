'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import { brandLogo, BRAND_LOGO_SIZE, LEGAL_ENTITY_DBA } from '@/lib/brand'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function ComingSoonView() {
  const { theme, mounted } = useTheme()
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[var(--surface-base)] px-5 py-12">
      <div className="w-full max-w-md text-center">
        <Image
          src={brandLogo(mounted ? theme : 'dark')}
          alt="DealGapIQ"
          width={BRAND_LOGO_SIZE.width}
          height={BRAND_LOGO_SIZE.height}
          priority
          className="mx-auto h-auto w-56"
          draggable={false}
        />

        <h1 className="mt-10 text-3xl font-bold leading-tight text-[var(--text-heading)] sm:text-4xl">
          DealGapIQ is getting an upgrade.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-body)]">
          We&apos;re rebuilding our property data engine to deliver faster, more accurate deal
          analysis. We&apos;re relaunching in early 2027.
        </p>

        <section className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 text-left">
          {status === 'success' ? (
            <p role="status" className="text-center text-base font-medium text-[var(--text-heading)]">
              You&apos;re on the list. We&apos;ll email you when early access opens.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="waitlist-email" className="block text-sm font-medium text-[var(--text-heading)]">
                Get early access and a founding-member offer when we reopen.
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="waitlist-email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-12 flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-input)] px-4 text-base text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none"
                />
                {/* Honeypot: hidden from people, filled in by bots. */}
                <input
                  type="text"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="hidden"
                />
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="min-h-12 rounded-xl bg-[var(--accent-sky)] px-6 text-base font-semibold text-[var(--text-inverse)] transition-opacity disabled:opacity-60"
                >
                  {status === 'submitting' ? 'Joining…' : 'Notify me'}
                </button>
              </div>
              {status === 'error' && (
                <p role="alert" className="mt-3 text-sm text-[var(--text-secondary)]">
                  That didn&apos;t go through. Check the address and try again.
                </p>
              )}
            </form>
          )}
        </section>

        <p className="mt-8 text-xs text-[var(--text-muted)]">
          © 2026 {LEGAL_ENTITY_DBA} ·{' '}
          <Link href="/privacy" className="underline hover:text-[var(--text-link)]">
            Privacy
          </Link>{' '}
          ·{' '}
          <Link href="/terms" className="underline hover:text-[var(--text-link)]">
            Terms
          </Link>
        </p>
      </div>
    </main>
  )
}
