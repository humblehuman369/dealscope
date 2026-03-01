'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

import { COOKIE_CONSENT_KEY, getStoredConsent, type CookieConsent } from '@/lib/cookieConsent'

export { COOKIE_CONSENT_KEY, type CookieConsent }

interface CookieConsentBannerProps {
  onConsentChange?: (consent: CookieConsent) => void
}

export function CookieConsentBanner({ onConsentChange }: CookieConsentBannerProps) {
  const [consent, setConsent] = useState<CookieConsent>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredConsent()
    if (stored === 'all' || stored === 'essential') setConsent(stored)
    setMounted(true)
  }, [])

  const setStored = (value: CookieConsent) => {
    try {
      if (value) localStorage.setItem(COOKIE_CONSENT_KEY, value)
    } catch {
      // ignore
    }
    setConsent(value)
    onConsentChange?.(value)
  }

  const acceptAll = () => setStored('all')
  const essentialOnly = () => setStored('essential')

  if (!mounted || consent !== null) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-700/50 bg-[var(--color-card)] px-4 py-4 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-300">
          We use essential cookies for authentication and optional analytics to
          improve the product.{' '}
          <Link
            href="/privacy"
            className="font-medium text-teal-400 underline hover:text-teal-300"
          >
            Learn more
          </Link>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={essentialOnly}
            className="rounded-lg border border-slate-600 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-black hover:bg-teal-400"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}

