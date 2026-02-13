'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

/**
 * AnalysisNav — Persistent top navigation bar for the analysis flow.
 * Shows two tabs: VerdictIQ (screen) and StrategyIQ (deep dive).
 * Preserves all search params when switching between pages.
 */
export function AnalysisNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = searchParams.toString()

  const isVerdict = pathname === '/verdict'
  const isStrategy = pathname === '/strategy'

  // Only show on analysis pages
  if (!isVerdict && !isStrategy) return null

  const tabs = [
    { label: 'VerdictIQ', href: `/verdict?${params}`, active: isVerdict, icon: verdictIcon },
    { label: 'StrategyIQ', href: `/strategy?${params}`, active: isStrategy, icon: strategyIcon },
  ]

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{
        background: 'rgba(0,0,0,0.85)',
        borderColor: colors.ui.border,
      }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-12">
        {/* Logo / home link */}
        <Link href="/" className="flex items-center gap-1 text-sm font-bold shrink-0" style={{ color: colors.text.secondary }}>
          <span style={{ color: colors.text.body }}>Invest</span>
          <span style={{ color: colors.brand.blue }}>IQ</span>
        </Link>

        {/* Tab pills */}
        <div className="flex items-center gap-1 bg-slate-900/60 rounded-full p-0.5">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: tab.active ? colors.brand.blueDeep : 'transparent',
                color: tab.active ? '#fff' : colors.text.muted,
              }}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Right spacer — could hold actions in the future */}
        <div className="w-14" />
      </div>
    </nav>
  )
}

const verdictIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const strategyIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)
