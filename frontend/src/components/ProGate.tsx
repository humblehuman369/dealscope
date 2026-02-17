'use client'

/**
 * ProGate — wraps Pro-only features with an upgrade prompt for free users.
 *
 * Usage:
 *   <ProGate feature="Excel Proforma">
 *     <DownloadExcelButton />
 *   </ProGate>
 *
 * Pro users see children as-is. Free users see a blurred overlay
 * with an upgrade CTA. Use `inline` mode for buttons instead of sections.
 */

import React from 'react'
import Link from 'next/link'
import { useSubscription } from '@/hooks/useSubscription'
import { Lock } from 'lucide-react'

interface ProGateProps {
  children: React.ReactNode
  feature?: string
  /** "section" blurs content with overlay. "inline" replaces with upgrade button. */
  mode?: 'section' | 'inline'
  /** Custom fallback instead of default upgrade prompt */
  fallback?: React.ReactNode
}

export function ProGate({ children, feature, mode = 'inline', fallback }: ProGateProps) {
  const { isPro, isLoading } = useSubscription()

  if (isPro) return <>{children}</>

  // While session is loading, show a muted skeleton instead of flashing Pro content
  if (isLoading) {
    return (
      <div className="opacity-30 pointer-events-none select-none animate-pulse">
        {children}
      </div>
    )
  }

  if (fallback) return <>{fallback}</>

  if (mode === 'inline') {
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={{
          background: 'rgba(14,165,233,0.08)',
          border: '1px solid rgba(14,165,233,0.2)',
          color: '#0EA5E9',
        }}
      >
        <Lock size={12} />
        {feature ? `${feature} — Pro` : 'Upgrade to Pro'}
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
          href="/pricing"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
            color: '#fff',
          }}
        >
          <Lock size={14} />
          {feature ? `Unlock ${feature}` : 'Upgrade to Pro'}
        </Link>
      </div>
    </div>
  )
}
