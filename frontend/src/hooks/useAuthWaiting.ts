'use client'

import { useEffect } from 'react'

import {
  AUTH_CHANNEL_NAME,
  AUTH_POLL_MAX_MS,
  AUTH_POLL_MS,
  markAuthWaiting,
  type AuthChannelMessage,
  hydrateSessionFromCookies,
} from '@/lib/authWaiting'
import { useQueryClient } from '@tanstack/react-query'

/**
 * While the "Check your email" screen is open: set the waiting flag,
 * listen for `{ type: 'signed-in' }` on the auth channel, and poll /me
 * every 3s for 15 minutes as a fallback.
 */
export function useAuthWaiting(onSignedIn: () => void, enabled: boolean): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    markAuthWaiting()

    let cancelled = false
    const run = async () => {
      const ok = await hydrateSessionFromCookies(queryClient)
      if (!cancelled && ok) onSignedIn()
    }

    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
      channel.onmessage = (event: MessageEvent<AuthChannelMessage>) => {
        if (event.data?.type === 'signed-in') void run()
      }
    }

    const started = Date.now()
    const poll = window.setInterval(() => {
      if (Date.now() - started >= AUTH_POLL_MAX_MS) {
        window.clearInterval(poll)
        return
      }
      void run()
    }, AUTH_POLL_MS)

    return () => {
      cancelled = true
      channel?.close()
      window.clearInterval(poll)
    }
  }, [enabled, onSignedIn, queryClient])
}
