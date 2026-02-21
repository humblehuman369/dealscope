'use client'

/**
 * AuthGate — wraps content that requires a logged-in user (free or pro).
 *
 * Anonymous users see a "Sign in to …" prompt that opens the auth modal.
 * Use for: loan terms, comps, save property, full report (permission spec).
 *
 * Usage:
 *   <AuthGate feature="save this property">
 *     <SaveButton />
 *   </AuthGate>
 */

import React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { useSession } from '@/hooks/useSession'

interface AuthGateProps {
  children: React.ReactNode
  /** Short label for the prompt, e.g. "save this property", "view comps" */
  feature?: string
  /** "section" = blurred content + overlay CTA. "inline" = replace with sign-in link/button. */
  mode?: 'section' | 'inline'
  /** Custom fallback instead of default sign-in prompt */
  fallback?: React.ReactNode
}

export function AuthGate({ children, feature, mode = 'inline', fallback }: AuthGateProps) {
  const { isAuthenticated, isLoading } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = new URLSearchParams(searchParams.toString())
  params.set('auth', 'required')
  const fullPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname
  params.set('redirect', fullPath)
  const signInUrl = `${pathname}?${params.toString()}`

  if (isAuthenticated) return <>{children}</>

  if (isLoading) {
    return (
      <div className="opacity-30 pointer-events-none select-none animate-pulse">
        {children}
      </div>
    )
  }

  if (fallback) return <>{fallback}</>

  const label = feature ? `Sign in to ${feature}` : 'Sign in'

  if (mode === 'inline') {
    return (
      <Link
        href={signInUrl}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={{
          background: 'rgba(148,163,184,0.12)',
          border: '1px solid rgba(148,163,184,0.25)',
          color: '#94A3B8',
        }}
      >
        <LogIn size={12} />
        {label}
      </Link>
    )
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Link
          href={signInUrl}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: 'rgba(148,163,184,0.2)',
            border: '1px solid rgba(148,163,184,0.3)',
            color: '#e2e8f0',
          }}
        >
          <LogIn size={14} />
          {label}
        </Link>
      </div>
    </div>
  )
}
