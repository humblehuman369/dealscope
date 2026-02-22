'use client'

/**
 * ProGate — wraps Pro-only features.
 *
 * Cascaded gating:
 *   Anonymous → sign-in prompt (delegates to AuthGate)
 *   Free      → upgrade prompt (UpgradeModal / Stripe checkout)
 *   Pro       → children rendered as-is
 *
 * Usage:
 *   <ProGate feature="Excel Proforma">
 *     <DownloadExcelButton />
 *   </ProGate>
 */

import React, { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSubscription } from '@/hooks/useSubscription'
import { useSession } from '@/hooks/useSession'
import { Lock, LogIn } from 'lucide-react'
import { UpgradeModal } from '@/components/billing/UpgradeModal'

interface ProGateProps {
  children: React.ReactNode
  feature?: string
  /** "section" blurs content with overlay. "inline" replaces with upgrade button. */
  mode?: 'section' | 'inline'
  /** Custom fallback instead of default upgrade prompt */
  fallback?: React.ReactNode
}

export function ProGate({ children, feature, mode = 'inline', fallback }: ProGateProps) {
  const { isPro, isLoading: subLoading } = useSubscription()
  const { isAuthenticated, isLoading: sessionLoading } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  if (isPro) return <>{children}</>

  const isLoading = sessionLoading || subLoading

  if (isLoading) {
    return (
      <div className="opacity-30 pointer-events-none select-none animate-pulse">
        {children}
      </div>
    )
  }

  if (fallback) return <>{fallback}</>

  // Anonymous user → show sign-in prompt (not upgrade prompt)
  if (!isAuthenticated) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('auth', 'required')
    const fullPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname
    params.set('redirect', fullPath)
    const signInUrl = `${pathname}?${params.toString()}`

    const label = feature ? `Sign in to unlock ${feature}` : 'Sign in'

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

  // Authenticated free user → show upgrade prompt
  const openUpgrade = () => setUpgradeModalOpen(true)

  if (mode === 'inline') {
    return (
      <>
        <button
          type="button"
          onClick={openUpgrade}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{
            background: 'rgba(14,165,233,0.08)',
            border: '1px solid rgba(14,165,233,0.2)',
            color: '#0EA5E9',
          }}
        >
          <Lock size={12} />
          {feature ? `${feature} — Pro` : 'Upgrade to Pro'}
        </button>
        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          returnTo={pathname}
        />
      </>
    )
  }

  return (
    <>
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={openUpgrade}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
              color: '#fff',
            }}
          >
            <Lock size={14} />
            {feature ? `Unlock ${feature}` : 'Upgrade to Pro'}
          </button>
        </div>
      </div>
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        returnTo={pathname}
      />
    </>
  )
}
