'use client'

/**
 * PropertyAddressBar — Compact address bar for analysis pages.
 *
 * Collapsed: clickable address link → property profile page, expand chevron.
 * Expanded:  single-row detail strip showing Beds | Baths | Sqft | Price | Status.
 * Dark theme to match the verdict page background.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { colors } from './verdict-design-tokens'

interface PropertyAddressBarProps {
  address: string
  city?: string
  state?: string
  zip?: string
  beds: number
  baths: number
  sqft: number
  price: number
  /** Listing status determines price label and status badge */
  listingStatus?: 'FOR_SALE' | 'PENDING' | 'SOLD' | 'OFF_MARKET' | string
  /** Property ID for the profile link */
  zpid?: string | number
}

function formatShortPrice(price: number): string {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`
  if (price >= 1_000) return `$${Math.round(price / 1_000)}K`
  return `$${price.toLocaleString()}`
}

export function PropertyAddressBar({
  address,
  city,
  state,
  zip,
  beds,
  baths,
  sqft,
  price,
  listingStatus,
  zpid,
}: PropertyAddressBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const fullAddress = [address, city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const encodedAddress = encodeURIComponent(fullAddress)

  // Determine price label and status from listing status
  const isListed = listingStatus === 'FOR_SALE' || listingStatus === 'PENDING'
  const priceLabel = isListed ? 'Asking' : 'Market'
  const statusLabel = isListed ? 'Listed' : 'Off-Market'

  // Build profile link
  const profileHref = zpid
    ? `/property/${zpid}?address=${encodedAddress}`
    : `/property?address=${encodedAddress}`

  return (
    <div
      className="border-b"
      style={{ backgroundColor: colors.background.card, borderColor: colors.ui.border }}
    >
      {/* Header row: address link + expand toggle */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <Link
          href={profileHref}
          className="text-sm font-medium truncate hover:underline transition-colors"
          style={{ color: colors.brand.teal }}
          title="View property profile"
        >
          {fullAddress}
        </Link>

        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="p-1 rounded transition-colors flex-shrink-0 ml-2"
          style={{ color: colors.text.tertiary }}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded detail strip — single row */}
      {isExpanded && (
        <div
          className="grid grid-cols-5 gap-1 px-4 pb-3 border-t"
          style={{ borderColor: colors.ui.border }}
        >
          <div className="text-center pt-2.5">
            <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: colors.text.muted }}>Beds</div>
            <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>{beds}</div>
          </div>
          <div className="text-center pt-2.5">
            <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: colors.text.muted }}>Baths</div>
            <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>{baths}</div>
          </div>
          <div className="text-center pt-2.5">
            <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: colors.text.muted }}>Sqft</div>
            <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>{sqft.toLocaleString()}</div>
          </div>
          <div className="text-center pt-2.5">
            <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: colors.text.muted }}>{priceLabel}</div>
            <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>{formatShortPrice(price)}</div>
          </div>
          <div className="text-center pt-2.5">
            <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: colors.text.muted }}>Status</div>
            <div className="text-sm font-semibold" style={{ color: isListed ? colors.status.positive : colors.text.secondary }}>
              {statusLabel}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyAddressBar
