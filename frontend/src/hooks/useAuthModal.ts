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
      const params = new URLSearchParams(window.location.search)
      params.set('auth', mode)
      const fullPath = window.location.search ? `${pathname}${window.location.search}` : pathname
      params.set('redirect', fullPath)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname],
  )

  return { openAuthModal }
}
