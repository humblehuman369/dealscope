'use client'

/**
 * Magic-link landing. Consumes `?token=`, establishes the session, and sends
 * the user straight to the plan they saved. Works on web (HTTP-only cookies)
 * and inside Capacitor (tokens in memory, via `setMemoryToken`).
 */

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, XCircle } from 'lucide-react'

import { useAppSearchParams } from '@/hooks/useAppNavigation'
import { SESSION_QUERY_KEY, setLastKnownUser, setLastTokenRefresh } from '@/hooks/useSession'
import { authApi, setMemoryToken } from '@/lib/api-client'
import { consumeMagicLink } from '@/lib/api/plans'
import { IS_CAPACITOR } from '@/lib/env'
import { trackEvent } from '@/lib/eventTracking'

function safeRedirect(target: string | null | undefined): string {
  // Only ever follow same-origin paths; the backend returns one, but never trust blindly.
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/discovery'
  return target
}

function MagicLinkContent() {
  const searchParams = useAppSearchParams()
  const token = searchParams.get('token')
  const next = searchParams.get('next')
  const router = useRouter()
  const queryClient = useQueryClient()
  const [consumeError, setError] = useState<string | null>(null)
  const consumedRef = useRef(false)
  const error = token ? consumeError : 'This link is missing its token. Open the link from your email again.'

  useEffect(() => {
    if (!token || consumedRef.current) return
    consumedRef.current = true

    const run = async () => {
      try {
        const result = await consumeMagicLink(token, next)
        if (IS_CAPACITOR && result.access_token) {
          setMemoryToken(result.access_token, result.refresh_token ?? undefined)
        }
        setLastTokenRefresh()
        try {
          const user = await authApi.me()
          if (user) {
            setLastKnownUser(user)
            queryClient.setQueryData(SESSION_QUERY_KEY, user)
          }
        } catch {
          // Session cookie is set; the session query will pick it up on the next screen.
        }
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
        trackEvent('magic_link_consumed')
        router.replace(safeRedirect(result.redirect))
      } catch (err) {
        const status = (err as { status?: number })?.status
        setError(
          status === 400 || status === 404
            ? 'This link has expired or was already used. Ask for a new one from your saved plan.'
            : "We couldn't sign you in just now. Try the link again in a moment.",
        )
      }
    }
    void run()
  }, [token, next, router, queryClient])

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--surface-base)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
      >
        {error ? (
          <>
            <XCircle size={40} className="mx-auto" style={{ color: 'var(--status-negative)' }} />
            <h1 className="mt-4 text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
              Link didn&apos;t work
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-body)' }}>
              {error}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full px-6 py-2.5 text-sm font-bold"
              style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
            >
              Sign in another way
            </Link>
          </>
        ) : (
          <>
            <Loader2
              size={40}
              className="mx-auto animate-spin"
              style={{ color: 'var(--accent-sky)' }}
              aria-hidden="true"
            />
            <h1 className="mt-4 text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
              Opening your plan…
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-body)' }} role="status">
              Signing you in and loading the numbers you saved.
            </p>
          </>
        )}
      </div>
    </main>
  )
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={null}>
      <MagicLinkContent />
    </Suspense>
  )
}
