'use client'

import React, { useState } from 'react'
import { Check, Waves } from 'lucide-react'
import type { PropertyData } from '@/components/property-details/types'
import { formatCurrencySafe, formatNumberSafe } from '@/utils/formatters'

function formatPropertyType(type: string | null | undefined): string {
  if (!type) return 'N/A'
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface PropertyDetailsDropdownProps {
  property: PropertyData
}

interface FactCell {
  label: string
  value: string
  highlight?: boolean
}

function FactGrid({ facts }: { facts: FactCell[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px" style={{ background: 'var(--border-subtle)' }}>
      {facts.map((fact, i) => (
        <div
          key={i}
          className="px-3 py-2.5"
          style={{ background: 'var(--surface-base)' }}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-[0.06em] mb-1"
            style={{ color: 'var(--text-label)' }}
          >
            {fact.label}
          </div>
          <div
            className="text-sm font-semibold tabular-nums truncate"
            style={{
              color: fact.highlight ? 'var(--accent-sky)' : 'var(--text-heading)',
            }}
          >
            {fact.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PropertyDetailsDropdown({ property }: PropertyDetailsDropdownProps) {
  const [descExpanded, setDescExpanded] = useState(false)

  const facts: FactCell[] = [
    { label: 'Price/Sqft', value: formatCurrencySafe(property.pricePerSqft) },
    {
      label: 'Lot Size',
      value: property.lotSize
        ? `${formatNumberSafe(property.lotSize)} sqft`
        : 'N/A',
    },
    { label: 'Property Type', value: formatPropertyType(property.propertyType) },
    { label: 'Stories', value: property.stories?.toString() || 'N/A' },
    { label: 'Zestimate\u00AE', value: formatCurrencySafe(property.zestimate), highlight: true },
    {
      label: 'Rent Zestimate\u00AE',
      value: property.rentZestimate
        ? `${formatCurrencySafe(property.rentZestimate)}/mo`
        : 'N/A',
      highlight: true,
    },
    {
      label: 'HOA Fee',
      value: property.hoaFee
        ? `${formatCurrencySafe(property.hoaFee)}/${property.hoaFrequency || 'mo'}`
        : 'None',
    },
    { label: 'Annual Tax', value: formatCurrencySafe(property.annualTax) },
    {
      label: 'Parking',
      value: property.parkingSpaces ? `${property.parkingSpaces} Car Garage` : 'N/A',
    },
    { label: 'Heating', value: property.heating?.join(', ') || 'N/A' },
    { label: 'Cooling', value: property.cooling?.join(', ') || 'N/A' },
    { label: 'MLS #', value: property.mlsId || 'N/A' },
  ]

  const allFeatures = [
    ...(property.interiorFeatures || []),
    ...(property.exteriorFeatures || []),
    ...(property.appliances || []),
  ]
  const uniqueFeatures = [...new Set(allFeatures)]

  const hasConstruction =
    (property.construction && property.construction.length > 0) ||
    property.roof ||
    property.foundation

  const hasDescription = !!property.description

  const listingRows = [
    property.listingAgent?.name && { label: 'Listed By', value: property.listingAgent.name },
    property.listingAgent?.brokerage && { label: 'Brokerage', value: property.listingAgent.brokerage },
    property.listDate && { label: 'List Date', value: formatDate(property.listDate) },
    property.mlsId && { label: 'MLS #', value: property.mlsId },
  ].filter(Boolean) as { label: string; value: string }[]

  const descText = property.description || ''
  const isLongDesc = descText.length > 200
  const displayDesc = descExpanded || !isLongDesc ? descText : descText.slice(0, 200) + '...'

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        background: 'var(--surface-base)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Property Facts */}
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
            style={{ color: 'var(--accent-sky)' }}
          >
            Property Facts
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <FactGrid facts={facts} />
          </div>
        </div>

        {/* Description */}
        {hasDescription && (
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
              style={{ color: 'var(--accent-sky)' }}
            >
              Description
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-body)' }}
            >
              {displayDesc}
            </p>
            {isLongDesc && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="mt-1 text-xs font-semibold"
                style={{ color: 'var(--accent-sky)' }}
              >
                {descExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Features & Amenities + Construction */}
        {(uniqueFeatures.length > 0 || hasConstruction) && (
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
              style={{ color: 'var(--accent-sky)' }}
            >
              Features & Amenities
            </div>

            {uniqueFeatures.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
                {uniqueFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <Check size={13} className="flex-shrink-0" style={{ color: 'var(--status-positive)' }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-body)' }}>{feature}</span>
                  </div>
                ))}
              </div>
            )}

            {property.isWaterfront && property.waterfrontFeatures && property.waterfrontFeatures.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Waves size={14} style={{ color: 'var(--accent-sky)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--accent-sky)' }}>
                  Waterfront: {property.waterfrontFeatures.join(', ')}
                </span>
              </div>
            )}

            {hasConstruction && (
              <div
                className="flex flex-wrap gap-x-8 gap-y-1 mt-3 pt-3"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                {property.construction && property.construction.length > 0 && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: 'var(--text-label)' }}>Construction</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-body)' }}>{property.construction.join(', ')}</span>
                  </div>
                )}
                {property.roof && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: 'var(--text-label)' }}>Roof</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-body)' }}>{property.roof}</span>
                  </div>
                )}
                {property.foundation && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: 'var(--text-label)' }}>Foundation</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-body)' }}>{property.foundation}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Listing Information */}
        {listingRows.length > 0 && (
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
              style={{ color: 'var(--accent-sky)' }}
            >
              Listing Information
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-1">
              {listingRows.map((row, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function PropertyDetailsDropdownSkeleton() {
  return (
    <div
      className="w-full"
      style={{
        background: 'var(--surface-base)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
        <div className="h-3 w-24 rounded animate-pulse mb-3" style={{ backgroundColor: 'var(--surface-elevated)' }} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-14 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
              <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
