'use client'

/**
 * RevenueCat integration for Capacitor (iOS/Android).
 *
 * Handles SDK initialization, user identification, package purchase,
 * restore, and entitlement checking. After any purchase/restore event,
 * syncs the entitlement to the backend so /me returns updated tier.
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

export function useRevenueCat() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const initializedRef = useRef(false)
  const [state, setState] = useState<RevenueCatState>({
    ready: false,
    packages: [],
    isPurchasing: false,
    error: null,
  })

  useEffect(() => {
    if (!IS_CAPACITOR || initializedRef.current) return
    if (!RC_API_KEY_IOS && !RC_API_KEY_ANDROID) return

    let cancelled = false

    async function init() {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')

        const platform = (window as Record<string, unknown>).Capacitor as
          | { getPlatform?: () => string }
          | undefined
        const isIOS = platform?.getPlatform?.() === 'ios'
        const apiKey = isIOS ? RC_API_KEY_IOS : RC_API_KEY_ANDROID

        if (!apiKey) return

        await Purchases.configure({ apiKey })
        initializedRef.current = true

        if (user?.id) {
          await Purchases.logIn({ appUserID: user.id })
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

        if (!cancelled) {
          setState((s) => ({ ...s, ready: true, packages }))
        }
      } catch {
        if (!cancelled) {
          setState((s) => ({ ...s, error: 'Could not initialize in-app purchases.' }))
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [user?.id])

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
  }
}
