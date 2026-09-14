'use client'

import { useEffect, useRef } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { identifyPostHog, initPostHog } from '@/lib/posthog'
import { initMetaPixel } from '@/lib/metaPixel'
import { useSession } from '@/hooks/useSession'

/**
 * Analytics stack — only rendered by AnalyticsAndConsent when the user has
 * accepted analytics cookies, so everything here is consent-gated by mount.
 *
 * - Vercel Analytics: page views + lightweight custom events
 * - PostHog: identity-stitched product funnels (signup -> verdict -> trial -> paid)
 * - Meta Pixel: four funnel events as standard events for paid-social optimization
 *   (no-op unless NEXT_PUBLIC_META_PIXEL_ID is set)
 */
export function AnalyticsProvider() {
  const { user } = useSession()
  const identifiedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    void initPostHog()
    initMetaPixel()
  }, [])

  // Once per app mount (and again only if the signed-in user changes).
  // Client-side route changes do not remount this provider. Never identify
  // when signed out. Email must land in $set so "email is set" cohorts match.
  useEffect(() => {
    if (!user?.id) {
      identifiedUserIdRef.current = null
      return
    }
    if (!user.email) return
    if (identifiedUserIdRef.current === user.id) return
    identifiedUserIdRef.current = user.id
    identifyPostHog(user.id, {
      email: user.email,
      tier: user.subscription_tier,
    })
  }, [user?.id, user?.email, user?.subscription_tier])

  return <Analytics />
}
