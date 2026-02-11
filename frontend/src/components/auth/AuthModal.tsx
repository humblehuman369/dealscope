'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import ForgotPasswordForm from './ForgotPasswordForm'
import { useSession } from '@/hooks/useSession'

type View = 'login' | 'register' | 'forgot-password'

export default function AuthModal() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useSession()
  const [view, setView] = useState<View>('login')
  const [isOpen, setIsOpen] = useState(false)

  // Open modal from URL params (?auth=login or ?auth=register)
  useEffect(() => {
    const authParam = searchParams.get('auth')
    if (authParam === 'login' || authParam === 'register' || authParam === 'required') {
      if (!isAuthenticated) {
        setView(authParam === 'register' ? 'register' : 'login')
        setIsOpen(true)
      }
    }
  }, [searchParams, isAuthenticated])

  // Auto-close when auth state changes while modal is open
  // (e.g. session restored from another tab, or cookie-based auth detected).
  //
  // IMPORTANT: We only close the modal here — we do NOT navigate.
  // Navigation is handled exclusively by onLoginSuccess to avoid
  // two competing router.replace() calls racing each other.
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      setIsOpen(false)
    }
  }, [isAuthenticated, isOpen])

  // Dismiss modal (X button or backdrop click) — stay on current page
  const close = useCallback(() => {
    setIsOpen(false)
    // Strip only the auth param, preserving all others (e.g. address)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('auth')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  // Post-login redirect — navigate to the intended destination
  const onLoginSuccess = useCallback(() => {
    const redirect = searchParams.get('redirect')
    setIsOpen(false)
    if (redirect) {
      // Explicit redirect target — honour it
      router.replace(redirect)
    } else {
      // No explicit redirect — stay on current page, strip only auth/redirect params
      const params = new URLSearchParams(searchParams.toString())
      params.delete('auth')
      params.delete('redirect')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [searchParams, router, pathname])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
      role="dialog"
      aria-modal="true"
      aria-label={view === 'login' ? 'Sign in' : view === 'register' ? 'Create account' : 'Reset password'}
    >
      <div className="w-full max-w-md bg-navy-800 rounded-2xl shadow-xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-white">
            {view === 'login' && 'Sign In'}
            {view === 'register' && 'Create Account'}
            {view === 'forgot-password' && 'Reset Password'}
          </h2>
          <button
            onClick={close}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-2">
          {view === 'login' && (
            <LoginForm
              onSuccess={onLoginSuccess}
              onForgotPassword={() => setView('forgot-password')}
              onSwitchToRegister={() => setView('register')}
            />
          )}
          {view === 'register' && (
            <RegisterForm
              onSuccess={() => setView('login')}
              onSwitchToLogin={() => setView('login')}
            />
          )}
          {view === 'forgot-password' && (
            <ForgotPasswordForm
              onBack={() => setView('login')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

