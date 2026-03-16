'use client'

import { 
  DollarSign, Grid3X3, Home, Layers, TrendingUp, Building, 
  Shield, Receipt, Car, Flame, Wind, Tag,
  LucideIcon
} from 'lucide-react'
import { PropertyData } from './types'
import { formatCurrency, formatNumber, formatPropertyType } from './utils'

interface KeyFactsGridProps {
  property: PropertyData
}

interface FactItem {
  label: string
  value: string
  sublabel?: string
  icon: LucideIcon
  highlight?: boolean
}

/**
 * KeyFactsGrid Component
 * 
 * Grid of key property facts. Highlighted items (Zestimate, Rent Zestimate)
 * use sky blue accent; all financial values use tabular-nums for column alignment.
 */
export function KeyFactsGrid({ property }: KeyFactsGridProps) {
  const facts: FactItem[] = [
    { 
      label: 'Price/Sqft', 
      value: formatCurrency(property.pricePerSqft), 
      icon: DollarSign 
    },
    { 
      label: 'Lot Size', 
      value: property.lotSize ? `${formatNumber(property.lotSize)} sqft` : 'N/A', 
      sublabel: property.lotSizeAcres ? `${property.lotSizeAcres} acres` : undefined, 
      icon: Grid3X3 
    },
    { 
      label: 'Property Type', 
      value: formatPropertyType(property.propertyType), 
      icon: Home 
    },
    { 
      label: 'Stories', 
      value: property.stories?.toString() || 'N/A', 
      icon: Layers 
    },
    { 
      label: 'Zestimate®', 
      value: formatCurrency(property.zestimate), 
      icon: TrendingUp, 
      highlight: true 
    },
    { 
      label: 'Rent Zestimate®', 
      value: property.rentZestimate ? `${formatCurrency(property.rentZestimate)}/mo` : 'N/A', 
      icon: Building, 
      highlight: true 
    },
    { 
      label: 'HOA Fee', 
      value: property.hoaFee 
        ? `${formatCurrency(property.hoaFee)}/${property.hoaFrequency || 'mo'}` 
        : 'None', 
      icon: Shield 
    },
    { 
      label: 'Annual Tax', 
      value: formatCurrency(property.annualTax), 
      sublabel: property.taxYear ? `(${property.taxYear})` : undefined, 
      icon: Receipt 
    },
    { 
      label: 'Parking', 
      value: property.parkingSpaces ? `${property.parkingSpaces} Car Garage` : 'N/A', 
      icon: Car 
    },
    { 
      label: 'Heating', 
      value: property.heating?.join(', ') || 'N/A', 
      icon: Flame 
    },
    { 
      label: 'Cooling', 
      value: property.cooling?.join(', ') || 'N/A', 
      icon: Wind 
    },
    { 
      label: 'MLS #', 
      value: property.mlsId || 'N/A', 
      icon: Tag 
    },
  ]

  return (
    <div
      className="rounded-[14px] p-6"
      style={{
        backgroundColor: 'var(--surface-base)',
        border: `1px solid var(--border-subtle)`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-[0.12em] mb-5"
        style={{ color: 'var(--accent-sky)' }}
      >
        Property Facts
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {facts.map((fact, i) => (
          <div 
            key={i} 
            className="p-4 rounded-xl"
            style={{
              backgroundColor: fact.highlight ? 'var(--color-sky-dim)' : 'var(--surface-elevated)',
              border: fact.highlight ? `1px solid var(--border-focus)` : `1px solid var(--border-subtle)`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <fact.icon 
                size={16} 
                style={{ color: fact.highlight ? 'var(--accent-sky)' : 'var(--text-secondary)' }}
              />
              <span
                className="text-[11px] font-bold uppercase tracking-[0.04em]"
                style={{ color: 'var(--text-label)' }}
              >
                {fact.label}
              </span>
            </div>
            <div
              className="text-lg font-bold tabular-nums"
              style={{
                color: fact.highlight ? 'var(--accent-sky)' : 'var(--text-heading)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fact.value}
            </div>
            {fact.sublabel && (
              <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {fact.sublabel}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * KeyFactsGridSkeleton
 * Loading state for the key facts grid
 */
export function KeyFactsGridSkeleton() {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: 'var(--surface-base)', border: `1px solid var(--border-subtle)` }}
    >
      <div className="h-3 w-24 rounded animate-pulse mb-4" style={{ backgroundColor: 'var(--surface-elevated)' }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <div className="h-3 w-16 rounded animate-pulse mb-2" style={{ backgroundColor: 'var(--surface-card-hover)' }} />
            <div className="h-5 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-card-hover)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
