'use client'

/**
 * Listens for deep link callbacks from the Capacitor native shell.
 *
 * Google/Apple OAuth returns a one-time code via `dealgapiq://auth/callback?code=…`.
 * The handler exchanges it for tokens, refreshes the session, and closes the browser.
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { isCapacitor } from '@/lib/env'
import { authApi, setMemoryToken } from '@/lib/api-client'
import { parseCapacitorAuthUrl } from '@/lib/capacitorAuthCallback'
import { SESSION_QUERY_KEY, setLastKnownUser, setLastTokenRefresh } from '@/hooks/useSession'

export function useCapacitorDeepLinks() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const listenerRef = useRef<{ remove: () => Promise<void> } | null>(null)

  useEffect(() => {
    if (!isCapacitor()) return

    let cancelled = false

    async function setup() {
      // Native plugins are device-only; keep them out of the web bundle graph.
      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')

      const listener = await App.addListener('appUrlOpen', async ({ url }) => {
        if (cancelled) return

        const parsed = parseCapacitorAuthUrl(url)

        if (parsed.type === 'magic') {
          const forwarded = new URLSearchParams()
          if (parsed.token) forwarded.set('token', parsed.token)
          if (parsed.next) forwarded.set('next', parsed.next)
          try {
            await Browser.close()
          } catch {
            /* may already be closed */
          }
          const qs = forwarded.toString()
          router.replace(qs ? `/auth/magic?${qs}` : '/auth/magic')
          return
        }

        if (parsed.type === 'ignored') return

        try {
          await Browser.close()
        } catch {
          /* may already be closed */
        }

        if (parsed.type === 'oauth-error') {
          router.replace(`/login?error=${encodeURIComponent(parsed.error)}`)
          return
        }

        try {
          const tokens = await authApi.exchangeMobileOauthCode(parsed.code)
          setMemoryToken(tokens.access_token, tokens.refresh_token)
          setLastTokenRefresh()

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
        } catch {
          router.replace('/login?error=mobile_exchange_failed')
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
