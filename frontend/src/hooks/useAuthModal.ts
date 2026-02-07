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
      router.push(`${pathname}?auth=${mode}`)
    },
    [router, pathname],
  )

  return { openAuthModal }
}
