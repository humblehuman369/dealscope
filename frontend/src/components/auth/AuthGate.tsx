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
  const cleanParams = new URLSearchParams(searchParams.toString())
  cleanParams.delete('auth')
  cleanParams.delete('redirect')
  const cleanQs = cleanParams.toString()
  const fullPath = cleanQs ? `${pathname}?${cleanQs}` : pathname
  const signInParams = new URLSearchParams(cleanQs)
  signInParams.set('auth', 'required')
  signInParams.set('redirect', fullPath)
  const signInUrl = `${pathname}?${signInParams.toString()}`

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
    <div className="relative overflow-hidden" style={{ maxHeight: 320 }}>
      <div className="blur-sm pointer-events-none select-none opacity-40">
        {children}
      </div>
      {/* Gradient fade — reinforces "there's more behind the gate" */}
      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #000)' }} />
      {/* CTA — pinned near top so it's immediately visible */}
      <div className="absolute inset-0 flex flex-col items-center pt-10">
        <Link
          href={signInUrl}
          className="flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-[1.03]"
          style={{
            background: '#0EA5E9',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(8,145,178,0.4)',
          }}
        >
          <LogIn size={15} />
          {label}
        </Link>
        <p className="mt-3 text-xs" style={{ color: '#64748B' }}>Free account — no credit card required</p>
      </div>
    </div>
  )
}
