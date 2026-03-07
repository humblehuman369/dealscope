'use client'

/**
 * PropertyAddressBar — Single-line, always-visible address bar for analysis pages.
 *
 * Shows address + property details (Beds · Baths · Sqft · Price · Status) inline.
 * No dropdown, no toggle. One persistent horizontal bar.
 * Dark theme (#000000) with accent #0EA5E9.
 */

import React, { useState } from 'react'
import Link from 'next/link'

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
  /** Optional controlled bookmark (e.g. from AppHeader save-property) */
  bookmarked?: boolean
  onBookmarkClick?: () => void
}

function formatShortPrice(price: number): string {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`
  if (price >= 1_000) return `$${Math.round(price / 1_000)}K`
  return `$${price.toLocaleString()}`
}

/** Safely decode a string that might be URL-encoded (single or double). */
function safeDecode(s: string | undefined): string {
  if (!s) return ''
  try {
    let decoded = s
    for (let i = 0; i < 2; i++) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
    return decoded
  } catch {
    return s
  }
}

function StatusText({ status }: { status: string }) {
  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#0EA5E9',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  )
}

function DetailItem({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      {label ? (
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#71717A',
          }}
        >
          {label}
        </span>
      ) : null}
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: accent ? '#0EA5E9' : '#FFFFFF',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function Dot() {
  return (
    <span
      style={{
        width: 3,
        height: 3,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        flexShrink: 0,
      }}
    />
  )
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
  bookmarked: bookmarkedProp,
  onBookmarkClick,
}: PropertyAddressBarProps) {
  const [internalBookmarked, setInternalBookmarked] = useState(false)
  const isControlled = onBookmarkClick != null
  const bookmarked = isControlled ? (bookmarkedProp ?? false) : internalBookmarked
  const handleBookmarkClick = isControlled
    ? () => onBookmarkClick?.()
    : () => setInternalBookmarked((v) => !v)

  const cleanAddress = safeDecode(address)
  const cleanCity = safeDecode(city)
  const cleanState = safeDecode(state)
  const cleanZip = safeDecode(zip)
  const fullAddress = [cleanAddress, cleanCity, [cleanState, cleanZip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const encodedAddress = encodeURIComponent(fullAddress)

  const isListed = listingStatus === 'FOR_SALE' || listingStatus === 'PENDING'
  const statusLabel = isListed ? 'Listed' : 'Off-Market'

  const profileHref = zpid
    ? `/property/${zpid}?address=${encodedAddress}`
    : `/property?address=${encodedAddress}`

  return (
    <div
      style={{
        background: '#000000',
        fontFamily: "'DM Sans', sans-serif",
        padding: '0 24px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(14,165,233,0.12)',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: House icon + Address link */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
            flex: '0 1 auto',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M2 7.5L8 2.5L14 7.5V13.5C14 14.05 13.55 14.5 13 14.5H3C2.45 14.5 2 14.05 2 13.5V7.5Z"
              stroke="#0EA5E9"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M6 14.5V8.5H10V14.5"
              stroke="#0EA5E9"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <Link
            href={profileHref}
            title="View property profile"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textDecoration: 'none',
            }}
            className="hover:underline"
          >
            {fullAddress}
          </Link>
        </div>

        {/* Center: Inline details with dot separators */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flex: '1 1 auto',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <DetailItem label="Beds" value={beds} />
          <Dot />
          <DetailItem label="Ba" value={baths} />
          <Dot />
          <DetailItem label="Sqft" value={sqft.toLocaleString()} />
          <Dot />
          <DetailItem label="" value={formatShortPrice(price)} accent />
          <Dot />
          <StatusText status={statusLabel} />
        </div>

        {/* Right: Bookmark */}
        <button
          type="button"
          onClick={handleBookmarkClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRadius: 6,
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(14,165,233,0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
          }}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark property'}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark property'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill={bookmarked ? '#0EA5E9' : 'none'}>
            <path
              d="M4.5 2.25H13.5C13.91 2.25 14.25 2.59 14.25 3V16.5L9 13.125L3.75 16.5V3C3.75 2.59 4.09 2.25 4.5 2.25Z"
              stroke="#0EA5E9"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default PropertyAddressBar
