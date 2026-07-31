'use client'

/**
 * ProGate — wraps content that requires an active Pro subscription.
 *
 * - Anonymous users are asked to sign in first (delegates to AuthGate).
 * - Free-tier users see the content blurred with an "Upgrade to Pro" CTA,
 *   so the gate previews the exact artifact it is selling.
 * - Pro subscribers (and admins) see the content.
 *
 * Usage:
 *   <ProGate feature="use the Deal Maker worksheet" mode="section">
 *     <DealMakerScreen ... />
 *   </ProGate>
 */

import React from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { AuthGate } from '@/components/auth/AuthGate'

interface ProGateProps {
  children: React.ReactNode
  /** Short label for the prompt, e.g. "use the Deal Maker worksheet" */
  feature?: string
  /** "section" = blurred content + overlay CTA. "inline" = replace with upgrade link. */
  mode?: 'section' | 'inline'
  /** When true (section mode), child fills the parent height instead of capping. */
  fullHeight?: boolean
}

export function ProGate({ children, feature, mode = 'inline', fullHeight }: ProGateProps) {
  const { user, isAuthenticated, isLoading, isAdmin } = useSession()

  // Sign-in comes first — AuthGate handles the anonymous + loading states.
  if (!isAuthenticated || isLoading) {
    return (
      <AuthGate feature={feature} mode={mode} fullHeight={fullHeight}>
        {children}
      </AuthGate>
    )
  }

  const isPro = user?.subscription_tier === 'pro' || isAdmin
  if (isPro) {
    return <div className={fullHeight ? 'h-full min-h-0' : undefined}>{children}</div>
  }

  const label = feature ? `Upgrade to Pro to ${feature}` : 'Upgrade to Pro'

  if (mode === 'inline') {
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
        style={{
          background: 'rgba(8,145,178,0.12)',
          border: '1px solid rgba(8,145,178,0.35)',
          color: 'var(--accent-sky)',
        }}
      >
        <Sparkles size={12} />
        {label}
      </Link>
    )
  }

  return (
    <div
      className={`relative overflow-hidden${fullHeight ? ' h-full min-h-0' : ''}`}
      style={fullHeight ? undefined : { maxHeight: 560 }}
    >
      <div
        className={`blur-sm pointer-events-none select-none opacity-40${fullHeight ? ' h-full min-h-0' : ''}`}
      >
        {children}
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--surface-base))' }}
      />
      <div className="absolute inset-0 flex flex-col items-center pt-6 sm:pt-8 px-2">
        <Link
          href="/pricing"
          className="flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-[1.03]"
          style={{
            background: 'var(--accent-sky)',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(8,145,178,0.4)',
          }}
        >
          <Sparkles size={15} />
          {label}
        </Link>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-label)' }}>
          7-day free trial — cancel anytime
        </p>
      </div>
    </div>
  )
}
