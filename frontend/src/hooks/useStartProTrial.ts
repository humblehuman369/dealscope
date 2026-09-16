'use client'

/**
 * Yearly Pro trial checkout — the same Stripe / RevenueCat path as UpgradeModal.
 * Always the yearly product. No monthly/annual toggle.
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, billingApi } from '@/lib/api-client'
import { trackEvent } from '@/lib/eventTracking'
import { usesAppleIap, usesNativeIap } from '@/lib/env'
import { useRevenueCat, type RCPackage } from '@/hooks/useRevenueCat'
import { markProWelcomePending, resolveCheckoutReturnTo, withProWelcome } from '@/lib/checkoutReturn'

interface PricingPlan {
  id: string
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
}

function pickYearlyPackage(packages: RCPackage[]): RCPackage | undefined {
  return (
    packages.find((p) => p.packageType === 'ANNUAL') ??
    packages.find((p) => p.identifier.toLowerCase().includes('annual'))
  )
}

export function useStartProTrial(options?: { returnTo?: string; source?: string }) {
  const router = useRouter()
  const rc = useRevenueCat()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startTrial = useCallback(async () => {
    trackEvent('upgrade_wall_trial_clicked')

    if (usesNativeIap()) {
      const rcPkg = pickYearlyPackage(rc.packages)
      if (!rcPkg) {
        setError(rc.error ?? 'Yearly plan is not available right now.')
        return
      }
      trackEvent('checkout_started', {
        source: options?.source ?? 'upgrade_wall',
        plan: 'yearly',
        platform: usesAppleIap() ? 'apple_iap' : 'capacitor',
      })
      const success = await rc.purchase(rcPkg.identifier)
      if (success) {
        markProWelcomePending()
        router.replace(withProWelcome(resolveCheckoutReturnTo(options?.returnTo)))
      }
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ plans: PricingPlan[] }>('/api/v1/billing/plans')
      const proPlan = (res.plans || []).find((p) => p.id === 'pro')
      const priceId = proPlan?.stripe_price_id_yearly
      if (!priceId) {
        setError('This plan is not available for checkout.')
        return
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const dest = resolveCheckoutReturnTo(options?.returnTo)
      const successUrl = `${origin}/checkout/success?returnTo=${encodeURIComponent(dest)}`
      const { checkout_url } = await billingApi.createCheckoutSession({
        price_id: priceId,
        success_url: successUrl,
        cancel_url: `${origin}/pricing`,
        return_to: dest,
      })
      trackEvent('checkout_started', {
        source: options?.source ?? 'upgrade_wall',
        plan: 'yearly',
      })
      window.location.href = checkout_url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Checkout could not be started.')
    } finally {
      setLoading(false)
    }
  }, [options?.returnTo, options?.source, rc, router])

  return {
    startTrial,
    loading: loading || rc.isPurchasing,
    error,
  }
}
