'use client'

import { PropertyData } from './types'
import { formatDate } from './utils'

interface ListingInfoProps {
  property: PropertyData
}

/**
 * ListingInfo — Horizontal label-value pairs matching the address-bar detail panel.
 */
export function ListingInfo({ property }: ListingInfoProps) {
  const rows = [
    property.listingAgent?.name && { label: 'Listed By', value: property.listingAgent.name },
    property.listingAgent?.brokerage && { label: 'Brokerage', value: property.listingAgent.brokerage },
    property.listDate && { label: 'List Date', value: formatDate(property.listDate) },
    property.mlsId && { label: 'MLS #', value: property.mlsId },
  ].filter(Boolean) as { label: string; value: string }[]

  if (rows.length === 0) return null

  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
        style={{ color: 'var(--accent-sky)' }}
      >
        Listing Information
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {row.label}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text-heading)' }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ListingInfoSkeleton() {
  return (
    <div>
      <div
        className="h-3 w-32 rounded animate-pulse mb-3"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      />
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <div
              className="h-3 w-14 rounded animate-pulse"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            />
            <div
              className="h-4 w-24 rounded animate-pulse"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
