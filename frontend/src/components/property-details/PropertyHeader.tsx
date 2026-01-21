'use client'

import { Bed, Bath, Square, Calendar, Clock } from 'lucide-react'
import { PropertyData } from './types'
import { formatCurrency, formatNumber } from './utils'

interface PropertyHeaderProps {
  property: PropertyData
}

/**
 * PropertyHeader Component
 * 
 * Displays the main property information including address,
 * price, and key stats (beds, baths, sqft, year built).
 */
export function PropertyHeader({ property }: PropertyHeaderProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
            {property.address.streetAddress}, {property.address.city}, {property.address.state} {property.address.zipcode}
          </h1>
          {property.address.neighborhood && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {property.address.neighborhood} · {property.address.county}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right">
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 tabular-nums">
            {formatCurrency(property.price)}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            List Price
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bed size={18} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{property.bedrooms}</span>
          <span className="text-xs text-slate-400">beds</span>
        </div>
        <div className="flex items-center gap-2">
          <Bath size={18} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{property.bathrooms}</span>
          <span className="text-xs text-slate-400">baths</span>
        </div>
        <div className="flex items-center gap-2">
          <Square size={18} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {formatNumber(property.livingArea)}
          </span>
          <span className="text-xs text-slate-400">sqft</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {property.yearBuilt}
          </span>
          <span className="text-xs text-slate-400">built</span>
        </div>
        {property.daysOnZillow !== undefined && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 dark:bg-teal-400/10">
            <Clock size={14} className="text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-medium text-teal-700 dark:text-teal-300">
              {property.daysOnZillow} days on market
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * PropertyHeaderSkeleton
 * Loading state for the property header
 */
export function PropertyHeaderSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="h-7 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="text-left sm:text-right">
          <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-1" />
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-3 border-t border-slate-100 dark:border-slate-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}
