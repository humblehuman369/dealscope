'use client'

import { PropertyData } from './types'
import { formatCurrency, formatNumber, formatPropertyType } from './utils'

interface KeyFactsGridProps {
  property: PropertyData
}

interface FactCell {
  label: string
  value: string
  highlight?: boolean
}

/**
 * KeyFactsGrid — Compact bordered-cell grid matching the address-bar detail panel.
 * 4 columns on md+, gap-px trick produces thin divider lines between cells.
 */
export function KeyFactsGrid({ property }: KeyFactsGridProps) {
  const facts: FactCell[] = [
    { label: 'Price/Sqft', value: formatCurrency(property.pricePerSqft) },
    {
      label: 'Lot Size',
      value: property.lotSize ? `${formatNumber(property.lotSize)} sqft` : 'N/A',
    },
    { label: 'Property Type', value: formatPropertyType(property.propertyType) },
    { label: 'Stories', value: property.stories?.toString() || 'N/A' },
    {
      label: 'Est. Value',
      value: formatCurrency(property.valueIqEstimate ?? property.zestimate),
      highlight: true,
    },
    {
      label: 'Est. Rent',
      value: (property.rentalIqEstimate ?? property.rentZestimate)
        ? `${formatCurrency(property.rentalIqEstimate ?? property.rentZestimate)}/mo`
        : 'N/A',
      highlight: true,
    },
    {
      label: 'HOA Fee',
      value: property.hoaFee
        ? `${formatCurrency(property.hoaFee)}/${property.hoaFrequency || 'mo'}`
        : 'None',
    },
    { label: 'Annual Tax', value: formatCurrency(property.annualTax) },
    {
      label: 'Parking',
      value: property.parkingSpaces ? `${property.parkingSpaces} Car Garage` : 'N/A',
    },
    { label: 'Heating', value: property.heating?.join(', ') || 'N/A' },
    { label: 'Cooling', value: property.cooling?.join(', ') || 'N/A' },
    { label: 'MLS #', value: property.mlsId || 'N/A' },
  ]

  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
        style={{ color: 'var(--accent-sky)' }}
      >
        Property Facts
      </div>
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px"
          style={{ background: 'var(--border-subtle)' }}
        >
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
      </div>
    </div>
  )
}

export function KeyFactsGridSkeleton() {
  return (
    <div>
      <div
        className="h-3 w-24 rounded animate-pulse mb-3"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div
              className="h-2.5 w-14 rounded animate-pulse"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            />
            <div
              className="h-4 w-20 rounded animate-pulse"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
