'use client'

/**
 * Checkout success — shown after Stripe redirect with session_id.
 * Polls subscription until Pro is active, then redirects to returnTo (or default).
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import Link from 'next/link'

const POLL_INTERVAL_MS = 1500
const POLL_MAX_ATTEMPTS = 20

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const returnTo = searchParams.get('returnTo') || '/'

  const [status, setStatus] = useState<'loading' | 'success' | 'timeout'>('loading')

  useEffect(() => {
    if (!sessionId) {
      setStatus('success')
      return
    }

    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const sub = await api.get<{ tier: string }>('/api/v1/billing/subscription')
        if (sub.tier === 'pro') {
          setStatus('success')
          clearInterval(interval)
          const path = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
          setTimeout(() => router.replace(path), 1200)
          return
        }
      } catch {
        // ignore
      }
      if (attempts >= POLL_MAX_ATTEMPTS) {
        setStatus('timeout')
        clearInterval(interval)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [sessionId, returnTo, router])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#0B1120', color: '#E2E8F0' }}
    >
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-14 h-14 mx-auto mb-6 text-sky-500 animate-spin" />
            <h1 className="text-xl font-bold text-white mb-2">Setting up your subscription</h1>
            <p className="text-sm text-slate-400">You’re being redirected in a moment…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-14 h-14 mx-auto mb-6 text-green-500" />
            <h1 className="text-xl font-bold text-white mb-2">You’re now Pro</h1>
            <p className="text-sm text-slate-400 mb-6">
              Welcome to DealGapIQ Pro. Redirecting you now…
            </p>
            <Link
              href={returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'}
              className="text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              Continue without waiting
            </Link>
          </>
        )}
        {status === 'timeout' && (
          <>
            <CheckCircle className="w-14 h-14 mx-auto mb-6 text-green-500" />
            <h1 className="text-xl font-bold text-white mb-2">Payment received</h1>
            <p className="text-sm text-slate-400 mb-6">
              Your Pro access may take a moment to activate. If you don’t see it, refresh the page or open Billing.
            </p>
            <Link
              href={returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'}
              className="inline-block px-5 py-2.5 rounded-lg font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
            >
              Continue
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
