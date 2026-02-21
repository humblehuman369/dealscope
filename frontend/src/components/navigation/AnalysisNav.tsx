'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'
import { SavePropertyButton } from '@/components/SavePropertyButton'
import type { PropertySnapshot } from '@/hooks/useSaveProperty'

/**
 * AnalysisNav — Persistent top navigation bar for the analysis flow.
 * Primary tabs: VerdictIQ and StrategyIQ (pill toggle).
 * Secondary tabs: Property Profile and Price (text links).
 * Preserves all search params when switching between pages.
 */
export function AnalysisNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = searchParams.toString()
  const address = searchParams.get('address') || ''

  const isVerdict = pathname === '/verdict'
  const isStrategy = pathname === '/strategy'

  // Resolve zpid and optional snapshot — check URL params first, then sessionStorage
  const zpidFromUrl = searchParams.get('zpid') || searchParams.get('propertyId') || ''
  const [zpid, setZpid] = useState(zpidFromUrl)
  const [propertySnapshot, setPropertySnapshot] = useState<PropertySnapshot | null>(null)

  useEffect(() => {
    if (zpidFromUrl) setZpid(zpidFromUrl)
    if (typeof window === 'undefined') return
    try {
      const stored = sessionStorage.getItem('dealMakerOverrides')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.zpid && !zpidFromUrl) setZpid(String(parsed.zpid))
        if (address && (parsed.beds != null || parsed.zpid != null)) {
          setPropertySnapshot({
            bedrooms: parsed.beds,
            bathrooms: parsed.baths,
            sqft: parsed.sqft,
            listPrice: parsed.price,
            zpid: parsed.zpid != null ? String(parsed.zpid) : undefined,
          })
        } else {
          setPropertySnapshot(null)
        }
      } else {
        setPropertySnapshot(null)
      }
    } catch { /* ignore */ }
  }, [zpidFromUrl, address])

  // Only show on analysis pages
  if (!isVerdict && !isStrategy) return null

  const primaryTabs = [
    { label: 'VerdictIQ', href: `/verdict?${params}`, active: isVerdict, icon: verdictIcon },
    { label: 'StrategyIQ', href: `/strategy?${params}`, active: isStrategy, icon: strategyIcon },
  ]

  // Build secondary nav links (Property Profile needs zpid)
  const encodedAddress = encodeURIComponent(address)
  const propertyHref = zpid
    ? `/property/${zpid}?address=${encodedAddress}`
    : address ? `/search?q=${encodedAddress}` : '/search'
  const priceHref = address ? `/price-intel?address=${encodedAddress}` : '/search'

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
        <Link href="/" className="flex items-center gap-0.5 text-sm font-bold shrink-0" style={{ color: colors.text.secondary }}>
          <span style={{ color: colors.text.body }}>DealGap</span>
          <span style={{ color: colors.brand.blue }}>IQ</span>
        </Link>

        {/* Center: pill toggle + secondary text links */}
        <div className="flex items-center gap-5">
          {/* Primary pill toggle */}
          <div className="flex items-center gap-0.5 bg-slate-900/60 rounded-full p-0.5">
            {primaryTabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all"
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

          {/* Secondary text links */}
          <Link
            href={propertyHref}
            className="text-[11px] font-medium transition-colors hover:text-slate-200"
            style={{ color: colors.text.muted }}
          >
            Property
          </Link>
          <Link
            href={priceHref}
            className="text-[11px] font-medium transition-colors hover:text-slate-200"
            style={{ color: colors.text.muted }}
          >
            Price
          </Link>
        </div>

        {/* Right: Save Property + icon actions */}
        <div className="flex items-center gap-3">
          {address && (
            <SavePropertyButton
              displayAddress={address}
              propertySnapshot={propertySnapshot}
              compact
            />
          )}
          <Link
            href="/search"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: colors.text.muted }}
            aria-label="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>
          <Link
            href="/search"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: colors.text.muted }}
            aria-label="Dashboard"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  )
}

const verdictIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const strategyIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)
