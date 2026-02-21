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
 * with an upgrade CTA that opens UpgradeModal (Stripe checkout).
 * Use `inline` mode for buttons instead of sections.
 */

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSubscription } from '@/hooks/useSubscription'
import { Lock } from 'lucide-react'
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
  const { isPro, isLoading } = useSubscription()
  const pathname = usePathname()
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

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
