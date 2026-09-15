'use client'

import { useState, useEffect } from 'react'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import { getStoredConsent, type CookieConsent } from '@/lib/cookieConsent'

export function AnalyticsAndConsent() {
  const [consent, setConsent] = useState<CookieConsent>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredConsent()
    if (stored) setConsent(stored)
    setMounted(true)
  }, [])

  return (
    <>
      {mounted && consent === 'all' && <AnalyticsProvider />}
      <CookieConsentBanner onConsentChange={setConsent} />
    </>
  )
}
