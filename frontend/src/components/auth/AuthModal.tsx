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

  // Close when authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      setIsOpen(false)
      const redirect = searchParams.get('redirect')
      if (redirect) {
        router.push(redirect)
      }
    }
  }, [isAuthenticated, isOpen, searchParams, router])

  const close = useCallback(() => {
    setIsOpen(false)
    // Clean up URL params
    const url = new URL(window.location.href)
    url.searchParams.delete('auth')
    url.searchParams.delete('redirect')
    window.history.replaceState({}, '', url.toString())
  }, [])

  const onLoginSuccess = useCallback(() => {
    const redirect = searchParams.get('redirect') || '/dashboard'
    router.push(redirect)
    close()
  }, [searchParams, router, close])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
      role="dialog"
      aria-modal="true"
      aria-label={view === 'login' ? 'Sign in' : view === 'register' ? 'Create account' : 'Reset password'}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {view === 'login' && 'Sign In'}
            {view === 'register' && 'Create Account'}
            {view === 'forgot-password' && 'Reset Password'}
          </h2>
          <button
            onClick={close}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

// Export a hook for programmatic control
export function useAuthModal() {
  const open = useCallback((view: 'login' | 'register' = 'login') => {
    const url = new URL(window.location.href)
    url.searchParams.set('auth', view)
    window.history.pushState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])

  return { open }
}
