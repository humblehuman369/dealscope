'use client'

import { useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Hook to control the global auth modal via URL search params.
 *
 * The global AuthModal (rendered in providers.tsx) opens when it sees
 * `?auth=login` or `?auth=register` in the URL.  This hook provides
 * a clean API for triggering that from anywhere in the app.
 */
export function useAuthModal() {
  const router = useRouter()
  const pathname = usePathname()

  const openAuthModal = useCallback(
    (mode: 'login' | 'register') => {
      // Build a clean redirect URL without stale auth/redirect params
      const currentParams = new URLSearchParams(window.location.search)
      currentParams.delete('auth')
      currentParams.delete('redirect')
      const cleanSearch = currentParams.toString()
      const redirectPath = cleanSearch ? `${pathname}?${cleanSearch}` : pathname

      const params = new URLSearchParams(cleanSearch)
      params.set('auth', mode)
      params.set('redirect', redirectPath)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname],
  )

  return { openAuthModal }
}
