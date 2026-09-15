'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

import { COOKIE_CONSENT_KEY, getStoredConsent, setStoredConsent, type CookieConsent } from '@/lib/cookieConsent'

export { COOKIE_CONSENT_KEY, type CookieConsent }

/**
 * Published height of the open banner. Fixed bottom elements (sticky CTAs)
 * read it as `bottom: var(--consent-banner-height, 0px)` so they sit above the
 * banner instead of underneath it on the first visit.
 */
export const CONSENT_BANNER_HEIGHT_VAR = '--consent-banner-height'

interface CookieConsentBannerProps {
  onConsentChange?: (consent: CookieConsent) => void
}

export function CookieConsentBanner({ onConsentChange }: CookieConsentBannerProps) {
  const [consent, setConsent] = useState<CookieConsent>(null)
  const [mounted, setMounted] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = getStoredConsent()
    if (stored === 'all' || stored === 'essential') setConsent(stored)
    setMounted(true)
  }, [])

  const open = mounted && consent === null

  useEffect(() => {
    const el = bannerRef.current
    const root = document.documentElement
    if (!open || !el) {
      root.style.removeProperty(CONSENT_BANNER_HEIGHT_VAR)
      return
    }
    const publish = () => root.style.setProperty(CONSENT_BANNER_HEIGHT_VAR, `${el.offsetHeight}px`)
    publish()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null
    observer?.observe(el)
    return () => {
      observer?.disconnect()
      root.style.removeProperty(CONSENT_BANNER_HEIGHT_VAR)
    }
  }, [open])

  const setStored = (value: CookieConsent) => {
    setStoredConsent(value)
    setConsent(value)
    onConsentChange?.(value)
  }

  const acceptAll = () => setStored('all')
  const essentialOnly = () => setStored('essential')

  if (!open) return null

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t px-4 py-4 shadow-lg sm:px-6"
      style={{
        background: 'var(--surface-card)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm" style={{ color: 'var(--text-body)' }}>
          We use essential cookies for authentication and optional analytics to improve the product.{' '}
          <Link
            href="/privacy"
            className="font-medium underline"
            style={{ color: 'var(--text-link)' }}
          >
            Learn more
          </Link>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={essentialOnly}
            className="min-h-11 rounded-lg border bg-transparent px-4 py-2 text-sm font-medium"
            style={{
              color: 'var(--text-heading)',
              borderColor: 'var(--border-strong)',
            }}
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="min-h-11 rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              background: 'var(--accent-sky)',
              color: 'var(--text-inverse)',
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
