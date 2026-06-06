'use client'

import { PropertyOwnerInfo } from './types'

interface OwnerInfoProps {
  owner?: PropertyOwnerInfo
}

function unavailable(value: string | undefined): string {
  return value?.trim() ? value.trim() : 'Unavailable'
}

/**
 * OwnerInfo — Owner name, mailing address, and contact fields from RentCast records.
 * Phone and email are shown as "Unavailable" when the API does not provide them.
 */
export function OwnerInfo({ owner }: OwnerInfoProps) {
  if (!owner) return null

  const ownerName = owner.names?.length ? owner.names.join(', ') : undefined
  const hasDetails =
    ownerName ||
    owner.mailingAddress ||
    owner.type ||
    owner.isOwnerOccupied != null ||
    owner.isAbsenteeOwner != null

  if (!hasDetails) return null

  const rows = [
    ownerName && { label: 'Owner Name', value: ownerName },
    owner.type && { label: 'Owner Type', value: owner.type },
    owner.mailingAddress && { label: 'Mailing Address', value: owner.mailingAddress },
    { label: 'Phone', value: unavailable(owner.phone) },
    { label: 'Email', value: unavailable(owner.email) },
    owner.isOwnerOccupied != null && {
      label: 'Occupancy',
      value: owner.isOwnerOccupied ? 'Owner-occupied' : 'Absentee owner',
    },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
        style={{ color: 'var(--accent-sky)' }}
      >
        Owner Information
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {row.label}
            </span>
            <span
              className="text-sm font-semibold"
              style={{
                color:
                  row.value === 'Unavailable' ? 'var(--text-secondary)' : 'var(--text-heading)',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function OwnerInfoSkeleton() {
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
