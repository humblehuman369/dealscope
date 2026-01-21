'use client'

import { Building2, Plus } from 'lucide-react'
import Link from 'next/link'

interface PortfolioProperty {
  id: string
  address: string
  city: string
  value: number
  equity: number
  monthlyRent: number
  cashFlow: number
  cocReturn: number
  status: 'performing' | 'watch' | 'underperforming'
}

interface PortfolioPropertiesProps {
  properties: PortfolioProperty[]
  isLoading?: boolean
  onAddClick?: () => void
}

const formatCurrency = (value: number): string => {
  if (!value && value !== 0) return '$0'
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function PortfolioProperties({ properties, isLoading, onAddClick }: PortfolioPropertiesProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-200 dark:bg-navy-700 rounded w-28"></div>
          <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-16"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-navy-700">
              <div className="w-2 h-12 rounded-full bg-gray-200 dark:bg-navy-600"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-navy-600 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-navy-600 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'performing': return 'bg-teal-500'
      case 'watch': return 'bg-amber-500'
      case 'underperforming': return 'bg-red-500'
      default: return 'bg-slate-400'
    }
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-teal-500 dark:text-teal-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">My Properties</h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-navy-700 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {properties.length}
          </span>
        </div>
        <button className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700 dark:hover:text-teal-300">
          Manage
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="py-8 text-center">
          <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">No properties in portfolio</p>
          <button 
            onClick={onAddClick}
            className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700"
          >
            Add your first property
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/worksheet/${property.id}`}
              className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-navy-700/50 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
            >
              {/* Status Indicator */}
              <div className={`w-2 h-12 rounded-full ${getStatusColor(property.status)} flex-shrink-0`} />

              {/* Property Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                  {property.address}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{property.city}</div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 lg:gap-6 text-right">
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Value</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-white tabular-nums">
                    {formatCurrency(property.value)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Cash Flow</div>
                  <div className="text-sm font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                    +{formatCurrency(property.cashFlow)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">CoC</div>
                  <div className="text-sm font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                    {property.cocReturn}%
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <button 
        onClick={onAddClick}
        className="w-full mt-4 py-3 border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-teal-500 dark:hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add Property
      </button>
    </div>
  )
}
