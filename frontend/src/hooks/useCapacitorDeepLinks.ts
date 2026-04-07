'use client'

/**
 * Listens for deep link callbacks from the Capacitor native shell.
 *
 * Primary use: Google OAuth returns tokens via `dealgapiq://auth/callback?access_token=…&refresh_token=…`.
 * The handler stores tokens, refreshes the session, and closes the external browser.
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { IS_CAPACITOR } from '@/lib/env'
import { setMemoryToken } from '@/lib/api-client'
import { SESSION_QUERY_KEY, setLastKnownUser, setLastTokenRefresh } from '@/hooks/useSession'

export function useCapacitorDeepLinks() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const listenerRef = useRef<{ remove: () => Promise<void> } | null>(null)

  useEffect(() => {
    if (!IS_CAPACITOR) return

    let cancelled = false

    async function setup() {
      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')

      const listener = await App.addListener('appUrlOpen', async ({ url }) => {
        if (cancelled) return

        const parsed = new URL(url)

        if (parsed.protocol === 'dealgapiq:' && parsed.hostname === 'auth' && parsed.pathname === '/callback') {
          const accessToken = parsed.searchParams.get('access_token')
          const refreshToken = parsed.searchParams.get('refresh_token')
          const error = parsed.searchParams.get('error')

          try { await Browser.close() } catch { /* may already be closed */ }

          if (error) {
            router.replace(`/login?error=${encodeURIComponent(error)}`)
            return
          }

          if (accessToken) {
            setMemoryToken(accessToken, refreshToken ?? undefined)
            setLastTokenRefresh()

            const { authApi } = await import('@/lib/api-client')
            try {
              const user = await authApi.me()
              if (user) {
                setLastKnownUser(user)
                queryClient.setQueryData(SESSION_QUERY_KEY, user)
              }
            } catch {
              // Token is stored; session query will retry on next focus
            }

            router.replace('/search')
          }
        }
      })

      if (!cancelled) {
        listenerRef.current = listener
      } else {
        await listener.remove()
      }
    }

    setup()

    return () => {
      cancelled = true
      listenerRef.current?.remove()
    }
  }, [queryClient, router])
}
