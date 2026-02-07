'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/lib/env'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) return
    
    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      // Always show success to prevent email enumeration
      setStatus('success')
      setMessage(data.message || 'If an account exists with that email, a reset link has been sent.')
    } catch (err) {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-xl p-8">
          {status === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">
                Check Your Email
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {message}
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Didn't receive an email? Check your spam folder or{' '}
                <button
                  onClick={() => {
                    setStatus('idle')
                    setEmail('')
                  }}
                  className="text-brand-500 hover:text-brand-600"
                >
                  try again
                </button>
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-colors"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-brand-500" />
                </div>
                <h1 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">
                  Forgot Password?
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  No worries, we'll send you reset instructions.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-xl text-navy-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-500">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                Remember your password?{' '}
                <Link href="/" className="text-brand-500 hover:text-brand-600 font-medium">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

