'use client'

/**
 * RevenueCat integration for Capacitor (iOS/Android).
 *
 * Handles SDK initialization, user identification, package purchase,
 * restore, and entitlement checking. After any purchase/restore event,
 * syncs the entitlement to the backend so /me returns updated tier.
 *
 * RESILIENCE CONTRACT (important for App Store review):
 *
 * The hook must always reach a terminal `ready: true` state — on
 * success OR failure — so the UI never renders a perpetual loading
 * skeleton. Every failure mode sets a human-readable `error` so the
 * UpgradeModal can surface a retry affordance instead of a silently
 * disabled purchase button. An 8-second watchdog guarantees we
 * bail out even if the native SDK hangs.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IS_CAPACITOR } from '@/lib/env'
import { api } from '@/lib/api-client'
import { SESSION_QUERY_KEY, useSession } from '@/hooks/useSession'

export interface RCPackage {
  identifier: string
  packageType: string
  product: {
    identifier: string
    title: string
    description: string
    priceString: string
    price: number
    currencyCode: string
  }
}

interface RevenueCatState {
  ready: boolean
  packages: RCPackage[]
  isPurchasing: boolean
  error: string | null
}

const RC_API_KEY_IOS = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? ''
const RC_API_KEY_ANDROID = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''

const INIT_TIMEOUT_MS = 8000

const GENERIC_UNAVAILABLE_MSG =
  'In-app purchases are temporarily unavailable. Please try again.'

export function useRevenueCat() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const configuredRef = useRef(false)
  const attemptRef = useRef(0)
  const [state, setState] = useState<RevenueCatState>({
    ready: false,
    packages: [],
    isPurchasing: false,
    error: null,
  })

  const loadOfferings = useCallback(async () => {
    const attempt = ++attemptRef.current

    // Flip to loading but keep any prior error in place so the UpgradeModal
    // stays in its "Try again" UI during a retry (error is cleared on success).
    setState((s) => ({ ...s, ready: false }))

    if (!IS_CAPACITOR) {
      if (attemptRef.current === attempt) {
        setState((s) => ({ ...s, ready: true, packages: [], error: null }))
      }
      return
    }

    const platform = (window as unknown as Record<string, unknown>).Capacitor as
      | { getPlatform?: () => string }
      | undefined
    const isIOS = platform?.getPlatform?.() === 'ios'
    const apiKey = isIOS ? RC_API_KEY_IOS : RC_API_KEY_ANDROID

    if (!apiKey) {
      if (attemptRef.current === attempt) {
        setState((s) => ({
          ...s,
          ready: true,
          packages: [],
          error: GENERIC_UNAVAILABLE_MSG,
        }))
      }
      return
    }

    const watchdog = setTimeout(() => {
      if (attemptRef.current !== attempt) return
      setState((s) => {
        if (s.ready && s.packages.length > 0) return s
        return {
          ...s,
          ready: true,
          error: GENERIC_UNAVAILABLE_MSG,
        }
      })
    }, INIT_TIMEOUT_MS)

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')

      if (!configuredRef.current) {
        await Purchases.configure({ apiKey })
        configuredRef.current = true
      }

      if (user?.id) {
        try {
          await Purchases.logIn({ appUserID: user.id })
        } catch {
          // Non-fatal: offerings still resolve without a logged-in appUserID.
        }
      }

      const offerings = await Purchases.getOfferings()
      const current = offerings.current
      const packages: RCPackage[] = (current?.availablePackages ?? []).map((p) => ({
        identifier: p.identifier,
        packageType: p.packageType,
        product: {
          identifier: p.product.identifier,
          title: p.product.title,
          description: p.product.description,
          priceString: p.product.priceString,
          price: p.product.price,
          currencyCode: p.product.currencyCode,
        },
      }))

      clearTimeout(watchdog)
      if (attemptRef.current !== attempt) return

      if (packages.length === 0) {
        setState((s) => ({
          ...s,
          ready: true,
          packages: [],
          error: GENERIC_UNAVAILABLE_MSG,
        }))
        return
      }

      setState((s) => ({
        ...s,
        ready: true,
        packages,
        error: null,
      }))
    } catch {
      clearTimeout(watchdog)
      if (attemptRef.current !== attempt) return
      setState((s) => ({
        ...s,
        ready: true,
        error: GENERIC_UNAVAILABLE_MSG,
      }))
    }
  }, [user?.id])

  useEffect(() => {
    loadOfferings()
  }, [loadOfferings])

  const syncEntitlementToBackend = useCallback(async () => {
    try {
      await api.post('/api/v1/billing/sync-iap')
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    } catch {
      // Best effort — the RevenueCat webhook will sync eventually
    }
  }, [queryClient])

  const purchase = useCallback(
    async (packageId: string) => {
      setState((s) => ({ ...s, isPurchasing: true, error: null }))
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')
        const offerings = await Purchases.getOfferings()
        const pkg = offerings.current?.availablePackages?.find(
          (p) => p.identifier === packageId,
        )
        if (!pkg) throw new Error('Package not found')

        await Purchases.purchasePackage({ aPackage: pkg })
        await syncEntitlementToBackend()
        setState((s) => ({ ...s, isPurchasing: false }))
        return true
      } catch (err: unknown) {
        const cancelled =
          err &&
          typeof err === 'object' &&
          'userCancelled' in err &&
          (err as { userCancelled?: boolean }).userCancelled
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Purchase failed.'
          setState((s) => ({ ...s, error: msg, isPurchasing: false }))
        } else {
          setState((s) => ({ ...s, isPurchasing: false }))
        }
        return false
      }
    },
    [syncEntitlementToBackend],
  )

  const restore = useCallback(async () => {
    setState((s) => ({ ...s, isPurchasing: true, error: null }))
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      await Purchases.restorePurchases()
      await syncEntitlementToBackend()
      setState((s) => ({ ...s, isPurchasing: false }))
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restore failed.'
      setState((s) => ({ ...s, error: msg, isPurchasing: false }))
      return false
    }
  }, [syncEntitlementToBackend])

  return {
    ...state,
    purchase,
    restore,
    retry: loadOfferings,
  }
}
