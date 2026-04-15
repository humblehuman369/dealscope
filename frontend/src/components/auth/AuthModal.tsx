'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import ForgotPasswordForm from './ForgotPasswordForm'
import { useSession } from '@/hooks/useSession'
import { IS_CAPACITOR } from '@/lib/env'

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
    const params = new URLSearchParams(searchParams.toString())
    params.delete('auth')
    params.delete('redirect')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  // Post-login redirect — navigate to the intended destination.
  // searchParams.get() already URL-decodes the value — do NOT
  // call decodeURIComponent again (double-decoding corrupts
  // addresses with encoded commas/spaces, causing wrong-page redirects).
  const onLoginSuccess = useCallback(() => {
    const redirect = searchParams.get('redirect')
    setIsOpen(false)
    if (redirect) {
      const isSameOriginPath = redirect.startsWith('/') && !redirect.startsWith('//')
      if (isSameOriginPath) {
        router.replace(redirect)
      } else {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('auth')
        params.delete('redirect')
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }
    } else {
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
      <div className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
            {view === 'login' && 'Sign In'}
            {view === 'register' && 'Create Account'}
            {view === 'forgot-password' && 'Reset Password'}
          </h2>
          <button
            onClick={close}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: '#94A3B8' }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-2">
          {(view === 'login' || view === 'register') && (
            <>
              {/* Sign in with Apple */}
              <button
                type="button"
                onClick={async () => {
                  if (IS_CAPACITOR) {
                    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
                    const { Browser } = await import('@capacitor/browser')
                    const mobileRedirect = encodeURIComponent('dealgapiq://auth/callback')
                    await Browser.open({ url: `${base}/api/v1/auth/apple?mobile_redirect=${mobileRedirect}` })
                  } else {
                    window.location.href = '/api/v1/auth/apple'
                  }
                }}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(148,163,184,0.15)',
                  borderRadius: '8px',
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontFamily: 'inherit',
                  marginBottom: '10px',
                  transition: 'background 0.2s',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#000000">
                  <path d="M11.182 0c.223 1.05-.304 2.1-.96 2.852-.66.753-1.732 1.332-2.79 1.256-.255-1.014.374-2.08.994-2.738C9.073.666 10.228.112 11.182 0zm2.725 5.348c-.147.09-2.187 1.272-2.164 3.793.027 3.013 2.647 4.013 2.68 4.026-.022.065-.418 1.432-1.38 2.836-.83 1.213-1.69 2.424-3.047 2.448-1.332.024-1.762-.79-3.286-.79-1.525 0-2 .766-3.264.814-1.31.048-2.308-1.312-3.147-2.52C1.82 13.51.39 9.912.39 6.498.39 3.555 2.312 1.985 4.196 1.958c1.285-.024 2.498.867 3.283.867.784 0 2.256-1.073 3.803-.915.648.027 2.468.262 3.637 1.97-.094.058-.012.007-.012.007l-.001-.001.001.462z"/>
                </svg>
                {view === 'login' ? 'Sign in with Apple' : 'Sign up with Apple'}
              </button>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={async () => {
                  if (IS_CAPACITOR) {
                    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
                    const { Browser } = await import('@capacitor/browser')
                    const mobileRedirect = encodeURIComponent('dealgapiq://auth/callback')
                    await Browser.open({ url: `${base}/api/v1/auth/google?mobile_redirect=${mobileRedirect}` })
                  } else {
                    window.location.href = '/api/v1/auth/google'
                  }
                }}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: 'rgba(148,163,184,0.06)',
                  border: '1px solid rgba(148,163,184,0.1)',
                  borderRadius: '8px',
                  color: '#CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontFamily: 'inherit',
                  marginBottom: '16px',
                  transition: 'background 0.2s',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M15.68 8.18c0-.57-.05-1.12-.15-1.64H8v3.1h4.3a3.68 3.68 0 01-1.6 2.42v2h2.58c1.51-1.4 2.38-3.45 2.38-5.88z" fill="#4285F4" />
                  <path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2a4.84 4.84 0 01-7.22-2.54H.88v2.06A8 8 0 008 16z" fill="#34A853" />
                  <path d="M3.49 9.52a4.8 4.8 0 010-3.04V4.42H.88a8 8 0 000 7.16l2.6-2.06z" fill="#FBBC05" />
                  <path d="M8 3.16a4.33 4.33 0 013.07 1.2l2.3-2.3A7.72 7.72 0 008 0 8 8 0 00.88 4.42l2.6 2.06A4.77 4.77 0 018 3.16z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 16px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(148,163,184,0.08)' }} />
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(148,163,184,0.08)' }} />
              </div>
            </>
          )}

          {view === 'login' && (
            <LoginForm
              onSuccess={onLoginSuccess}
              onForgotPassword={() => setView('forgot-password')}
              onSwitchToRegister={() => setView('register')}
            />
          )}
          {view === 'register' && (
            <RegisterForm
              onSuccess={onLoginSuccess}
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

