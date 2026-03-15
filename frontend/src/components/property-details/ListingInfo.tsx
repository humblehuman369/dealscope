'use client'

import { PropertyData } from './types'
import { formatDate } from './utils'

interface ListingInfoProps {
  property: PropertyData
}

/**
 * ListingInfo Component
 * 
 * Key-value listing details. Labels use tertiary text,
 * values use primary text with semibold weight.
 */
export function ListingInfo({ property }: ListingInfoProps) {
  const hasListingInfo = property.listingAgent || property.listDate || property.mlsId

  if (!hasListingInfo) {
    return null
  }

  const cardStyle = {
    backgroundColor: 'var(--surface-card)',
    border: `1px solid var(--border-subtle)`,
    boxShadow: 'var(--shadow-card)',
  }

  const rows = [
    property.listingAgent?.name && { label: 'Listed By', value: property.listingAgent.name },
    property.listingAgent?.brokerage && { label: 'Brokerage', value: property.listingAgent.brokerage },
    property.listDate && { label: 'List Date', value: formatDate(property.listDate) },
    property.mlsId && { label: 'MLS #', value: property.mlsId },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="rounded-[14px] p-5" style={cardStyle}>
      <div className="text-xs font-bold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--accent-sky)' }}>
        Listing Information
      </div>

      <div className="space-y-0">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5"
            style={i < rows.length - 1 ? { borderBottom: `1px solid var(--border-subtle)` } : undefined}
          >
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * ListingInfoSkeleton
 * Loading state for listing information
 */
export function ListingInfoSkeleton() {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: 'var(--surface-card)', border: `1px solid var(--border-subtle)` }}
    >
      <div className="h-3 w-32 rounded animate-pulse mb-4" style={{ backgroundColor: 'var(--surface-elevated)' }} />
      <div className="space-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="flex items-center justify-between py-2"
            style={i < 3 ? { borderBottom: `1px solid var(--border-subtle)` } : undefined}
          >
            <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
            <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
