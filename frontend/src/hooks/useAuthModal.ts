'use client'

import { useCallback } from 'react'
import { useAppPathname } from '@/hooks/useAppNavigation'
import { useRouter } from 'next/navigation'
import { defaultAuthRedirect, persistAuthRedirect } from '@/lib/authRedirect'

/**
 * Hook to control the global auth modal via URL search params.
 *
 * The global AuthModal (rendered in providers.tsx) opens when it sees
 * `?auth=login` or `?auth=register` in the URL.  This hook provides
 * a clean API for triggering that from anywhere in the app.
 */
export function useAuthModal() {
  const router = useRouter()
  const pathname = useAppPathname()

  const openAuthModal = useCallback(
    (mode: 'login' | 'register', redirectTo?: string) => {
      // Build a clean redirect URL without stale auth/redirect params
      const currentParams = new URLSearchParams(window.location.search)
      currentParams.delete('auth')
      currentParams.delete('redirect')
      const cleanSearch = currentParams.toString()
      const redirectPath = redirectTo ?? defaultAuthRedirect(pathname, window.location.search)
      persistAuthRedirect(redirectPath)

      const params = new URLSearchParams(cleanSearch)
      params.set('auth', mode)
      params.set('redirect', redirectPath)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname],
  )

  return { openAuthModal }
}
