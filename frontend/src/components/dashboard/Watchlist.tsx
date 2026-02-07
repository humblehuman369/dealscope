'use client'

import { Eye, Filter, Plus, Home, Bed, Bath, Square, Clock, ChevronRight, TrendingDown, Zap, Search } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatNumber } from '@/utils/formatters'

interface WatchlistProperty {
  id: string
  address: string
  city: string
  price: number
  priceChange?: number
  daysOnMarket: number
  beds: number
  baths: number
  sqft: number
  score: number
}

interface WatchlistProps {
  properties: WatchlistProperty[]
  isLoading?: boolean
  onAddClick?: () => void
}

export function Watchlist({ properties, isLoading, onAddClick }: WatchlistProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-200 dark:bg-navy-700 rounded w-24"></div>
          <div className="h-8 bg-gray-200 dark:bg-navy-700 rounded w-16"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-navy-700">
              <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-navy-700"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-navy-700 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-teal-500 dark:text-teal-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Watchlist</h3>
          <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
            {properties.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
            <Filter size={14} className="text-slate-400 dark:text-slate-500" />
          </button>
          <button 
            onClick={onAddClick}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
          >
            <Plus size={14} className="text-slate-400 dark:text-slate-500" />
          </button>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="py-6 px-4 text-center bg-gradient-to-b from-teal-500/5 to-transparent rounded-xl">
          <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-3">
            <Eye className="w-6 h-6 text-teal-500" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Track Properties You Love</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-[200px] mx-auto">
            Save properties to compare deals and get price drop alerts
          </p>
          <Link 
            href="/property"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold transition-colors"
          >
            <Plus size={14} />
            Find Properties
          </Link>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-navy-700">
            <p className="text-[10px] text-slate-400">
              Cash flow estimates shown after full analysis
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/property?address=${encodeURIComponent(property.address + ', ' + property.city)}`}
              className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-navy-700 hover:border-slate-200 dark:hover:border-navy-600 hover:shadow-sm transition-all cursor-pointer"
            >
              {/* Property Image Placeholder */}
              <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0">
                <Home size={20} className="text-slate-400 dark:text-slate-500" />
              </div>

              {/* Property Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {property.address}
                  </span>
                  {property.priceChange && property.priceChange < 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-[10px] font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-0.5 flex-shrink-0">
                      <TrendingDown size={10} />
                      Price Drop
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">{property.city}</div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1"><Bed size={10} />{property.beds}</span>
                  <span className="flex items-center gap-1"><Bath size={10} />{property.baths}</span>
                  <span className="flex items-center gap-1 tabular-nums"><Square size={10} />{formatNumber(property.sqft)}</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{property.daysOnMarket}d</span>
                </div>
              </div>

              {/* Score & Price */}
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">
                  {formatCurrency(property.price)}
                </div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <Zap size={12} className="text-teal-500 dark:text-teal-400" />
                  <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">IQ {property.score}</span>
                </div>
              </div>

              <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {properties.length > 0 && (
        <button className="w-full mt-4 py-3 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors">
          View all watchlist properties
        </button>
      )}
    </div>
  )
}
