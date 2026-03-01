'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = searchParams.get('redirect') || searchParams.get('returnTo')

  const getPostLoginPath = () => {
    if (!redirect) return '/search'
    try {
      const decoded = decodeURIComponent(redirect)
      if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded
    } catch {
      /* ignore */
    }
    return '/search'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B1120',
        color: '#E2E8F0',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(148,163,184,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Nav */}
        <nav
          className="px-4 sm:px-10 py-4"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1200px',
            margin: '0 auto',
            borderBottom: '1px solid rgba(148,163,184,0.06)',
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: '17px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#F1F5F9',
              textDecoration: 'none',
            }}
          >
            DealGap<span style={{ color: '#0EA5E9' }}>IQ</span>
          </Link>

          <Link
            href="/register"
            style={{
              fontSize: '12px',
              color: '#0EA5E9',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Create an account
          </Link>
        </nav>

        {/* Main content */}
        <section
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '80px 24px 120px',
            maxWidth: '480px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(168deg, rgba(14,165,233,0.02) 0%, #0D1424 100%)',
              border: '1px solid rgba(148,163,184,0.06)',
              borderRadius: '12px',
              padding: '36px',
              width: '100%',
            }}
          >
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#F1F5F9',
                letterSpacing: '-0.025em',
                margin: '0 0 6px',
              }}
            >
              Welcome back
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#94A3B8',
                margin: '0 0 28px',
                lineHeight: 1.5,
              }}
            >
              Sign in to continue to DealGapIQ.
            </p>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={() => {
                const base =
                  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
                    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
                    : ''
                const url = base ? `${base}/api/v1/auth/google` : '/api/v1/auth/google'
                window.location.href = url
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
                marginBottom: '20px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 20px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(148,163,184,0.08)' }} />
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(148,163,184,0.08)' }} />
            </div>

            <LoginForm
              onSuccess={() => router.replace(getPostLoginPath())}
              onForgotPassword={() => router.push('/forgot-password')}
              onSwitchToRegister={() => router.push('/register')}
            />
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid rgba(148,163,184,0.06)',
            padding: '24px 40px',
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#475569' }}>
            &copy; 2026 DealGapIQ. Professional use only. Not a lender.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link href="/privacy" style={{ fontSize: '11px', color: '#475569', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: '11px', color: '#475569', textDecoration: 'none' }}>Terms</Link>
            <Link href="/help" style={{ fontSize: '11px', color: '#475569', textDecoration: 'none' }}>Support</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default function LoginContent() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
