'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { authApi } from '@/lib/api-client'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error')
        setMessage('No verification token provided')
        return
      }

      try {
        const data = await authApi.verifyEmail(token)
        setStatus('success')
        setMessage(data.message || 'Email verified successfully!')
      } catch (err) {
        setStatus('error')
        if (err instanceof Error && 'status' in err) {
          setMessage((err as any).message || 'Verification failed')
        } else {
          setMessage('Network error. Please try again.')
        }
      }
    }

    verifyEmail()
  }, [token])

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
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">
                Verifying your email...
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">
                Email Verified!
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Your email has been verified successfully. You can now sign in to your account.
              </p>
              <Link
                href="/?auth=login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-colors"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">
                Verification Failed
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {message}
              </p>

              {/* Resend verification form */}
              <div className="mt-4 mb-6 space-y-3">
                <p className="text-sm text-gray-400">
                  Link expired? Enter your email to get a new one:
                </p>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-navy-900 border border-navy-700 text-white placeholder:text-gray-500"
                />
                <button
                  onClick={handleResend}
                  disabled={resendStatus !== 'idle' || !resendEmail.includes('@')}
                  className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors text-sm"
                >
                  {resendStatus === 'idle' && 'Resend Verification Email'}
                  {resendStatus === 'sending' && 'Sending...'}
                  {resendStatus === 'sent' && 'Check your inbox'}
                </button>
              </div>

              <div className="space-y-3">
                <Link
                  href="/?auth=login"
                  className="inline-flex items-center gap-2 px-6 py-3 text-brand-500 hover:text-brand-400 font-semibold transition-colors text-sm"
                >
                  Back to Sign In
                </Link>
                <p className="text-sm text-gray-400">
                  Need help?{' '}
                  <a href="mailto:support@dealgapiq.com" className="text-brand-500 hover:text-brand-600">
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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

