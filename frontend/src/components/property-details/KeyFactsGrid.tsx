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
 * Displays a grid of key property facts including price per sqft,
 * lot size, property type, Zestimate, HOA, taxes, etc.
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
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
        Property Facts
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {facts.map((fact, i) => (
          <div 
            key={i} 
            className={`p-3 rounded-lg ${
              fact.highlight 
                ? 'bg-teal-500/10 dark:bg-teal-400/10' 
                : 'bg-slate-50 dark:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <fact.icon 
                size={14} 
                className={fact.highlight ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'} 
              />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {fact.label}
              </span>
            </div>
            <div className={`text-sm font-semibold tabular-nums ${
              fact.highlight 
                ? 'text-teal-600 dark:text-teal-400' 
                : 'text-slate-800 dark:text-slate-200'
            }`}>
              {fact.value}
            </div>
            {fact.sublabel && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
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
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
