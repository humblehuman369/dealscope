'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = []
    if (pwd.length < 8) errors.push('At least 8 characters')
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter')
    if (!/[0-9]/.test(pwd)) errors.push('One number')
    return errors
  }

  const passwordErrors = validatePassword(password)
  const passwordsMatch = password === confirmPassword
  const isValid = password && confirmPassword && passwordErrors.length === 0 && passwordsMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValid || !token) return
    
    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Password reset successfully!')
      } else {
        setStatus('error')
        setMessage(data.detail || 'Reset failed. The link may have expired.')
      }
    } catch (err) {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-colors"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    )
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
                Password Reset! 🎉
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {message}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-colors"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-brand-500" />
                </div>
                <h1 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">
                  Reset Password
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-xl text-navy-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password requirements */}
                  {password && (
                    <div className="mt-2 space-y-1">
                      {['At least 8 characters', 'One uppercase letter', 'One number'].map((req, i) => {
                        const passed = !passwordErrors.includes(req)
                        return (
                          <p key={i} className={`text-xs flex items-center gap-1 ${passed ? 'text-green-500' : 'text-gray-400'}`}>
                            {passed ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-gray-300" />}
                            {req}
                          </p>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-navy-700 border rounded-xl text-navy-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                      confirmPassword && !passwordsMatch
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-gray-200 dark:border-navy-600'
                    }`}
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-xs text-red-500">Passwords don't match</p>
                  )}
                </div>

                {status === 'error' && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !isValid}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

