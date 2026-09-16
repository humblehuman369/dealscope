'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useAppSearchParams } from '@/hooks/useAppNavigation'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { authApi } from '@/lib/api-client'
import {
  applyVerifySession,
  clearAuthWaiting,
  isAuthWaitingInThisTab,
  postSignedIn,
  safePostLoginPath,
} from '@/lib/authWaiting'
import { trackEvent } from '@/lib/eventTracking'

function SignedInCard({ href }: { href: string }) {
  return (
    <>
      <div
        className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
        style={{ background: 'color-mix(in srgb, var(--status-positive) 16%, var(--surface-card))' }}
      >
        <CheckCircle className="w-8 h-8" style={{ color: 'var(--status-positive)' }} />
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
        You&apos;re signed in
      </h1>
      <p className="mb-6" style={{ color: 'var(--text-body)' }}>
        You can close this tab and go back to where you were.
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
        style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
      >
        Continue here
        <ArrowRight className="w-4 h-4" />
      </Link>
    </>
  )
}

function VerifyEmailContent() {
  const searchParams = useAppSearchParams()
  const token = searchParams.get('token')
  const next = searchParams.get('next')
  const router = useRouter()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<'loading' | 'error' | 'signed-in'>('loading')
  const [message, setMessage] = useState('')
  const [continueHref, setContinueHref] = useState('/onboarding')
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const consumedRef = useRef(false)

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error')
        setMessage('No verification token provided')
        return
      }
      if (consumedRef.current) return
      consumedRef.current = true

      try {
        const data = await authApi.verifyEmail(token, next)
        await applyVerifySession(data, queryClient)
        trackEvent('email_verified', { method: 'link' })
        postSignedIn()
        const dest = safePostLoginPath(data.redirect)
        setContinueHref(dest)
        if (isAuthWaitingInThisTab()) {
          clearAuthWaiting()
          router.replace(dest)
          return
        }
        setStatus('signed-in')
      } catch (err) {
        setStatus('error')
        if (err instanceof Error && 'status' in err) {
          setMessage((err as { message?: string }).message || 'Verification failed')
        } else {
          setMessage('Network error. Please try again.')
        }
      }
    }

    void verifyEmail()
  }, [token, next, router, queryClient])

  const handleResend = async () => {
    if (!resendEmail || !resendEmail.includes('@')) return
    setResendStatus('sending')
    try {
      await authApi.resendVerification(resendEmail)
      setResendStatus('sent')
    } catch {
      setResendStatus('idle')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--surface-base)' }}
    >
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
        >
          {status === 'loading' && (
            <>
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{
                  background: 'color-mix(in srgb, var(--accent-sky) 16%, var(--surface-card))',
                }}
              >
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-sky)' }} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
                Verifying your email...
              </h1>
              <p style={{ color: 'var(--text-body)' }}>
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {status === 'signed-in' && <SignedInCard href={continueHref} />}

          {status === 'error' && (
            <>
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{
                  background: 'color-mix(in srgb, var(--status-negative) 16%, var(--surface-card))',
                }}
              >
                <XCircle className="w-8 h-8" style={{ color: 'var(--status-negative)' }} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
                Verification Failed
              </h1>
              <p className="mb-4" style={{ color: 'var(--text-body)' }}>
                {message}
              </p>

              <div className="mt-4 mb-6 space-y-3">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Link expired? Enter your email to get a new one:
                </p>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus-visible:ring-2"
                  style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-heading)',
                  }}
                />
                <button
                  onClick={handleResend}
                  disabled={resendStatus !== 'idle' || !resendEmail.includes('@')}
                  className="w-full px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
                >
                  {resendStatus === 'idle' && 'Resend Verification Email'}
                  {resendStatus === 'sending' && 'Sending...'}
                  {resendStatus === 'sent' && 'Check your inbox'}
                </button>
              </div>

              <div className="space-y-3">
                <Link
                  href="/?auth=login"
                  className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm"
                  style={{ color: 'var(--accent-sky)' }}
                >
                  Back to Sign In
                </Link>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Need help?{' '}
                  <a href="mailto:support@dealgapiq.com" style={{ color: 'var(--accent-sky)' }}>
                    Contact Support
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--surface-base)' }}
        >
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-sky)' }} />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
