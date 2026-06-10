'use client'

import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { identifyPostHog, initPostHog } from '@/lib/posthog'
import { useSession } from '@/hooks/useSession'

/**
 * Analytics stack — only rendered by AnalyticsAndConsent when the user has
 * accepted analytics cookies, so everything here is consent-gated by mount.
 *
 * - Vercel Analytics: page views + lightweight custom events
 * - PostHog: identity-stitched product funnels (signup -> verdict -> trial -> paid)
 */
export function AnalyticsProvider() {
  const { user } = useSession()

  useEffect(() => {
    void initPostHog()
  }, [])

  // Identify as soon as a session exists so anonymous pre-signup events are
  // stitched to the account. Tier is a person property for funnel cohorts.
  useEffect(() => {
    if (user?.id) {
      identifyPostHog(user.id, {
        email: user.email,
        tier: user.subscription_tier,
      })
    }
  }, [user?.id, user?.email, user?.subscription_tier])

  return <Analytics />
}
